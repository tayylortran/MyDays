import type { Circle, Hangout } from '@/src/data/types';
import { hangoutDate, hangoutSerif } from '@/src/features/hangouts/hangoutStyles';
import type { ThemeColors } from '@/src/theme/palette';
import { Text } from '@/src/theme/primitives';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

  return (
    <View style={[styles.screen, {
      paddingTop: insets.top + 12,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    }]} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to calendar" onPress={onClose}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Calendar</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.date}>{hangoutDate(date, true)}</Text>
        <Text style={styles.count}>{hangouts.length} {hangouts.length === 1 ? 'hangout' : 'hangouts'}</Text>
        <View style={styles.list}>
          {hangouts.map((hangout) => {
            const circle = circles.find((item) => item.id === hangout.circleId);
            return (
              <Pressable key={hangout.id} accessibilityRole="button"
                accessibilityLabel={`${hangout.title}, ${circle?.name ?? 'Circle'}`}
                accessibilityHint="Opens hangout details" onPress={() => onPressHangout(hangout)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={[styles.dot, { backgroundColor: circle?.color ?? colors.muted }]} />
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
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable accessibilityRole="button" onPress={onAdd}
          style={({ pressed }) => [styles.add, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="add" size={22} color={colors.onAction} />
          <Text style={styles.addText}>Add hangout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  toolbar: { paddingHorizontal: 16, paddingBottom: 12 },
  back: { minWidth: 44, minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12 },
  backText: { fontSize: 17 },
  content: { paddingHorizontal: 24, paddingBottom: 24 },
  date: { fontFamily: hangoutSerif, fontSize: 30, color: colors.text },
  count: { fontSize: 15, color: colors.muted, marginTop: 10 },
  list: { gap: 12, marginTop: 24 },
  row: { minWidth: 44, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  circle: { fontSize: 15, color: colors.secondary, marginTop: 6 },
  empty: { fontSize: 17, color: colors.secondary },
  pressed: { backgroundColor: colors.pressed },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  add: { minWidth: 44, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 18, backgroundColor: colors.action },
  addText: { flexShrink: 1, fontSize: 17, fontWeight: '600', color: colors.onAction },
});
