import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddFriendsSheet } from './AddFriendsSheet';
import { YourFriendsSheet } from './YourFriendsSheet';
import { useFriendsScreen } from './useFriendsScreen';

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function FriendsScreen() {
  const { state, controller } = useFriendsScreen();
  const incoming = state.lists?.incoming.length ?? 0;
  const friendCount = state.lists?.friends.length;
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
  }).replace(/,/g, '');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.heading}>Friends</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel="Search your friends"
                  onPress={controller.openFriends} style={({ pressed }) => [styles.searchButton, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="search-outline" size={25} color="#514e49" />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add friends${incoming ? `, ${incoming} pending requests` : ''}`}
                  onPress={controller.open} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="add" size={30} color="#fffdfa" />
                  {incoming > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{incoming > 99 ? '99+' : incoming}</Text></View>}
                </Pressable>
              </View>
            </View>
            <Text style={styles.summary}>{friendCount === undefined ? 'YOUR DAILY CIRCLE' : `${friendCount} ${friendCount === 1 ? 'FRIEND' : 'FRIENDS'}`}</Text>
          </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={state.loading && !state.open && !state.friendsOpen} onRefresh={() => { void controller.refresh(); }} tintColor="#716d66" />}
      >
            {!!state.loadError && <View style={styles.errorBox}>
              <Text accessibilityLiveRegion="polite" style={styles.error}>{state.loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => { void controller.refresh(); }} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>}
            <View style={styles.todayRow}>
              <Text accessibilityRole="header" style={styles.today}>Today</Text>
              <Text style={styles.date}>{date}</Text>
            </View>
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={34} color="#aaa297" />
          <Text style={styles.emptyText}>Your friends’ daily photos will appear here.</Text>
          {friendCount === 0 && <Pressable accessibilityRole="button" onPress={controller.open} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Add friends</Text>
          </Pressable>}
        </View>
      </ScrollView>
      <AddFriendsSheet state={state} controller={controller} />
      <YourFriendsSheet state={state} controller={controller} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f1ee' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: serif, fontSize: 48, color: '#242421', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fcfbf9', borderWidth: 1, borderColor: '#e6e3df', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2d2e2b', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, borderWidth: 2, borderColor: '#f2f1ee', backgroundColor: '#bd5b40', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  summary: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#8b8880', marginTop: 8 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 8, marginBottom: 18 },
  today: { fontFamily: serif, fontSize: 30, color: '#242421' },
  date: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: '#9b978f' },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 56, gap: 16 },
  emptyText: { color: '#8b847a', fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 260 },
  emptyAction: { borderRadius: 24, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center', backgroundColor: '#2d2e2b' },
  emptyActionText: { color: '#fffdfa', fontSize: 14, fontWeight: '600' },
  errorBox: { marginTop: 16 },
  error: { color: '#a34736', fontSize: 13, lineHeight: 20 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#514b43', fontSize: 14, fontWeight: '600' },
});
