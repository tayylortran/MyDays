import { useRepo } from '@/src/data/RepositoryProvider';
import { useCalendarMonth } from '@/src/features/calendar/CalendarMonthProvider';
import { Photo } from '@/src/data/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function useProfileScreen() {
  const repo = useRepo();
  const { year, month, prev, next } = useCalendarMonth();
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

  const load = useCallback(async () => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setFaces(await repo.faceUrisForMonth(key));
  }, [repo, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDay = async (date: string) => {
    const photos = await repo.listPhotosForDate(date);
    if (photos.length === 0) return;
    setDayPhotos(photos);
    setOpenDate(date);
  };

  const closeDay = () => {
    setOpenDate(null);
  };

  const chooseFace = async (photoId: string) => {
    if (!openDate) return;
    await repo.setDayFace(openDate, photoId);
    setOpenDate(null);
    await load();
  };

  const gridPhotos = Object.entries(faces)
  .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
  .map(([date, uri]) => ({
    date,
    uri,
  }));

  return {
    year,
    month,
    faces,
    gridPhotos,
    openDate,
    dayPhotos,
    viewMode,
    setViewMode,
    prev,
    next,
    openDay,
    closeDay,
    chooseFace,
  };
}
