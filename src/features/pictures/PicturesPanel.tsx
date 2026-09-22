import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import PicturesScreen from './PicturesScreen';

const spring = { damping: 28, stiffness: 260, overshootClamping: true };
type PanelContext = {
  progress: SharedValue<number>;
  calendarAtBottom: SharedValue<boolean>;
  height: number;
  present: () => void;
  finishClose: () => void;
  open: () => void;
};
const PicturesPanelContext = createContext<PanelContext | null>(null);

export function PicturesPanelProvider({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const calendarAtBottom = useSharedValue(true);
  const photoScrollY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startProgress = useSharedValue(0);
  const [visible, setVisible] = useState(false);
  const present = useCallback(() => {
    photoScrollY.set(0);
    setVisible(true);
  }, [photoScrollY]);
  const finishClose = useCallback(() => setVisible(false), []);
  const open = useCallback(() => {
    present();
    progress.set(withSpring(1, spring));
  }, [progress, present]);
  const close = useCallback(() => {
    progress.set(withSpring(0, spring, (finished) => {
      if (finished) scheduleOnRN(finishClose);
    }));
  }, [progress, finishClose]);

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
      if (photoScrollY.get() > 1 || event.allTouches.length !== 1) { manager.fail(); return; }
      startX.set(event.allTouches[0].absoluteX);
      startY.set(event.allTouches[0].absoluteY);
    })
    .onTouchesMove((event, manager) => {
      if (event.state === State.ACTIVE) return;
      if (event.allTouches.length !== 1) { manager.fail(); return; }
      const dx = event.allTouches[0].absoluteX - startX.get();
      const dy = event.allTouches[0].absoluteY - startY.get();
      if (Math.abs(dx) > 12 || dy < -12) manager.fail();
      else if (dy > 12) manager.activate();
    })
    .onTouchesUp((event, manager) => {
      if (event.state === State.BEGAN) manager.fail();
    })
    .onStart(() => { startProgress.set(progress.get()); })
    .onUpdate((event) => { progress.set(Math.max(0, Math.min(1, startProgress.get() - event.translationY / height))); })
    .onEnd((event) => {
      const dismiss = event.velocityY > 700 || progress.get() < 0.75;
      progress.set(withSpring(dismiss ? 0 : 1, spring, (finished) => {
        if (finished && dismiss) scheduleOnRN(finishClose);
      }));
    })
    .onFinalize((event, success) => {
      if (!success && event.oldState === State.ACTIVE) progress.set(withSpring(1, spring));
    }), [height, photoScrollY, startX, startY, startProgress, progress, finishClose]);

  const handleGesture = useMemo(() => Gesture.Pan().activeOffsetY(12).failOffsetX([-20, 20])
    .onStart(() => { startProgress.set(progress.get()); })
    .onUpdate((event) => { progress.set(Math.max(0, Math.min(1, startProgress.get() - event.translationY / height))); })
    .onEnd((event) => {
      const dismiss = event.velocityY > 700 || progress.get() < 0.75;
      progress.set(withSpring(dismiss ? 0 : 1, spring, (finished) => {
        if (finished && dismiss) scheduleOnRN(finishClose);
      }));
    })
    .onFinalize((event, success) => {
      if (!success && event.oldState === State.ACTIVE) progress.set(withSpring(1, spring));
    }), [height, startProgress, progress, finishClose]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.get()) * height }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() * 0.25 }));
  const value = useMemo(() => ({ progress, calendarAtBottom, height, present, finishClose, open }),
    [progress, calendarAtBottom, height, present, finishClose, open]);

  return (
    <PicturesPanelContext.Provider value={value}>
      <View style={styles.root}>
        <View style={styles.root} accessibilityElementsHidden={visible}
          importantForAccessibility={visible ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Animated.View pointerEvents={visible ? 'auto' : 'none'} accessibilityViewIsModal={visible}
          accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
          style={[StyleSheet.absoluteFill, styles.panel, panelStyle]}>
          {visible && (
            <>
              <GestureDetector gesture={handleGesture}>
                <View style={{ paddingTop: insets.top, backgroundColor: '#fff' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Close pictures" onPress={close} style={styles.handle}>
                    <View style={styles.bar} />
                    <Text style={styles.hint}>⌄ Back to calendar</Text>
                  </Pressable>
                </View>
              </GestureDetector>
              <PicturesScreen closeGesture={closeGesture} scrollY={photoScrollY} />
            </>
          )}
        </Animated.View>
      </View>
    </PicturesPanelContext.Provider>
  );
}

export function useCalendarPicturesGesture(enabled: boolean) {
  const context = useContext(PicturesPanelContext);
  if (!context) throw new Error('Calendar must be inside PicturesPanelProvider');
  const { progress, calendarAtBottom, height, present, finishClose, open } = context;
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const makeGesture = useCallback((fromHandle: boolean) => Gesture.Pan().enabled(enabled)
    .manualActivation(true)
    .onTouchesDown((event, manager) => {
      if ((!fromHandle && !calendarAtBottom.get()) || event.allTouches.length !== 1) { manager.fail(); return; }
      startX.set(event.allTouches[0].absoluteX);
      startY.set(event.allTouches[0].absoluteY);
    })
    .onTouchesMove((event, manager) => {
      if (event.state === State.ACTIVE) return;
      if (event.allTouches.length !== 1) { manager.fail(); return; }
      const dx = event.allTouches[0].absoluteX - startX.get();
      const dy = event.allTouches[0].absoluteY - startY.get();
      if (Math.abs(dx) > 12 || dy > 12) manager.fail();
      else if (dy < -12) manager.activate();
    })
    .onTouchesUp((event, manager) => {
      if (event.state === State.BEGAN) manager.fail();
    })
    .onStart(() => { scheduleOnRN(present); })
    .onUpdate((event) => { progress.set(Math.max(0, Math.min(1, -event.translationY / height))); })
    .onEnd((event) => {
      const show = event.velocityY < -700 || progress.get() > 0.25;
      progress.set(withSpring(show ? 1 : 0, spring, (finished) => {
        if (finished && !show) scheduleOnRN(finishClose);
      }));
    })
    .onFinalize((event, success) => {
      if (!success && event.oldState === State.ACTIVE) {
        progress.set(withSpring(0, spring, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }));
      }
    }), [enabled, calendarAtBottom, startX, startY, present, progress, height, finishClose]);
  const gesture = useMemo(() => makeGesture(false), [makeGesture]);
  const handleGesture = useMemo(() => makeGesture(true), [makeGesture]);
  return { gesture, handleGesture, calendarAtBottom, open: enabled ? open : undefined };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { backgroundColor: '#000' },
  panel: { backgroundColor: '#fff' },
  handle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#c8c2b9' },
  hint: { fontSize: 12, color: '#756f66' },
});
