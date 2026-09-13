import { newId } from '@/src/lib/id';
import { supabase } from '@/src/lib/supabase';
import { MAX_HANGOUT_PHOTOS, type SavedHangout, type SaveHangoutInput } from '../types';
import { listPhotos, photoFromRow, uploadPhotoFiles, type PhotoRow } from './photos';

type SaveResult = { hangout: SavedHangout['hangout']; photos: PhotoRow[] };
let saving = false;

export async function flushPhotoCleanup(): Promise<void> {
  // A cleanup failure must not turn a committed save into a reported failure.
  try {
    const { data, error } = await supabase.from('photo_file_cleanup').select('path').limit(100);
    if (error) throw error;
    if (!data.length) return;
    const paths = data.map((row: { path: string }) => row.path);
    const removed = await supabase.storage.from('photos').remove(paths);
    if (removed.error) throw removed.error;
    const acknowledged = await supabase.from('photo_file_cleanup').delete().in('path', paths);
    if (acknowledged.error) throw acknowledged.error;
  } catch {
    // Durable server entries are retried on the next save/delete.
  }
}

export async function saveHangoutWithPhotos(input: SaveHangoutInput): Promise<SavedHangout> {
  if (saving) throw new Error('Wait for the current save to finish.');
  const { hangout, photos } = input;
  if (!hangout.title.trim() || !hangout.circleId) throw new Error('Add a title and choose a circle.');
  if (photos.length > MAX_HANGOUT_PHOTOS) throw new Error(`Choose up to ${MAX_HANGOUT_PHOTOS} photos.`);
  if (new Set(photos.map((photo) => photo.id)).size !== photos.length) throw new Error('Duplicate photo in draft.');
  saving = true;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error('Sign in before saving.');
    const userId = data.user.id;
    await flushPhotoCleanup();
    const existing = input.mode === 'edit' ? await listPhotos(hangout.id) : [];
    const previews = new Map(existing.map((photo) => [photo.id, photo]));
    const uploadId = newId();
    for (const photo of photos) {
      if (photo.kind !== 'new') continue;
      const folder = userId + '/' + uploadId + '/' + photo.id;
      const paths = { storagePath: folder + '/image.jpg', thumbStoragePath: folder + '/thumb.jpg' };
      await uploadPhotoFiles(photo.uri, paths);
      // Resolve viewing URLs before committing the database changes.
      previews.set(photo.id, await photoFromRow({ id: photo.id, hangout_id: hangout.id,
        storage_path: paths.storagePath, thumb_storage_path: paths.thumbStoragePath, sort: 0, updated_at: 0 }));
    }
    // Never delete these uploads after an uncertain response: the save may have committed.
    // Interrupted/failed uploads can leave unused files for manual cleanup.
    const unconfirmed = 'Could not confirm the save. Reconnect and reload the hangout before trying again.';
    let response;
    try {
      response = await supabase.rpc('save_hangout_with_photos', { p_id: uploadId, p_input: {
        mode: input.mode, hangout, photos: photos.map(({ kind, id }) => ({ kind, id })),
      } });
    } catch {
      throw new Error(unconfirmed);
    }
    // PostgreSQL errors confirm rollback. Network/gateway errors do not.
    if (response.error) throw new Error(/^[0-9A-Z]{5}$/.test(response.error.code) ? response.error.message : unconfirmed);
    if (!response.data) throw new Error(unconfirmed);
    const result: SaveResult = response.data;
    await flushPhotoCleanup();
    return { hangout: result.hangout, photos: result.photos.map((row) => ({
      ...previews.get(row.id)!, sort: row.sort, updatedAt: row.updated_at,
    })) };
  } finally {
    saving = false;
  }
}

export async function deleteHangout(id: string): Promise<void> {
  const { error } = await supabase.from('hangouts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await flushPhotoCleanup();
}
