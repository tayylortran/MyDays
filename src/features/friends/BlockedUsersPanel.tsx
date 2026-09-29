import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, View } from 'react-native';
import { useRepo } from '@/src/data/RepositoryProvider';
import type { BlockedUser } from '@/src/data/friendTypes';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { BlockedUserRow } from './BlockedUserRow';

export function BlockedUsersPanel({ onWorkingChange }: { onWorkingChange: (working: boolean) => void }) {
  const repo = useRepo();
  const { colors } = useTheme();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [working, setWorking] = useState<string | null>(null);
  const mounted = useRef(false);
  const version = useRef(0);
  const mutating = useRef(false);

  const load = useCallback(() => {
    const request = ++version.current;
    return repo.listBlockedUsers().then((next) => {
      if (mounted.current && request === version.current) { setUsers(next); setLoadError(''); }
    }).catch((error: unknown) => {
      if (mounted.current && request === version.current) {
        setLoadError(error instanceof Error ? error.message : 'Could not load blocked users. Please try again.');
      }
    }).finally(() => {
      if (mounted.current && request === version.current) setLoading(false);
    });
  }, [repo]);

  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !mutating.current) { setLoading(true); void load(); }
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [load]);

  async function unblock(userId: string) {
    if (mutating.current || loading || loadError) return;
    mutating.current = true;
    setWorking(userId);
    setActionError('');
    onWorkingChange(true);
    try {
      await repo.unblockUser(userId);
      if (mounted.current) setUsers((current) => current.filter((user) => user.userId !== userId));
    } catch (error) {
      if (mounted.current) setActionError(error instanceof Error ? error.message : 'Could not unblock this user.');
    } finally {
      // Reconcile lost responses as well as successful mutations.
      if (mounted.current) await load();
      mutating.current = false;
      if (mounted.current) { setWorking(null); onWorkingChange(false); }
    }
  }

  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>Tap a person to unblock them.</Text>
      {!!loadError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{loadError}</Text>}
      {!!actionError && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{actionError}</Text>}
      <Pressable accessibilityRole="button" disabled={loading || !!working} onPress={() => { setLoading(true); void load(); }}
        style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 }}>
        <Text style={{ color: colors.muted }}>{loading ? 'Loading…' : loadError ? 'Try again' : 'Refresh'}</Text>
      </Pressable>
      <FlatList data={users} keyExtractor={(user) => user.userId} style={{ flex: 1 }}
        renderItem={({ item }) => <BlockedUserRow username={item.username}
          disabled={loading || !!working || !!loadError} working={working === item.userId}
          onUnblock={() => { void unblock(item.userId); }} />}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.muted} /> : !loadError ?
          <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 32 }}>You haven’t blocked anyone.</Text> : null} />
    </View>
  );
}
