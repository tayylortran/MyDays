import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { MONTHS } from '@/src/lib/dates';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

type MonthHeaderProps = {
  month: number;
  year: number;
  subtitle?: string;
  onPrev: () => void;
  onNext: () => void;
};

export function MonthHeader({ month, year, subtitle, onPrev, onNext }: MonthHeaderProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text style={styles.month} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {MONTHS[month]}
        </Text>
        <Text style={styles.subtitle}>
          {year}{subtitle ? ` · ${subtitle}` : ''}
        </Text>
      </View>
      <View style={styles.navigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={onPrev}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={onNext}
          style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 20,
    gap: 8,
  },
  heading: { flex: 1 },
  month: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 40,
    fontWeight: '400',
    letterSpacing: -1,
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  navigation: { flexDirection: 'row', gap: 4 },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceAlt },
});
