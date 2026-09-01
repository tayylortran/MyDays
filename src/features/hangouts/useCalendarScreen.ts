import { useRepo } from '@/src/data/RepositoryProvider';
import { useCalendarMonth } from '@/src/features/calendar/CalendarMonthProvider';
import { Circle, Hangout, Photo } from '@/src/data/types';
import { newId } from '@/src/lib/id';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

const MAX_PHOTOS = 5;

export function useCalendarScreen() {
  const repo = useRepo();
  const { year, month, prev, next } = useCalendarMonth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  const [openDate, setOpenDate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [pickedCircle, setPickedCircle] = useState<string | null>(null);

  const [newCircleName, setNewCircleName] = useState('');

  const [openHangout, setOpenHangout] = useState<Hangout | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCircle, setEditCircle] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);
  const [creatingCircle, setCreatingCircle] = useState(false);

  const load = useCallback(async () => {
    setCircles(await repo.listCircles());
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    setHangouts(await repo.listHangouts(key));
  }, [repo, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const circleById: Record<string, Circle> = {};
  circles.forEach((c) => {
    circleById[c.id] = c;
  });

  const byDate: Record<string, Hangout[]> = {};
  hangouts.forEach((h) => {
    (byDate[h.date] ||= []).push(h);
  });

  const openAdd = (date: string) => {
    setOpenDate(date);
    setTitle('');
    setNote('');
    setPickedCircle(circles[0]?.id ?? null);
  };

  const closeAdd = () => {
    setOpenDate(null);
  };

  const openCreateCircle = () => {
    setNewCircleName('');
    setEditingCircle(null);
    setCreatingCircle(true);
  };

  const closeCircleModal = () => {
    setEditingCircle(null);
    setCreatingCircle(false);
    setNewCircleName('');
  };

  const createCircle = async () => {
    const name = newCircleName.trim();
    if (!name) return;

    const palette = ['#E8674C', '#E0A73E', '#4C86E8', '#7B61C9', '#3FA372', '#D65B9A'];
    const id = newId();

    await repo.saveCircle({
      id,
      name,
      color: palette[circles.length % palette.length],
      sort: circles.length,
      updatedAt: Date.now(),
    });

    setCircles(await repo.listCircles());
    closeCircleModal();
  };

  const submit = async () => {
    if (!openDate || !pickedCircle) {
      Alert.alert('Add a circle first');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Add a title first');
      return;
    }

    try {
      await repo.saveHangout({
        id: newId(),
        date: openDate,
        title: title.trim(),
        note: note.trim(),
        circleId: pickedCircle,
        updatedAt: Date.now(),
      });

      closeAdd();
      await load();
    } catch (e: any) {
      Alert.alert('Could not save', String(e?.message ?? e));
    }
  };

  const openDetail = async (h: Hangout) => {
    setOpenHangout(h);
    setEditTitle(h.title);
    setEditNote(h.note);
    setEditCircle(h.circleId);
    setPhotos(await repo.listPhotos(h.id));
  };

  const saveEdits = async () => {
    if (!openHangout || !editCircle) {
      Alert.alert('Pick a circle');
      return;
    }

    if (!editTitle.trim()) {
      Alert.alert('Add a title first');
      return;
    }

    await repo.saveHangout({
      ...openHangout,
      title: editTitle.trim(),
      note: editNote.trim(),
      circleId: editCircle,
      updatedAt: Date.now(),
    });

    setOpenHangout(null);
    await load();
  };

  const pickPhoto = async () => {
    if (!openHangout) return;

    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Photo limit', `Up to ${MAX_PHOTOS} photos per hangout.`);
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access in Settings to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (result.canceled) return;

    try {
      await repo.addPhoto(openHangout.id, result.assets[0].uri);
      setPhotos(await repo.listPhotos(openHangout.id));
    } catch (e: any) {
      Alert.alert('Could not add photo', String(e?.message ?? e));
    }
  };

  const removePhoto = async (id: string) => {
    await repo.deletePhoto(id);
    if (openHangout) {
      setPhotos(await repo.listPhotos(openHangout.id));
    }
  };

  const removeHangout = async () => {
    if (!openHangout) return;

    await repo.deleteHangout(openHangout.id);
    setOpenHangout(null);
    await load();
  };

  return {
    year,
    month,
    circles,
    hangouts,
    photos,

    openDate,
    title,
    note,
    pickedCircle,
    newCircleName,

    openHangout,
    editTitle,
    editNote,
    editCircle,

    setTitle,
    setNote,
    setPickedCircle,
    setNewCircleName,
    setOpenHangout,
    setEditTitle,
    setEditNote,
    setEditCircle,

    byDate,
    circleById,

    prev,
    next,
    openAdd,
    closeAdd,
    openCreateCircle,
    closeCircleModal,
    createCircle,
    submit,
    openDetail,
    saveEdits,
    pickPhoto,
    removePhoto,
    removeHangout,
    editingCircle,
    creatingCircle,
    setEditingCircle,
    setCreatingCircle,
  };
}
