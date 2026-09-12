import { useRepo } from '@/src/data/RepositoryProvider';
import { ProfileSettings, Photo } from '@/src/data/types';
import { useCalendarMonth } from '@/src/features/calendar/CalendarMonthProvider';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

export function useProfileScreen() {
  const repo = useRepo();
  const { year, month, prev, next } = useCalendarMonth();
  const [faces, setFaces] = useState<Record<string, Photo>>({});
  const [totalProfilePhotos, setTotalProfilePhotos] = useState<number | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>({ username: '', photoUri: null });
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [dayPhotos, setDayPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const picker = useRef({ request: 0, saving: false });
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [draftPhotoUri, setDraftPhotoUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const [nextFaces, nextSettings, nextTotal] = await Promise.all([
      repo.facesForMonth(key),
      repo.getProfileSettings(),
      repo.countProfilePhotos(),
    ]);
    setFaces(nextFaces);
    setSettings(nextSettings);
    setTotalProfilePhotos(nextTotal);
  }, [repo, year, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDay = async (date: string) => {
    if (picker.current.saving) return;
    const request = ++picker.current.request;
    try {
      const [photos, currentId] = await Promise.all([
        repo.listPhotosForDate(date), repo.getDayFace(date),
      ]);
      if (request !== picker.current.request || photos.length === 0) return;
      setDayPhotos(photos);
      setSelectedPhotoId(photos.some((photo) => photo.id === currentId) ? currentId : null);
      setPhotoError('');
      setOpenDate(date);
    } catch {
      if (request === picker.current.request) Alert.alert('Could not load photos', 'Please try again.');
    }
  };

  const closeDay = () => {
    if (picker.current.saving) return;
    picker.current.request += 1;
    setOpenDate(null);
  };

  const chooseFace = async () => {
    if (!openDate || !selectedPhotoId || picker.current.saving) return;
    picker.current.saving = true;
    setSavingPhoto(true);
    setPhotoError('');
    try {
      await repo.setDayFace(openDate, selectedPhotoId);
    } catch {
      setPhotoError('Could not save this photo. Please try again.');
      return;
    } finally {
      picker.current.saving = false;
      setSavingPhoto(false);
    }
    setOpenDate(null);
    try { await load(); }
    catch { Alert.alert('Photo saved', 'Could not refresh your profile. Reopen this tab to try again.'); }
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
    .map(([date, photo]) => ({
      date,
      ...photo,
    }));

  return {
    year,
    month,
    faces,
    totalProfilePhotos,
    username: settings.username,
    photoUri: settings.photoUri,
    gridPhotos,
    openDate,
    dayPhotos,
    selectedPhotoId,
    setSelectedPhotoId,
    savingPhoto,
    photoError,
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
