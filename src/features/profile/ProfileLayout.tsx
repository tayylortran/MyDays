import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
};

// Both personal and friend profiles use the same geometry and visual defaults.
export function ProfileLayout({ toolbar, username, photoUri, year, month, totalPhotos,
  viewMode, onChangeView, onPrev, onNext, children, bottomInset = 0 }: Props) {
  return (
    <View style={[styles.screen, { paddingBottom: bottomInset }]}>
      <View style={styles.toolbar}>{toolbar}</View>
      <View style={styles.identity}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <Text accessibilityRole="header" style={styles.username}>{username}</Text>
      </View>
      <MonthHeader year={year} month={month} onPrev={onPrev} onNext={onNext}
        subtitle={totalPhotos === null ? undefined : `${totalPhotos} ${totalPhotos === 1 ? 'photo' : 'photos'} total`} />
      <ProfileViewSwitcher viewMode={viewMode} onChange={onChangeView} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 54, paddingHorizontal: 8 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12, minHeight: 22 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#ddd' },
  username: { fontSize: 20, fontWeight: '600', flexShrink: 1 },
});
