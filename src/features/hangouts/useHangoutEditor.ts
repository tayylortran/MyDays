import { useRepo } from '@/src/data/RepositoryProvider';
import { MAX_HANGOUT_PHOTOS, type Circle, type Hangout, type Photo, type SavedHangout } from '@/src/data/types';
import { newId } from '@/src/lib/id';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

export type DraftPhoto = Pick<Photo, 'id' | 'uri' | 'thumbUri' | 'cacheKey' | 'thumbCacheKey'> & { kind: 'existing' | 'new' };
export type HangoutDraft = { hangout: Hangout; photos: DraftPhoto[] };
type EditorState =
  | { mode: 'closed' }
  | { mode: 'loading'; hangout: Hangout }
  | { mode: 'view'; entry: SavedHangout }
  | { mode: 'edit'; draft: HangoutDraft; baseline: string; original: SavedHangout | null };

export function useHangoutEditor(
  circles: Circle[],
  onSaved: (hangout: Hangout) => void,
  onDeleted: (id: string) => void,
) {
  const repo = useRepo();
  const [state, setState] = useState<EditorState>({ mode: 'closed' });
  const [working, setWorking] = useState<'save' | 'pick' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current += 1; };
  }, []);

  function startDraft(draft: HangoutDraft, original: SavedHangout | null) {
    generation.current += 1;
    setError('');
    setState({ mode: 'edit', draft, baseline: JSON.stringify(draft), original });
  }

  function openCreate(date: string) {
    if (busy.current) return;
    startDraft({
      hangout: { id: newId(), date, title: '', note: '', circleId: circles[0]?.id ?? '', updatedAt: Date.now() },
      photos: [],
    }, null);
  }

  async function openDetail(hangout: Hangout) {
    if (busy.current) return;
    const request = ++generation.current;
    setError('');
    setState({ mode: 'loading', hangout });
    try {
      const photos = await repo.listPhotos(hangout.id);
      if (mounted.current && request === generation.current) setState({ mode: 'view', entry: { hangout, photos } });
    } catch {
      if (mounted.current && request === generation.current) setError('Could not load photos. Please try again.');
    }
  }

  function edit() {
    if (state.mode !== 'view' || busy.current) return;
    startDraft({
      hangout: { ...state.entry.hangout },
      photos: state.entry.photos.map((photo) => ({ ...photo, kind: 'existing' })),
    }, state.entry);
  }

  function close() {
    if (busy.current) return;
    const leave = () => {
      Keyboard.dismiss();
      generation.current += 1;
      setError('');
      setState(state.mode === 'edit' && state.original ? { mode: 'view', entry: state.original } : { mode: 'closed' });
    };
    if (state.mode === 'edit' && JSON.stringify(state.draft) !== state.baseline) {
      Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard changes', style: 'destructive', onPress: leave },
      ]);
    } else leave();
  }

  function change(field: 'title' | 'note' | 'circleId', value: string) {
    if (busy.current) return;
    setState((current) => current.mode === 'edit' ? {
      ...current, draft: { ...current.draft, hangout: { ...current.draft.hangout, [field]: value } },
    } : current);
  }

  function removePhoto(id: string) {
    if (busy.current) return;
    setState((current) => current.mode === 'edit' ? {
      ...current, draft: { ...current.draft, photos: current.draft.photos.filter((photo) => photo.id !== id) },
    } : current);
  }

  async function pickPhotos() {
    if (state.mode !== 'edit' || busy.current) return;
    const remaining = MAX_HANGOUT_PHOTOS - state.draft.photos.length;
    if (remaining <= 0) return;
    const request = generation.current;
    busy.current = true;
    setWorking('pick');
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Allow photo access in Settings to add pictures.');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining,
        orderedSelection: true, quality: 1,
      });
      if (result.canceled || !mounted.current || request !== generation.current) return;
      const additions: DraftPhoto[] = result.assets.slice(0, remaining).map((asset) => ({
        id: newId(), uri: asset.uri, kind: 'new',
      }));
      setState((current) => current.mode === 'edit' ? {
        ...current, draft: { ...current.draft, photos: [...current.draft.photos, ...additions] },
      } : current);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not open your photos.');
    } finally {
      busy.current = false;
      if (mounted.current) setWorking(null);
    }
  }

  async function save() {
    if (state.mode !== 'edit' || busy.current) return;
    if (!state.draft.hangout.title.trim()) { setError('Add a title first.'); return; }
    if (!circles.some((circle) => circle.id === state.draft.hangout.circleId)) {
      setError('Choose a circle. You can create one using + on the calendar.'); return;
    }
    busy.current = true;
    setWorking('save');
    setError('');
    Keyboard.dismiss();
    try {
      const entry = await repo.saveHangoutWithPhotos({
        mode: state.original ? 'edit' : 'create',
        hangout: state.draft.hangout,
        photos: state.draft.photos.map((photo) => photo.kind === 'existing'
          ? { kind: 'existing', id: photo.id }
          : { kind: 'new', id: photo.id, uri: photo.uri }),
      });
      if (!mounted.current) return;
      onSaved(entry.hangout);
      setState({ mode: 'view', entry });
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Could not save. Your changes are still here.');
    } finally {
      busy.current = false;
      if (mounted.current) setWorking(null);
    }
  }

  function confirmDelete() {
    if (state.mode !== 'view' || busy.current) return;
    const id = state.entry.hangout.id;
    Alert.alert('Delete hangout?', 'This removes the hangout and its photos, including any selected profile photos.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (busy.current) return;
        busy.current = true;
        setWorking('delete');
        setError('');
        try {
          await repo.deleteHangout(id);
          if (!mounted.current) return;
          onDeleted(id);
          setState({ mode: 'closed' });
        } catch {
          if (mounted.current) setError('Could not delete this hangout. Please try again.');
        } finally {
          busy.current = false;
          if (mounted.current) setWorking(null);
        }
      } },
    ]);
  }

  return { state, working, error, openCreate, openDetail, edit, close, change, removePhoto, pickPhotos, save, confirmDelete };
}

export type HangoutEditorController = ReturnType<typeof useHangoutEditor>;
