import { PhotoImage } from '@/src/components/PhotoImage';
import { QUIET_FRIEND_PREVIEW_LIMIT, type FeedPerson, type TodayPost } from '@/src/data/supabase/friendsFeed';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FriendsController } from './friendsController';

type Props = { state: ReturnType<FriendsController['getSnapshot']>; controller: FriendsController };
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function Avatar({ person, small = false }: { person: FeedPerson; small?: boolean }) {
  return person.avatarUri ? <Image source={{ uri: person.avatarUri }} style={small ? styles.smallAvatar : styles.avatar} />
    : <View style={[small ? styles.smallAvatar : styles.avatar, styles.initialAvatar]}>
      <Text style={small ? styles.smallInitial : styles.initial}>{person.username.slice(0, 1).toUpperCase()}</Text>
    </View>;
}

export function FriendsFeed({ state, controller }: Props) {
  const router = useRouter();
  const feed = state.feed;
  const posts = feed?.posts ?? [];
  const cards: (TodayPost | null)[] = posts.length % 2 ? [...posts, null] : posts;
  const people: FeedPerson[] = feed?.quietFriends ?? (state.lists?.friends ?? []).map((friend) => ({ ...friend, avatarUri: null }));
  const preview = people.slice(0, QUIET_FRIEND_PREVIEW_LIMIT);
  const remaining = people.length - preview.length;
  const day = feed ? new Date(`${feed.date}T12:00:00`) : new Date();
  const dateLabel = day.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).replace(/,/g, '');
  const openProfile = (userId: string) => router.push({ pathname: '/friends/[userId]', params: { userId } });

  return (
    <FlatList
      data={cards} numColumns={2} keyExtractor={(post) => post?.userId ?? 'empty-cell'}
      showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={styles.content}
      columnWrapperStyle={styles.columns}
      refreshing={(state.loading || state.feedLoading) && !state.open && !state.friendsOpen}
      onRefresh={() => { void controller.refresh(); }}
      ListHeaderComponent={<>
        {!!(state.loadError || state.feedError) && <View style={styles.errorBox}>
          <Text accessibilityLiveRegion="polite" style={styles.error}>{state.loadError || state.feedError}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void controller.refresh(); }} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>
        </View>}
        <View style={styles.todayRow}>
          <Text accessibilityRole="header" style={styles.today}>Today</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
      </>}
      renderItem={({ item }) => item ? <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.username}'s profile: ${item.title}`}
        onPress={() => openProfile(item.userId)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.author}>
          <Avatar person={item} small />
          <Text numberOfLines={1} style={styles.username}>{item.username}</Text>
        </View>
        <View style={styles.photo}>
          <PhotoImage photo={item.photo} style={styles.photoImage} contentFit="cover" />
          <View style={styles.caption}><Text numberOfLines={2} style={styles.photoTitle}>{item.title}</Text></View>
        </View>
      </Pressable> : <View style={styles.card} accessible={false} />}
      ListEmptyComponent={state.feedLoading && !feed ? <ActivityIndicator color="#8b847a" style={styles.loading} />
        : feed ? <View style={styles.empty}>
          <Text style={styles.muted}>{feed.friendCount > 0 ? 'No photos yet today.' : 'Add friends to see their daily photos.'}</Text>
          {feed.friendCount === 0 && <Pressable accessibilityRole="button" onPress={controller.open} style={styles.addButton}>
            <Text style={styles.addText}>Add friends</Text>
          </Pressable>}
        </View> : null}
      ListFooterComponent={people.length > 0 ? <View style={styles.everyone}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{feed ? 'Everyone else' : 'Your friends'}</Text>
        <Text style={styles.subtitle}>{feed ? 'Quiet today — tap to visit anyway' : 'Tap to visit a profile'}</Text>
        <View style={styles.people}>
          {preview.map((person) => <Pressable key={person.userId} accessibilityRole="button" accessibilityLabel={`View ${person.username}'s profile`}
            onPress={() => openProfile(person.userId)} style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
            <Avatar person={person} />
            <Text numberOfLines={1} style={styles.personName}>{person.username}</Text>
          </Pressable>)}
          <Pressable accessibilityRole="button" accessibilityLabel="View and search all friends" onPress={controller.openFriends}
            style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
            <View style={[styles.avatar, styles.initialAvatar]}>
              {remaining > 0 ? <Text style={styles.allCount}>+{remaining}</Text> : <Ionicons name="people-outline" size={23} color="#716d66" />}
            </View>
            <Text style={styles.personName}>All</Text>
          </Pressable>
        </View>
      </View> : null}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center' },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 8, marginBottom: 18 },
  today: { fontFamily: serif, fontSize: 30, color: '#242421' },
  date: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: '#9b978f' },
  columns: { gap: 14, marginBottom: 22 },
  card: { flex: 1, minWidth: 0 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  smallAvatar: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#dcd9d2' },
  smallInitial: { color: '#8d8578', fontSize: 11 },
  username: { flex: 1, fontSize: 13, color: '#383834' },
  photo: { aspectRatio: 0.8, borderRadius: 15, overflow: 'hidden', backgroundColor: '#eae8e3' },
  photoImage: { width: '100%', height: '100%' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.4)' },
  photoTitle: { fontFamily: mono, fontSize: 10, lineHeight: 15, color: '#fff' },
  everyone: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d7d2ca', paddingTop: 20, marginTop: 8 },
  sectionTitle: { fontFamily: serif, fontSize: 25, color: '#242421' },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#918b81', marginTop: 4, marginBottom: 16 },
  people: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  person: { width: '20%', alignItems: 'center', paddingHorizontal: 4, marginBottom: 16 },
  avatar: { width: '100%', maxWidth: 72, aspectRatio: 1, borderRadius: 999, backgroundColor: '#e7e3db' },
  initialAvatar: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#8d8578', fontSize: 22 },
  allCount: { color: '#716d66', fontSize: 14, fontWeight: '500' },
  personName: { fontSize: 10, color: '#817a70', marginTop: 7, textAlign: 'center', width: '100%' },
  pressed: { opacity: 0.65 },
  empty: { paddingVertical: 18, alignItems: 'center', gap: 14, marginBottom: 8 },
  loading: { paddingVertical: 20 },
  muted: { fontSize: 14, color: '#8b847a', lineHeight: 22, textAlign: 'center' },
  addButton: { borderRadius: 24, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center', backgroundColor: '#2d2e2b' },
  addText: { color: '#fffdfa', fontSize: 14, fontWeight: '600' },
  errorBox: { marginTop: 8 },
  error: { color: '#a34736', fontSize: 13, lineHeight: 20 },
  retry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryText: { color: '#514b43', fontSize: 14, fontWeight: '600' },
});
