import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text, TextInput } from '@/src/theme/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, View,  } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { visibleFriends, type FriendsController } from './friendsController';

type Props = { controller: FriendsController; state: ReturnType<FriendsController['getSnapshot']> };

export function YourFriendsSheet({ state, controller }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const busy = state.working !== null;
  const disabled = busy || state.loading || !!state.loadError;
  const friends = useMemo(() => visibleFriends(state.lists?.friends ?? [], state.friendQuery), [state.lists, state.friendQuery]);
  const hasFriends = !!state.lists?.friends.length;

  return (
    <Modal visible={state.friendsOpen} transparent animationType="slide" onRequestClose={controller.close} statusBarTranslucent>
      <View style={styles.modal}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close your friends"
          disabled={busy} onPress={controller.close} />
        <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboard, { paddingTop: insets.top + 12 }]}>
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.heading}>Your friends</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={controller.close} hitSlop={8} style={styles.done}>
                <Text style={[styles.doneText, busy && styles.dimmed]}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.controls}>
              <View style={styles.searchField}>
                <Ionicons name="search-outline" size={22} color={colors.subtle} />
                <TextInput value={state.friendQuery} onChangeText={controller.setFriendQuery} editable={!busy}
                  accessibilityLabel="Search your friends" placeholder="Search your friends" placeholderTextColor={colors.subtle}
                  autoCapitalize="none" autoCorrect={false} maxLength={30} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} style={styles.input} />
                {!!state.friendQuery && <Pressable accessibilityRole="button" accessibilityLabel="Clear friend search" disabled={busy}
                  hitSlop={8} onPress={() => controller.setFriendQuery('')}><Ionicons name="close-circle" size={19} color={colors.subtle} /></Pressable>}
              </View>
              <Text style={styles.label}>{state.lists ? state.friendQuery.trim() ? `${friends.length} ${friends.length === 1 ? 'MATCH' : 'MATCHES'}` : `ALL ${state.lists.friends.length}` : 'YOUR FRIENDS'} · A–Z</Text>
              {!!state.loadError && <View>
                <Text accessibilityLiveRegion="polite" style={styles.error}>{state.loadError}</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void controller.refresh(); }} style={styles.textButton}>
                  <Text style={styles.doneText}>Try again</Text>
                </Pressable>
              </View>}
              {!!state.actionError && <Text accessibilityLiveRegion="polite" style={styles.error}>{state.actionError}</Text>}
              {state.removalTarget && <View style={styles.confirmation}>
                <Text accessibilityRole="header" style={styles.confirmTitle}>Remove {state.removalTarget.username}?</Text>
                <Text style={styles.muted}>You’ll need a new friend request to reconnect.</Text>
                <View style={styles.confirmActions}>
                  <Pressable accessibilityRole="button" onPress={controller.cancelRemoval} disabled={busy} style={styles.textButton}>
                    <Text style={styles.doneText}>Cancel</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Confirm removal of ${state.removalTarget.username}`}
                    disabled={disabled} onPress={() => { void controller.confirmRemoval(); }}
                    style={({ pressed }) => [styles.confirmButton, (disabled || pressed) && styles.dimmed]}>
                    <Text style={styles.confirmButtonText}>Remove friend</Text>
                  </Pressable>
                </View>
              </View>}
            </View>
            <FlatList data={friends} keyExtractor={(friend) => friend.friendshipId}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) }]}
              refreshControl={<RefreshControl refreshing={state.loading} onRefresh={() => { if (!busy) void controller.refresh(); }} tintColor={colors.muted} />}
              ListEmptyComponent={state.loading && !state.lists ? <ActivityIndicator color={colors.muted} style={styles.empty} />
                : !state.loadError && state.lists ? <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>{hasFriends ? 'No friends found' : 'No friends yet'}</Text>
                  <Text style={styles.muted}>{hasFriends ? 'Try another username.' : 'Accepted friend requests will appear here.'}</Text>
                </View> : null}
              renderItem={({ item }) => {
                const removing = state.working === `remove:${item.friendshipId}`;
                return <View style={styles.person}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.username}'s profile`} disabled={disabled}
                    style={styles.profileLink} onPress={() => {
                      Keyboard.dismiss(); controller.close();
                      router.push({ pathname: '/friends/[userId]', params: { userId: item.userId } });
                    }}>
                    <View style={styles.avatar} accessible={false}><Text style={styles.initial}>{item.username.slice(0, 1).toUpperCase()}</Text></View>
                    <Text numberOfLines={1} style={styles.username}>{item.username}</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.disabled} />
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.username} from friends`}
                    accessibilityState={{ disabled, busy: removing }} disabled={disabled}
                    onPress={() => { Keyboard.dismiss(); controller.requestRemoval(item.friendshipId); }}
                    style={({ pressed }) => [styles.removeButton, (disabled || pressed) && styles.dimmed]}>
                    {removing ? <ActivityIndicator color={colors.muted} size="small" /> : <Text style={styles.removeText}>Remove</Text>}
                  </Pressable>
                </View>;
              }} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.overlay },
  keyboard: { flex: 1 },
  sheet: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: colors.pressed, alignSelf: 'center', marginTop: 8, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  heading: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 34, color: colors.text, flexShrink: 1 },
  done: { minHeight: 44, justifyContent: 'center' },
  doneText: { fontSize: 16, color: colors.muted },
  controls: { paddingHorizontal: 20 },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 13, backgroundColor: colors.surfaceAlt },
  input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.text, fontSize: 15, paddingVertical: 12 },
  label: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: colors.subtle, marginTop: 18, marginBottom: 8 },
  list: { flexGrow: 1, paddingHorizontal: 20 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  profileLink: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.muted, fontSize: 18, fontWeight: '500' },
  username: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  removeButton: { minHeight: 44, minWidth: 70, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.surfaceAlt },
  removeText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  dimmed: { opacity: 0.5 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  confirmation: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 12, gap: 8 },
  confirmTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  muted: { color: colors.subtle, fontSize: 14, lineHeight: 22 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' },
  confirmButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 23, justifyContent: 'center', backgroundColor: colors.dangerFill },
  confirmButtonText: { color: colors.onColor, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '500', color: colors.muted },
});
