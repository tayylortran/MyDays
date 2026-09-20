import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddFriendsSheet } from './AddFriendsSheet';
import { YourFriendsSheet } from './YourFriendsSheet';
import { useFriendsScreen } from './useFriendsScreen';
import { FriendsFeed } from './FriendsFeed';

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function FriendsScreen() {
  const { state, controller } = useFriendsScreen();
  const incoming = state.lists?.incoming.length ?? 0;
  const friendCount = state.feed?.friendCount ?? state.lists?.friends.length;

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
            <Text style={styles.summary}>{friendCount === undefined ? 'YOUR DAILY CIRCLE' : `${friendCount} ${friendCount === 1 ? 'FRIEND' : 'FRIENDS'}`}{state.feed ? ` · ${state.feed.posts.length} POSTED TODAY` : ''}</Text>
          </View>
      <FriendsFeed state={state} controller={controller} />
      <AddFriendsSheet state={state} controller={controller} />
      <YourFriendsSheet state={state} controller={controller} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f1ee' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: serif, fontSize: 48, color: '#242421', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fcfbf9', borderWidth: 1, borderColor: '#e6e3df', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2d2e2b', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, borderWidth: 2, borderColor: '#f2f1ee', backgroundColor: '#bd5b40', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  summary: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#8b8880', marginTop: 8 },
});
