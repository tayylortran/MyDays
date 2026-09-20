import { getFriendProfile, type FriendProfile } from '@/src/data/supabase/friendProfiles';
import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { ProfilePhotoGrid } from '@/src/features/profile/ProfilePhotoGrid';
import { ProfileViewSwitcher } from '@/src/features/profile/ProfileViewSwitcher';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Result = { key: string; profile: FriendProfile | null; error: string };

export function FriendProfileScreen({ userId }: { userId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [result, setResult] = useState<Result | null>(null);
  const request = useRef(0);
  const monthKey = `${String(month.year).padStart(4, '0')}-${String(month.month + 1).padStart(2, '0')}`;
  const key = `${userId}:${monthKey}`;
  const profile = result?.key === key ? result.profile : null;
  const error = result?.key === key ? result.error : '';

  const load = useCallback(async () => {
    const version = ++request.current;
    setResult(null);
    try {
      const next = await getFriendProfile(userId, monthKey);
      if (version === request.current) setResult({ key, profile: next, error: '' });
    } catch (error) {
      if (version === request.current) setResult({ key, profile: null, error: error instanceof Error ? error.message : 'Could not load this profile. Please try again.' });
    }
  }, [userId, monthKey, key]);

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
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to friends" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/friends')} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={23} color="#333" />
        </Pressable>
        <Text style={styles.toolbarTitle}>Friend profile</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh friend profile" onPress={() => { void load(); }} style={styles.iconButton}>
          <Ionicons name="refresh-outline" size={21} color="#333" />
        </Pressable>
      </View>
      {profile ? <>
        <View style={styles.identity}>
          {profile.avatarUri ? <Image source={{ uri: profile.avatarUri }} style={styles.avatar} />
            : <View style={[styles.avatar, styles.initialAvatar]}><Text style={styles.initial}>{profile.username.slice(0, 1).toUpperCase()}</Text></View>}
          <Text accessibilityRole="header" style={styles.username}>{profile.username}</Text>
        </View>
      </> : null}
      <MonthHeader year={month.year} month={month.month} onPrev={() => moveMonth(-1)} onNext={() => moveMonth(1)}
        subtitle={profile ? `${profile.totalPhotos} ${profile.totalPhotos === 1 ? 'photo' : 'photos'} total` : undefined} />
      <ProfileViewSwitcher viewMode={viewMode} onChange={setViewMode} />
      {error ? <View style={styles.message}>
        <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => { void load(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View> : !profile ? <ActivityIndicator color="#716d66" style={styles.message} /> : <>
        {profile.covers.length === 0 && <Text style={styles.empty}>No shared photos this month.</Text>}
        {viewMode === 'calendar' ? <ProfileCalendarGrid year={month.year} month={month.month}
          faces={Object.fromEntries(profile.covers.map((cover) => [cover.date, cover]))} />
          : <View style={{ flex: 1, marginHorizontal: -8 }}><ProfilePhotoGrid key={key} photos={profile.covers} readOnly /></View>}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 8, backgroundColor: '#fcfbf9' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  toolbarTitle: { fontSize: 14, color: '#817a70' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8, marginBottom: 30 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e7e3db' },
  initialAvatar: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 32, color: '#8d8578' },
  username: { flex: 1, fontSize: 20, fontWeight: '600', color: '#292925' },
  message: { padding: 24, alignItems: 'center', gap: 16 },
  error: { color: '#a34736', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  empty: { color: '#918b81', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retry: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', borderRadius: 22, backgroundColor: '#efede8' },
  retryText: { color: '#716d66', fontWeight: '600' },
});
