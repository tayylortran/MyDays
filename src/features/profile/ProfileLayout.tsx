import type { ThemeColors } from '@/src/theme/palette';
import { useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import type { ReactNode } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ProfileViewSwitcher } from './ProfileViewSwitcher';

type Props = {
  toolbar: ReactNode;
  username: string;
  photoUri: string | null;
  year: number;
  month: number;
  totalPhotos: number | null;
  viewMode: 'calendar' | 'grid';
  onChangeView: (mode: 'calendar' | 'grid') => void;
  onPrev: () => void;
  onNext: () => void;
  children: ReactNode;
  bottomInset?: number;
  onPressIdentity?: () => void;
};

// Both personal and friend profiles use the same geometry and visual defaults.
export function ProfileLayout({ toolbar, username, photoUri, year, month, totalPhotos,
  viewMode, onChangeView, onPrev, onNext, children, bottomInset = 0, onPressIdentity }: Props) {
  const styles = useThemedStyles(createStyles);
  const identity = (
    <>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.avatar} /> : <View style={styles.avatar} />}
      <View style={styles.identityText}>
        <Text accessibilityRole="header" style={styles.username}>{username}</Text>
        {totalPhotos !== null && (
          <Text style={styles.photoCount}>
            {totalPhotos} {totalPhotos === 1 ? 'photo' : 'photos'}
          </Text>
        )}
      </View>
    </>
  );
  return (
    <View style={[styles.screen, { paddingBottom: bottomInset }]}>
      <View style={styles.toolbar}>{toolbar}</View>
      {onPressIdentity ? (
        <Pressable style={styles.identity} onPress={onPressIdentity}
          accessibilityRole="button" accessibilityLabel="Open profile settings">
          {identity}
        </Pressable>
      ) : <View style={styles.identity}>{identity}</View>}
      <MonthHeader year={year} month={month} onPrev={onPrev} onNext={onNext} />
      <ProfileViewSwitcher viewMode={viewMode} onChange={onChangeView} />
      {children}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingTop: 54, paddingHorizontal: 8 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12, minHeight: 22 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.surfaceAlt },
  identityText: { flexShrink: 1 },
  photoCount: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  username: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 26,
    fontWeight: '400',
    letterSpacing: -0.5,
    color: colors.text,
    flexShrink: 1,
  },
});
