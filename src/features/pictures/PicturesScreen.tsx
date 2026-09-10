import { Image } from 'expo-image';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePicturesScreen } from './usePicturesScreen';

export default function PicturesScreen() {
  const pictures = usePicturesScreen();

  const filters = [
    { id: undefined, name: 'All', color: undefined },
    ...pictures.circles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      color: circle.color,
    })),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Pictures</Text>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {pictures.totalPhotos === null
            ? pictures.loading ? 'Loading photos…' : 'Photos unavailable'
            : `${pictures.totalPhotos} ${pictures.totalPhotos === 1 ? 'photo' : 'photos'}`}
        </Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filters.map((filter) => {
            const selected = pictures.circleId === filter.id;

            return (
              <Pressable
                key={filter.id ?? 'all'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                hitSlop={{ top: 6, bottom: 6 }}
                onPress={() => pictures.selectCircle(filter.id)}
                style={[
                  styles.filter,
                  selected && styles.selectedFilter,
                ]}
              >
                {filter.color && (
                  <View style={[styles.filterDot, { backgroundColor: filter.color }]} />
                )}
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.selectedFilterText,
                  ]}
                >
                  {filter.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        key={pictures.circleId ?? 'all'}
        style={styles.list}
        data={pictures.photos}
        keyExtractor={(photo) => photo.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        refreshing={pictures.loading && pictures.photos.length === 0}
        onRefresh={() => void pictures.refresh()}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <Image
              source={{ uri: item.thumbUri ?? item.uri }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="disk"
              accessible
              accessibilityLabel={`Photo from ${item.date}`}
            />
          </View>
        )}
        ListEmptyComponent={
          !pictures.loading && !pictures.error ? (
            <Text style={styles.message}>
              {pictures.circleId === undefined
                ? 'No pictures yet. Add photos to a hangout to see them here.'
                : 'No pictures in this circle yet.'}
            </Text>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {pictures.loading ? (
              <ActivityIndicator color="#333" />
            ) : pictures.error ? (
              <>
                <Text style={styles.error}>{pictures.error}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (pictures.hasMore) {
                      void pictures.loadMore();
                    } else {
                      void pictures.refresh();
                    }
                  }}
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Try again</Text>
                </Pressable>
              </>
            ) : pictures.hasMore ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void pictures.loadMore()}
                style={styles.action}
              >
                <Text style={styles.actionText}>Load more</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 40,
    fontWeight: '400',
    letterSpacing: -1,
    color: '#24211d',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#756f66',
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 6,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    minWidth: 44,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e2da',
    backgroundColor: '#fff',
  },
  selectedFilter: {
    backgroundColor: '#eee8df',
    borderColor: '#d3c8b9',
  },
  filterText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedFilterText: {
    color: '#24211d',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  grid: {
    flexGrow: 1,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cell: {
    width: '33.333333%',
  },
  image: {
    width: '100%',
    aspectRatio: 0.8,
    backgroundColor: '#f4f2ee',
  },
  message: {
    padding: 24,
    textAlign: 'center',
    color: '#666',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  error: {
    color: '#a33',
    textAlign: 'center',
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#eee',
  },
  actionText: {
    color: '#333',
    fontWeight: '600',
  },
});
