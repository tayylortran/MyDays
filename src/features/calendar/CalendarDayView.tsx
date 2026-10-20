import type { Circle, Hangout } from '@/src/data/types';
import { circleTint, hangoutDate, hangoutSerif } from '@/src/features/hangouts/hangoutStyles';
import type { ThemeColors } from '@/src/theme/palette';
import { Text } from '@/src/theme/primitives';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type PanResponderCallbacks } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type CalendarDayProps = {
  date: string;
  hangouts: Hangout[];
  onClose: () => void;
  onAdd: () => void;
};

export function CalendarDayView({ date, hangouts, circles, onClose, onAdd, onPressHangout }: CalendarDayProps & {
  circles: Circle[];
  onPressHangout: (hangout: Hangout) => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [headerHeight, setHeaderHeight] = useState(112);
  const [listHeight, setListHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(100);
  const [translateY] = useState(() => new Animated.Value(0));
  const scrollY = useRef(0);
  const dismissing = useRef(false);
  const maxHeight = Math.max(0, windowHeight - insets.top - 24);
  const minimumHeight = Math.min(maxHeight, Math.max(360, windowHeight * 0.45));
  const sheetHeight = Math.min(maxHeight, Math.max(minimumHeight, headerHeight + listHeight + footerHeight));

  useEffect(() => () => translateY.stopAnimation(), [translateY]);

  function dismiss() {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.timing(translateY, { toValue: windowHeight, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }

  function resetDrag() {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, overshootClamping: true }).start();
  }

  // Let the list scroll normally; a downward drag at its top dismisses the sheet.
  const panConfig: PanResponderCallbacks = {
    onMoveShouldSetPanResponderCapture: (_event, gesture) => !dismissing.current && scrollY.current <= 0
      && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > Math.min(100, sheetHeight * 0.2) || (gesture.dy > 20 && gesture.vy > 0.8)) dismiss();
      else resetDrag();
    },
    onPanResponderTerminate: resetDrag,
  };
  // PanResponder only registers these callbacks here; refs are read when a touch moves.
  // eslint-disable-next-line react-hooks/refs
  const pan = PanResponder.create(panConfig);
  // eslint-disable-next-line react-hooks/refs
  const headerPan = PanResponder.create({
    ...panConfig,
    onMoveShouldSetPanResponderCapture: (_event, gesture) => !dismissing.current
      && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx),
  });

  return (
    <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={dismiss}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Dismiss day hangouts"
        onPress={dismiss} />
      <Animated.View {...pan.panHandlers} style={[styles.sheet, {
        height: sheetHeight, paddingLeft: insets.left, paddingRight: insets.right,
        transform: [{ translateY }],
      }]}>
      <View {...headerPan.panHandlers} onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
        <View style={styles.handleArea} accessible={false}><View style={styles.handle} /></View>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.date}>{hangoutDate(date)}</Text>
            <Text style={styles.count}>{hangouts.length} {hangouts.length === 1 ? 'hangout' : 'hangouts'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close day hangouts" onPress={dismiss}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} bounces={false}
        onContentSizeChange={(_width, height) => setListHeight(height)}
        onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
        <View style={styles.list}>
          {hangouts.map((hangout) => {
            const circle = circles.find((item) => item.id === hangout.circleId);
            return (
              <Pressable key={hangout.id} accessibilityRole="button"
                accessibilityLabel={`${hangout.title}, ${circle?.name ?? 'Circle'}`}
                accessibilityHint="Opens hangout details" onPress={() => onPressHangout(hangout)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={[styles.tile, { backgroundColor: circleTint(circle?.color ?? colors.muted, colors.pressed) }]}>
                  <View style={[styles.dot, { backgroundColor: circle?.color ?? colors.muted }]} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.title}>{hangout.title}</Text>
                  <Text style={styles.circle}>{circle?.name ?? 'Circle'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            );
          })}
          {hangouts.length === 0 && <Text style={styles.empty}>No hangouts for this day yet.</Text>}
        </View>
      </ScrollView>
      <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable accessibilityRole="button" onPress={onAdd}
          style={({ pressed }) => [styles.add, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addText}>Add hangout</Text>
        </Pressable>
      </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  handleArea: { height: 24, justifyContent: 'center', alignItems: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20 },
  heading: { flex: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.surfaceAlt },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  date: { fontFamily: hangoutSerif, fontSize: 30, color: colors.text },
  count: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: colors.secondary, marginTop: 8 },
  list: { gap: 10 },
  row: { minWidth: 44, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1 },
  tile: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  circle: { fontSize: 15, color: colors.secondary, marginTop: 6 },
  empty: { fontSize: 17, color: colors.secondary },
  pressed: { backgroundColor: colors.pressed },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  add: { minWidth: 44, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 18, backgroundColor: '#2864d7' },
  addText: { flexShrink: 1, fontSize: 17, fontWeight: '600', color: '#fff' },
});
