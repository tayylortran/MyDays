import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FriendsController } from './friendsController';

type Props = { controller: FriendsController; state: ReturnType<FriendsController['getSnapshot']> };

function Person({ username, children }: { username: string; children: ReactNode }) {
  return (
    <View style={styles.person}>
      <View style={styles.avatar} accessible={false}>
        <Text style={styles.initial}>{username.slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text numberOfLines={1} style={styles.username}>{username}</Text>
      <View style={styles.personActions}>{children}</View>
    </View>
  );
}

export function AddFriendsSheet({ state, controller }: Props) {
  const insets = useSafeAreaInsets();
  const busy = state.working !== null;
  const disabled = busy || state.loading || !!state.loadError;
  const result = state.result;
  const actionButton = (action: 'send' | 'accept' | 'decline' | 'cancel', id: string, username: string) => {
    const label = { send: 'Add', accept: 'Accept', decline: 'Decline', cancel: 'Cancel' }[action];
    const working = state.working === `${action}:${id}`;
    const secondary = action === 'decline' || action === 'cancel';
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} request ${action === 'send' || action === 'cancel' ? 'to' : 'from'} ${username}`}
        accessibilityState={{ disabled, busy: working }} disabled={disabled}
        onPress={() => { void controller.act(action, id); }}
        style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (disabled || pressed) && styles.dimmed]}>
        {working ? <ActivityIndicator size="small" color={secondary ? '#666159' : '#fff'} /> : action === 'decline' ? (
          <Ionicons name="close" size={19} color="#716d66" />
        ) : <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}
      </Pressable>
    );
  };

  return (
    <Modal visible={state.open} transparent animationType="slide" onRequestClose={controller.close} statusBarTranslucent>
      <View style={styles.modal}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close add friends"
          disabled={busy} onPress={controller.close} />
        <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboard, { paddingTop: insets.top + 12 }]}>
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.heading}>Add friends</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={controller.close} hitSlop={8} style={styles.done}>
                <Text style={[styles.doneText, busy && styles.dimmed]}>Done</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
              refreshControl={<RefreshControl refreshing={state.loading} onRefresh={() => { if (!busy) void controller.refresh(); }} tintColor="#716d66" />}>
              {!!state.loadError && <View style={styles.errorBox}>
                <Text accessibilityLiveRegion="polite" style={styles.error}>{state.loadError}</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void controller.refresh(); }} style={styles.retry}>
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>}
              {!!state.actionError && <Text accessibilityLiveRegion="polite" style={[styles.error, styles.actionError]}>{state.actionError}</Text>}
              <Text style={styles.sectionLabel}>WAITING ON YOU{state.lists ? ` · ${state.lists.incoming.length}` : ''}</Text>
              {state.lists ? state.lists.incoming.length > 0 ? (
                <View style={styles.requestGroup}>
                  {state.lists.incoming.map((person) => <Person key={person.friendshipId} username={person.username}>
                    {actionButton('accept', person.friendshipId, person.username)}
                    {actionButton('decline', person.friendshipId, person.username)}
                  </Person>)}
                </View>
              ) : <Text style={styles.muted}>You’re all caught up.</Text> : state.loading ? <ActivityIndicator color="#716d66" /> : null}

              <Text style={[styles.sectionLabel, styles.sectionSpace]}>FIND SOMEONE NEW</Text>
              <View style={styles.searchField}>
                <Ionicons name="search-outline" size={22} color="#a29d94" />
                <TextInput value={state.query} onChangeText={controller.setQuery} editable={!busy}
                  placeholder="Search an exact username" placeholderTextColor="#a29d94" accessibilityLabel="Search an exact username"
                  autoCapitalize="none" autoCorrect={false} maxLength={30} returnKeyType="search"
                  onSubmitEditing={() => { Keyboard.dismiss(); void controller.search(); }} style={styles.input} />
                {state.query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Clear username" disabled={busy}
                  hitSlop={8} onPress={() => controller.setQuery('')}><Ionicons name="close-circle" size={19} color="#a29d94" /></Pressable>}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Search username" disabled={busy || !state.query.trim() || state.searchStatus === 'loading'}
                onPress={() => { Keyboard.dismiss(); void controller.search(); }}
                style={({ pressed }) => [styles.searchSubmit, (pressed || busy || !state.query.trim()) && styles.dimmed]}>
                {state.searchStatus === 'loading' ? <ActivityIndicator color="#716d66" size="small" /> : <Text style={styles.retryText}>Search</Text>}
              </Pressable>
              {state.searchStatus === 'error' && <Text accessibilityLiveRegion="polite" style={styles.error}>{state.searchError}</Text>}
              {state.searchStatus === 'done' && !result && <Text accessibilityLiveRegion="polite" style={styles.muted}>No other user found with that username.</Text>}
              {result && <Person username={result.username}>
                {result.relationship === 'none' && actionButton('send', result.userId, result.username)}
                {result.relationship === 'friends' && <Text accessibilityLiveRegion="polite" style={styles.status}>Friends</Text>}
                {result.relationship === 'incoming' && result.friendshipId && actionButton('accept', result.friendshipId, result.username)}
                {result.relationship === 'outgoing' && <Text accessibilityLiveRegion="polite" style={styles.status}>Requested</Text>}
              </Person>}

              {!!state.lists?.outgoing.length && <>
                <Text style={[styles.sectionLabel, styles.sectionSpace]}>SENT REQUESTS · {state.lists.outgoing.length}</Text>
                {state.lists.outgoing.map((person) => <Person key={person.friendshipId} username={person.username}>
                  {actionButton('cancel', person.friendshipId, person.username)}
                </Person>)}
              </>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: 'rgba(36,36,33,0.25)' },
  keyboard: { flex: 1 },
  sheet: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', backgroundColor: '#fcfbf9', borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#dbd7d0', alignSelf: 'center', marginTop: 8, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  heading: { fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 34, color: '#242421', flexShrink: 1 },
  done: { minHeight: 44, justifyContent: 'center' },
  doneText: { fontSize: 16, color: '#716d66' },
  content: { paddingHorizontal: 20 },
  sectionLabel: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#918b81', marginBottom: 12 },
  sectionSpace: { marginTop: 30 },
  requestGroup: { backgroundColor: '#f5f3ef', borderRadius: 18, borderWidth: 1, borderColor: '#e6e3dd', paddingHorizontal: 12 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e9e6e0' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e7e3db', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#8d8578', fontSize: 18, fontWeight: '500' },
  username: { flex: 1, fontSize: 15, fontWeight: '600', color: '#292925' },
  personActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  button: { minHeight: 44, minWidth: 44, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: '#2d2e2b' },
  buttonText: { fontSize: 13, fontWeight: '600', color: '#fffdfa' },
  secondaryButton: { backgroundColor: '#eae7e2', paddingHorizontal: 12 },
  secondaryText: { color: '#716d66' },
  dimmed: { opacity: 0.5 },
  muted: { color: '#918b81', fontSize: 14, lineHeight: 22 },
  searchField: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e5e1da', borderRadius: 14, paddingHorizontal: 13, backgroundColor: '#f1efeb' },
  input: { flex: 1, minWidth: 0, minHeight: 52, color: '#383834', fontSize: 15, paddingVertical: 12 },
  searchSubmit: { alignSelf: 'flex-end', minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  status: { color: '#918b81', fontSize: 13, fontWeight: '600' },
  errorBox: { marginBottom: 18 },
  error: { color: '#a34736', fontSize: 13, lineHeight: 20 },
  actionError: { marginBottom: 18 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryText: { fontSize: 14, color: '#514b43', fontWeight: '600' },
});
