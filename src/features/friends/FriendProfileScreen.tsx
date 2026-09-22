import type { FriendProfile } from '@/src/data/friendTypes';
import { useRepo } from '@/src/data/RepositoryProvider';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { ProfilePhotoGrid } from '@/src/features/profile/ProfilePhotoGrid';
import { ProfileLayout } from '@/src/features/profile/ProfileLayout';
import { ProfilePhotoPreview } from '@/src/features/profile/ProfilePhotoPreview';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Result = { key: string; profile: FriendProfile | null; error: string };

export function FriendProfileScreen({ userId }: { userId: string }) {
  const repo = useRepo();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [result, setResult] = useState<Result | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const request = useRef(0);
  const monthKey = `${String(month.year).padStart(4, '0')}-${String(month.month + 1).padStart(2, '0')}`;
  const key = `${userId}:${monthKey}`;
  const profile = result?.key === key ? result.profile : null;
  const error = result?.key === key ? result.error : '';

  const load = useCallback(async () => {
    const version = ++request.current;
    setResult(null);
    setPreviewDate(null);
    try {
      const next = await repo.getFriendProfile(userId, monthKey);
      if (version === request.current) setResult({ key, profile: next, error: '' });
    } catch (error) {
      if (version === request.current) setResult({ key, profile: null, error: error instanceof Error ? error.message : 'Could not load this profile. Please try again.' });
    }
  }, [repo, userId, monthKey, key]);

  useFocusEffect(useCallback(() => {
    void load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
      else { request.current++; setResult(null); }
    });
    return () => { request.current++; subscription.remove(); };
  }, [load]));

  const moveMonth = (delta: number) => setMonth((current) => {
    const next = current.month + delta;
    const year = current.year + (next < 0 ? -1 : next > 11 ? 1 : 0);
    return year < 1 || year > 9999 ? current : { year, month: (next + 12) % 12 };
  });

  return (
    <ProfileLayout username={profile?.username ?? ''} photoUri={profile?.avatarUri ?? null}
      year={month.year} month={month.month} totalPhotos={profile?.totalPhotos ?? null}
      viewMode={viewMode} onChangeView={setViewMode} onPrev={() => moveMonth(-1)} onNext={() => moveMonth(1)}
      bottomInset={insets.bottom} toolbar={<View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to friends" hitSlop={12} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/friends')}>
          <Ionicons name="chevron-back" size={22} color="#333" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh friend profile" hitSlop={12} onPress={() => { void load(); }}>
          <Ionicons name="refresh-outline" size={22} color="#333" />
        </Pressable>
      </View>}>
      {error ? <View style={styles.message}>
        <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void load(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View> : !profile ? <ActivityIndicator color="#716d66" style={styles.message} /> : <>
        {viewMode === 'calendar' ? <ProfileCalendarGrid year={month.year} month={month.month}
          onViewPhoto={setPreviewDate}
          faces={Object.fromEntries(profile.covers.map((cover) => [cover.date, cover]))} />
          : <View style={{ flex: 1, marginHorizontal: -8 }}><ProfilePhotoGrid key={key} photos={profile.covers} /></View>}
        <ProfilePhotoPreview photo={profile.covers.find((cover) => cover.date === previewDate) ?? null} onClose={() => setPreviewDate(null)} />
      </>}
    </ProfileLayout>
  );
}

const styles = StyleSheet.create({
  toolbar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  message: { padding: 24, alignItems: 'center', gap: 16 },
  error: { color: '#a34736', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  retry: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: '#efede8' },
  retryText: { color: '#716d66', fontWeight: '600' },
});
