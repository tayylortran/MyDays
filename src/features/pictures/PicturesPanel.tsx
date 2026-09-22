import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import PicturesScreen from './PicturesScreen';

const spring = { damping: 28, stiffness: 260, overshootClamping: true };
type PanelContext = {
  progress: SharedValue<number>;
  locked: SharedValue<boolean>;
  height: number;
  present: () => void;
  settle: (target: 0 | 1, velocity?: number) => void;
  open: () => void;
};
const PicturesPanelContext = createContext<PanelContext | null>(null);

export function PicturesPanelProvider({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  // Keep one owner from drag activation through the end of its snap animation.
  const locked = useSharedValue(false);
  const photoScrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startProgress = useSharedValue(0);
  const gridDragging = useSharedValue(false);
  const headerDragging = useSharedValue(false);
  const [visible, setVisible] = useState(false);
  // Mount the preview during an opening drag, but don't let it steal that touch.
  const [interactive, setInteractive] = useState(false);
  const present = useCallback(() => {
    photoScrollY.set(0);
    setInteractive(false);
    setVisible(true);
  }, [photoScrollY]);
  const finishTransition = useCallback((target: 0 | 1) => {
    setVisible(target === 1);
    setInteractive(target === 1);
  }, []);
  const settle = useCallback((target: 0 | 1, velocity = 0) => {
    'worklet';
    locked.set(true);
    progress.set(withSpring(target, { ...spring, velocity: Number.isFinite(velocity) ? velocity : 0 }, (finished) => {
      if (finished) {
        locked.set(false);
        scheduleOnRN(finishTransition, target);
      }
    }));
  }, [locked, progress, finishTransition]);
  const open = useCallback(() => {
    if (locked.get() || progress.get() !== 0) return;
    present();
    settle(1);
  }, [locked, progress, settle, present]);
  const close = useCallback(() => {
    if (locked.get() || progress.get() !== 1) return;
    settle(0);
  }, [locked, progress, settle]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [visible, close]);

  const closeGesture = useMemo(() => Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      if (locked.get() || photoScrollY.get() > 1 || event.allTouches.length !== 1) { manager.fail(); return; }
      startX.set(event.allTouches[0].absoluteX);
      startY.set(event.allTouches[0].absoluteY);
    })
    .onTouchesMove((event, manager) => {
      if (event.state === State.ACTIVE) return;
      if (event.allTouches.length !== 1) { manager.fail(); return; }
      const dx = event.allTouches[0].absoluteX - startX.get();
      const dy = event.allTouches[0].absoluteY - startY.get();
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (dy > Math.abs(dx)) manager.activate();
      else manager.fail();
    })
    .onTouchesUp((event, manager) => {
      if (event.state === State.BEGAN) manager.fail();
    })
    .onStart(() => {
      if (locked.get() || progress.get() !== 1) return;
      locked.set(true);
      gridDragging.set(true);
      startProgress.set(progress.get());
    })
    .onUpdate((event) => {
      if (gridDragging.get()) progress.set(Math.max(0, Math.min(1, startProgress.get() - event.translationY / height)));
    })
    .onFinalize((event, success) => {
      // Finalize is the single settlement path, including cancellation/failure.
      if (!gridDragging.get()) return;
      gridDragging.set(false);
      const dismiss = success && progress.get() - event.velocityY / height * 0.18 < 0.8;
      settle(dismiss ? 0 : 1, success ? -event.velocityY / height : 0);
    }), [height, photoScrollY, startX, startY, startProgress, progress, locked, gridDragging, settle]);

  const handleGesture = useMemo(() => Gesture.Pan().activeOffsetY(10).failOffsetX([-24, 24])
    .onStart(() => {
      if (locked.get() || progress.get() !== 1) return;
      locked.set(true);
      headerDragging.set(true);
      startProgress.set(progress.get());
    })
    .onUpdate((event) => {
      if (headerDragging.get()) progress.set(Math.max(0, Math.min(1, startProgress.get() - event.translationY / height)));
    })
    .onFinalize((event, success) => {
      if (!headerDragging.get()) return;
      headerDragging.set(false);
      const dismiss = success && progress.get() - event.velocityY / height * 0.18 < 0.8;
      settle(dismiss ? 0 : 1, success ? -event.velocityY / height : 0);
    }), [height, startProgress, progress, locked, headerDragging, settle]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() * 0.25 }));
  const value = useMemo(() => ({ progress, locked, height, present, settle, open }),
    [progress, locked, height, present, settle, open]);

  return (
    <PicturesPanelContext.Provider value={value}>
      <View style={styles.root}>
        <View style={styles.root} accessibilityElementsHidden={interactive}
          importantForAccessibility={interactive ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Animated.View pointerEvents={interactive ? 'auto' : 'none'} accessibilityViewIsModal={interactive}
          accessibilityElementsHidden={!interactive} importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
          style={[StyleSheet.absoluteFill, styles.panel, panelStyle]}>
          {visible && (
              <PicturesScreen closeGesture={closeGesture} headerGesture={handleGesture} scrollY={photoScrollY} header={
                <View style={{ paddingTop: insets.top, backgroundColor: '#fff' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close pictures" onPress={close} style={styles.handle}>
                    <View style={styles.bar} />
                    <Text style={styles.hint}>⌄ Back to calendar</Text>
                  </Pressable>
                </View>
              } />
          )}
        </Animated.View>
      </View>
    </PicturesPanelContext.Provider>
  );
}

export function useCalendarPicturesGesture(enabled: boolean) {
  const context = useContext(PicturesPanelContext);
  if (!context) throw new Error('Calendar must be inside PicturesPanelProvider');
  const { progress, locked, height, present, settle, open } = context;
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const calendarDragging = useSharedValue(false);
  const handleDragging = useSharedValue(false);
  const makeGesture = useCallback((dragging: SharedValue<boolean>) => Gesture.Pan().enabled(enabled)
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      if (locked.get() || event.allTouches.length !== 1) { manager.fail(); return; }
      startX.set(event.allTouches[0].absoluteX);
      startY.set(event.allTouches[0].absoluteY);
    })
    .onTouchesMove((event, manager) => {
      if (event.state === State.ACTIVE) return;
      if (event.allTouches.length !== 1) { manager.fail(); return; }
      const dx = event.allTouches[0].absoluteX - startX.get();
      const dy = event.allTouches[0].absoluteY - startY.get();
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      if (-dy > Math.abs(dx)) manager.activate();
      else manager.fail();
    })
    .onTouchesUp((event, manager) => {
      if (event.state === State.BEGAN) manager.fail();
    })
    .onStart(() => {
      if (locked.get() || progress.get() !== 0) return;
      locked.set(true);
      dragging.set(true);
      scheduleOnRN(present);
    })
    .onUpdate((event) => {
      if (dragging.get()) progress.set(Math.max(0, Math.min(1, -event.translationY / height)));
    })
    .onFinalize((event, success) => {
      if (!dragging.get()) return;
      dragging.set(false);
      const show = success && progress.get() - event.velocityY / height * 0.18 > 0.2;
      settle(show ? 1 : 0, success ? -event.velocityY / height : 0);
    }), [enabled, startX, startY, present, progress, locked, height, settle]);
  const gesture = useMemo(() => makeGesture(calendarDragging), [makeGesture, calendarDragging]);
  const handleGesture = useMemo(() => makeGesture(handleDragging), [makeGesture, handleDragging]);
  return { gesture, handleGesture, open: enabled ? open : undefined };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: '#000' },
  panel: { backgroundColor: '#fff' },
  handle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#c8c2b9' },
  hint: { fontSize: 12, color: '#756f66' },
});
