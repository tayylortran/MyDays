import { useRepo } from '@/src/data/RepositoryProvider';
import type { Circle, LibraryPhoto } from '@/src/data/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

const PAGE_SIZE = 30;

export function usePicturesScreen() {
  const repo = useRepo();

  // undefined means "All".
  const [circleId, setCircleId] = useState<string | undefined>();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [photos, setPhotos] = useState<LibraryPhoto[]>([]);
  const [totalPhotos, setTotalPhotos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  const cursor = useRef<string | null>(null);
  const busy = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (reset: boolean) => {
      if (!reset && (busy.current || cursor.current === null)) {
        return;
      }

      const currentRequest = ++requestId.current;
      busy.current = true;
      setLoading(true);
      setError('');

      if (reset) {
        cursor.current = null;
        setPhotos([]);
        setTotalPhotos(null);
        setHasMore(false);
      }

      try {
        const [page, nextCircles, total] = await Promise.all([
          repo.listLibraryPhotos({
            circleId,
            cursor: reset ? undefined : cursor.current ?? undefined,
            limit: PAGE_SIZE,
          }),
          reset ? repo.listCircles() : Promise.resolve(null),
          reset ? repo.countLibraryPhotos(circleId) : Promise.resolve(null),
        ]);

        // Ignore a response from an old filter or closed screen.
        if (currentRequest !== requestId.current) return;

        if (nextCircles) {
          setCircles(nextCircles);

          // A previously selected circle may have been deleted.
          if (
            circleId !== undefined &&
            !nextCircles.some((circle) => circle.id === circleId)
          ) {
            setCircleId(undefined);
            return;
          }
        }

        if (total !== null) setTotalPhotos(total);
        setPhotos((previous) => {
          if (reset) return page.items;

          const existingIds = new Set(previous.map((photo) => photo.id));

          return [
            ...previous,
            ...page.items.filter((photo) => !existingIds.has(photo.id)),
          ];
        });

        cursor.current = page.nextCursor;
        setHasMore(page.nextCursor !== null);
      } catch {
        if (currentRequest === requestId.current) {
          setError('Could not load your pictures. Please try again.');
        }
      } finally {
        if (currentRequest === requestId.current) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [repo, circleId]
  );

  // Reload when opening this tab or changing the filter.
  useFocusEffect(
    useCallback(() => {
      void load(true);

      return () => {
        requestId.current += 1;
        busy.current = false;
      };
    }, [load])
  );

  function selectCircle(nextCircleId: string | undefined) {
    if (nextCircleId === circleId) return;

    requestId.current += 1;
    cursor.current = null;
    setPhotos([]);
    setTotalPhotos(null);
    setHasMore(false);
    setLoading(true);
    setError('');
    setCircleId(nextCircleId);
  }

  return {
    circleId,
    circles,
    photos,
    totalPhotos,
    loading,
    error,
    hasMore,
    selectCircle,
    refresh: () => load(true),
    loadMore: () => load(false),
  };
}
