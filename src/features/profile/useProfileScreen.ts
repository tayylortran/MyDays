import { useRepo } from '@/src/data/RepositoryProvider';
import { Photo } from '@/src/data/types';
import { useCallback, useEffect, useState } from 'react';

export function useProfileScreen() {
  const repo = useRepo();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);

  const load = useCallback(async () => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setFaces(await repo.faceUrisForMonth(key));
  }, [repo, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const prev = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const next = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

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

  return {
    year,
    month,
    faces,
    openDate,
    dayPhotos,
    prev,
    next,
    openDay,
    closeDay,
    chooseFace,
  };
}
