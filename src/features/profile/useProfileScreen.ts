import { useRepo } from '@/src/data/RepositoryProvider';
import { ProfileSettings, Photo } from '@/src/data/types';
import { useCalendarMonth } from '@/src/features/calendar/CalendarMonthProvider';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useProfileScreen() {
  const repo = useRepo();
  const { year, month, prev, next } = useCalendarMonth();
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<ProfileSettings>({ username: '', photoUri: null });
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const [nextFaces, nextSettings] = await Promise.all([
      repo.faceUrisForMonth(key),
      repo.getProfileSettings(),
    ]);
    setFaces(nextFaces);
    setSettings(nextSettings);
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

  const openSettings = () => {
    setDraftUsername(settings.username);
    setDraftPhotoUri(settings.photoUri);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);
  };

  const pickProfilePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to add a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (result.canceled) return;

    setDraftPhotoUri(result.assets[0].uri);
  };

  const removeProfilePhoto = () => {
    setDraftPhotoUri(null);
  };

  const saveSettings = async () => {
    const nextSettings = {
      username: draftUsername.trim(),
      photoUri: draftPhotoUri,
    };

    await repo.saveProfileSettings(nextSettings);
    setSettings(nextSettings);
    setSettingsOpen(false);
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
    username: settings.username,
    photoUri: settings.photoUri,
    gridPhotos,
    openDate,
    dayPhotos,
    viewMode,
    settingsOpen,
    draftUsername,
    draftPhotoUri,
    setViewMode,
    setDraftUsername,
    prev,
    next,
    openDay,
    closeDay,
    chooseFace,
    openSettings,
    closeSettings,
    pickProfilePhoto,
    removeProfilePhoto,
    saveSettings,
  };
}
