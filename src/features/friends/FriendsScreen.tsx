import { Ionicons } from '@expo/vector-icons';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Temporary content for the feed layout, until friendships and posts are connected.
const samplePosts = [
  { id: '1', username: 'jordanleee', title: 'the whole table' },
  { id: '2', username: 'marisol.p', title: 'pool hall' },
  { id: '3', username: 'kev', title: 'tailgate' },
  { id: '4', username: 'bri', title: 'ferry back' },
  { id: '5', username: 'amara', title: 'a slow afternoon' },
  { id: '6', username: 'anh.tran', title: 'one more coffee' },
];

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function PhotoPlaceholder() {
  return (
    <View style={styles.placeholder} accessible={false} pointerEvents="none">
      <View style={styles.stripes}>
        {Array.from({ length: 32 }, (_, index) => <View key={index} style={styles.stripe} />)}
      </View>
    </View>
  );
}

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const date = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
  }).replace(/,/g, '');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={samplePosts}
        keyExtractor={(post) => post.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.heading}>Friends</Text>
              <View style={styles.actions}>
                <Pressable disabled accessibilityRole="button" accessibilityLabel="Search your friends"
                  accessibilityState={{ disabled: true }} style={styles.searchButton}>
                  <Ionicons name="search-outline" size={25} color="#514e49" />
                </Pressable>
                <Pressable disabled accessibilityRole="button" accessibilityLabel="Add friends, 2 pending requests"
                  accessibilityState={{ disabled: true }} style={styles.addButton}>
                  <Ionicons name="add" size={30} color="#fffdfa" />
                  <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
                </Pressable>
              </View>
            </View>
            <Text style={styles.summary}>38 FRIENDS · {samplePosts.length} POSTED TODAY</Text>
            <View style={styles.todayRow}>
              <Text accessibilityRole="header" style={styles.today}>Today</Text>
              <Text style={styles.date}>{date}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.author}>
              <View style={styles.avatar} />
              <Text numberOfLines={1} style={styles.username}>{item.username}</Text>
            </View>
            <View style={styles.photo} accessibilityLabel={`${item.title}, sample photo placeholder`} accessible>
              <PhotoPlaceholder />
              <View style={styles.caption}>
                <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f1ee' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heading: { fontFamily: serif, fontSize: 48, color: '#242421', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fcfbf9', borderWidth: 1, borderColor: '#e6e3df', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2d2e2b', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -3, right: -2, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, borderWidth: 2, borderColor: '#f2f1ee', backgroundColor: '#bd5b40', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  summary: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, color: '#8b8880', marginTop: 8 },
  todayRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 12, marginTop: 30, marginBottom: 18 },
  today: { fontFamily: serif, fontSize: 30, color: '#242421' },
  date: { fontFamily: mono, fontSize: 10, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase', color: '#9b978f' },
  row: { gap: 14, marginBottom: 22 },
  card: { flex: 1, minWidth: 0 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  avatar: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#dcd9d2' },
  username: { flex: 1, fontSize: 13, color: '#383834' },
  photo: { aspectRatio: 0.8, borderRadius: 15, overflow: 'hidden', backgroundColor: '#eae8e3' },
  placeholder: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  stripes: { position: 'absolute', width: 1000, height: 1000, left: -350, top: -350, flexDirection: 'row', transform: [{ rotate: '45deg' }] },
  stripe: { width: 12, height: '100%', marginRight: 12, backgroundColor: '#e2e0da' },
  caption: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 11, backgroundColor: 'rgba(242,241,238,0.55)' },
  title: { fontFamily: mono, fontSize: 10, lineHeight: 15, color: '#68645d' },
});
