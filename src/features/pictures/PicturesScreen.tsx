import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { PhotoImage } from '@/src/components/PhotoImage';
import { useMemo, type ReactNode } from 'react';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View,  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePicturesScreen } from './usePicturesScreen';

export default function PicturesScreen({ closeGesture, headerGesture, header, scrollY }: {
  closeGesture: PanGesture;
  headerGesture: PanGesture;
  header: ReactNode;
  scrollY: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pictures = usePicturesScreen();
  const scrollGesture = useMemo(() => Gesture.Native().requireExternalGestureToFail(closeGesture), [closeGesture]);
  const filterGesture = useMemo(() => Gesture.Native().requireExternalGestureToFail(headerGesture), [headerGesture]);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(Math.max(0, event.contentOffset.y));
  });

  const filters = [
    { id: undefined, name: 'All', color: undefined },
    ...pictures.circles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      color: circle.color,
    })),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <GestureDetector gesture={headerGesture}>
      <View>
      {header}
      <View style={styles.header}>
        <Text style={styles.title}>Pictures</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh pictures" disabled={pictures.loading}
          onPress={() => void pictures.refresh()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Text style={{ color: pictures.loading ? colors.disabled : colors.muted }}>{pictures.loading ? 'Loading…' : 'Refresh'}</Text>
        </Pressable>
        <Text style={styles.subtitle} accessibilityLiveRegion="polite">
          {pictures.totalPhotos === null
            ? pictures.loading ? 'Loading photos…' : 'Photos unavailable'
            : `${pictures.totalPhotos} ${pictures.totalPhotos === 1 ? 'photo' : 'photos'}`}
        </Text>
      </View>

      <View>
        <GestureDetector gesture={filterGesture}>
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
                onPress={() => {
                  if (filter.id !== pictures.circleId) {
                    scrollY.set(0);
                    pictures.selectCircle(filter.id);
                  }
                }}
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
        </GestureDetector>
      </View>
      </View>
      </GestureDetector>

      <GestureDetector gesture={closeGesture}>
      <GestureDetector gesture={scrollGesture}>
      <Animated.FlatList
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
        onScroll={onScroll}
        key={pictures.circleId ?? 'all'}
        style={styles.list}
        data={pictures.photos}
        keyExtractor={(photo) => photo.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <PhotoImage
              photo={item}
              thumbnail
              style={styles.image}
              contentFit="cover"
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
              <ActivityIndicator color={colors.text} />
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
      </GestureDetector>
      </GestureDetector>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
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
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedFilter: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  filterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  selectedFilterText: {
    color: colors.text,
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
    backgroundColor: colors.surfaceAlt,
  },
  message: {
    padding: 24,
    textAlign: 'center',
    color: colors.muted,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  actionText: {
    color: colors.text,
    fontWeight: '600',
  },
});
