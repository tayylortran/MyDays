import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRepo } from '@/src/data/RepositoryProvider';
import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';

export function FriendProfileMenu({ userId, username, onBlocked, onUnconfirmed }: {
  userId: string;
  username: string;
  onBlocked: () => void;
  onUnconfirmed: () => void;
}) {
  const repo = useRepo();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const mutating = useRef(false);
  const close = () => { if (!mutating.current) { setOpen(false); setConfirming(false); setError(''); } };

  async function block() {
    if (mutating.current) return;
    mutating.current = true;
    setWorking(true);
    setError('');
    try {
      await repo.blockUser(userId);
      setOpen(false);
      onBlocked();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not block this user. Please try again.');
      // A lost response can still mean the block committed. Reload access.
      onUnconfirmed();
    } finally {
      mutating.current = false;
      setWorking(false);
    }
  }

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Friend options" accessibilityState={{ expanded: open }}
      onPress={() => setOpen(true)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable accessible={false} onPress={close}
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} accessibilityViewIsModal
          style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: Math.max(insets.bottom, 24), gap: 12 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600' }}>
            {confirming ? `Block ${username}?` : username}
          </Text>
          {confirming && <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
            This removes your friendship. They won’t be able to find your profile or send you friend requests.
            You can unblock them in Settings.
          </Text>}
          {!!error && <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{error}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Block ${username}`}
            accessibilityState={{ disabled: working, busy: working }} disabled={working}
            onPress={() => confirming ? void block() : setConfirming(true)}
            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {working ? <ActivityIndicator color={colors.danger} /> : <Ionicons name="ban-outline" size={22} color={colors.danger} />}
            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>{working ? 'Blocking…' : 'Block'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={working} onPress={close}
            style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 16 }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
