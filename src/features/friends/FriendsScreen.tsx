import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddFriendsSheet } from './AddFriendsSheet';
import { YourFriendsSheet } from './YourFriendsSheet';
import { useFriendsScreen } from './useFriendsScreen';
import { FriendsFeed } from './FriendsFeed';

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function FriendsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
                  <Ionicons name="search-outline" size={25} color={colors.secondary} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Add friends${incoming ? `, ${incoming} pending requests` : ''}`}
                  onPress={controller.open} style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}>
                  <Ionicons name="add" size={30} color={colors.onAction} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: serif, fontSize: 48, color: colors.text, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, borderWidth: 2, borderColor: colors.border, backgroundColor: '#bd5b40', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.onColor, fontSize: 11, fontWeight: '600' },
  summary: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: colors.muted, marginTop: 8 },
});
