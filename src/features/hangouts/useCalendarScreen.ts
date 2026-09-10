import { useRepo } from '@/src/data/RepositoryProvider';
import { useCalendarMonth } from '@/src/features/calendar/CalendarMonthProvider';
import { Circle, Hangout } from '@/src/data/types';
import { newId } from '@/src/lib/id';
import { useHangoutEditor } from './useHangoutEditor';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

const CIRCLE_COLORS = ['#E8674C', '#E0A73E', '#4C86E8', '#7B61C9', '#3FA372', '#D65B9A'];

export function useCalendarScreen() {
  const repo = useRepo();
  const { year, month, prev, next } = useCalendarMonth();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  const [newCircleName, setNewCircleName] = useState('');
  const [circleColor, setCircleColor] = useState(CIRCLE_COLORS[0]);

  const [editingCircle, setEditingCircle] = useState<Circle | null>(null);
  const [creatingCircle, setCreatingCircle] = useState(false);
  const [deletingCircle, setDeletingCircle] = useState(false);
  const [circleHangoutCount, setCircleHangoutCount] = useState(0);
  const [deleteDestinationId, setDeleteDestinationId] = useState<string | null>(null);

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

  const hangoutEditor = useHangoutEditor(
    circles,
    (saved) => setHangouts((current) => [
      ...current.filter((hangout) => hangout.id !== saved.id), saved,
    ]),
    (id) => setHangouts((current) => current.filter((hangout) => hangout.id !== id)),
  );

  const openCreateCircle = () => {
    setNewCircleName('');
    setCircleColor(CIRCLE_COLORS[circles.length % CIRCLE_COLORS.length]);
    setEditingCircle(null);
    setCreatingCircle(true);
    setDeletingCircle(false);
  };

  const openEditCircle = (circle: Circle) => {
    setNewCircleName(circle.name);
    setCircleColor(circle.color);
    setCreatingCircle(false);
    setEditingCircle(circle);
    setDeletingCircle(false);
  };

  const startDeleteCircle = async () => {
    if (!editingCircle) return;

    const hangoutCount = await repo.countHangoutsForCircle(editingCircle.id);
    const destination = circles.find((circle) => circle.id !== editingCircle.id);

    setCircleHangoutCount(hangoutCount);
    setDeleteDestinationId(destination?.id ?? null);
    setDeletingCircle(true);
  };

  const cancelDeleteCircle = () => {
    setDeletingCircle(false);
    setCircleHangoutCount(0);
    setDeleteDestinationId(null);
  };

  const deleteCircle = async () => {
    if (!editingCircle) return;

    if (circleHangoutCount > 0 && !deleteDestinationId) {
      Alert.alert('Choose a destination circle first');
      return;
    }

    try {
      await repo.moveHangoutsAndDeleteCircle(editingCircle.id, deleteDestinationId);
      closeCircleModal();
      await load();
    } catch (e: any) {
      Alert.alert('Could not delete circle', String(e?.message ?? e));
    }
  };

  const closeCircleModal = () => {
    setEditingCircle(null);
    setCreatingCircle(false);
    setNewCircleName('');
    setCircleColor(CIRCLE_COLORS[0]);
    setDeletingCircle(false);
    setCircleHangoutCount(0);
    setDeleteDestinationId(null);
  };

  const saveCircle = async () => {
    const name = newCircleName.trim();
    if (!name) return;

    const circle = editingCircle;

    await repo.saveCircle({
      id: circle?.id ?? newId(),
      name,
      color: circleColor,
      sort: circle?.sort ?? circles.length,
      updatedAt: Date.now(),
    });

    setCircles(await repo.listCircles());
    closeCircleModal();
  };

  return {
    hangoutEditor,
    openAdd: hangoutEditor.openCreate,
    openDetail: hangoutEditor.openDetail,
    year,
    month,
    circles,
    hangouts,

    newCircleName,
    circleColor,


    setNewCircleName,
    setCircleColor,

    byDate,
    circleById,

    prev,
    next,
    openCreateCircle,
    openEditCircle,
    closeCircleModal,
    saveCircle,
    editingCircle,
    creatingCircle,
    deletingCircle,
    circleHangoutCount,
    deleteDestinationId,
    setEditingCircle,
    setCreatingCircle,
    setDeleteDestinationId,
    startDeleteCircle,
    cancelDeleteCircle,
    deleteCircle,
  };
}
