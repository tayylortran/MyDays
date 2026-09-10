import { Image } from 'expo-image';
import {
    ActivityIndicator,
    FlatList,
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
      <Text style={styles.title}>Pictures</Text>

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
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  filters: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#eee',
  },
  selectedFilter: {
    backgroundColor: '#333',
  },
  filterText: {
    color: '#333',
    fontWeight: '600',
  },
  selectedFilterText: {
    color: '#fff',
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
