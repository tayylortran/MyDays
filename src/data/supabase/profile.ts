import { supabase } from '@/src/lib/supabase';
import type { Photo, ProfileSettings } from '../types';
import { File } from 'expo-file-system';
import { newId } from '@/src/lib/id';
import { preparePhoto } from '@/src/lib/preparePhoto';
import { flushPhotoCleanup } from './saveHangout';
import { photosFromRows, type PhotoRow } from './photos';

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sign in to access your profile.');
  return data.session.user.id;
}

export async function getDayFace(date: string): Promise<string | null> {
  const { data, error } = await supabase.from('day_faces').select('photo_id')
    .eq('user_id', await currentUserId()).eq('date', date).maybeSingle<{ photo_id: string }>();
  if (error) throw new Error(error.message);
  return data?.photo_id ?? null;
}

export async function setDayFace(date: string, photoId: string | null): Promise<void> {
  if (photoId === null) {
    const { error } = await supabase.from('day_faces').delete()
      .eq('user_id', await currentUserId()).eq('date', date);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from('day_faces').upsert({
    user_id: await currentUserId(), date, photo_id: photoId, updated_at: Date.now(),
  }, { onConflict: 'user_id,date' });
  if (error) throw new Error(error.message);
}

export async function facesForMonth(month: string): Promise<Record<string, Photo>> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000')) throw new Error('Use a month in YYYY-MM format.');
  const [year, number] = month.split('-').map(Number);
  const nextMonth = number === 12 ? `${String(year + 1).padStart(4, '0')}-01` : `${year.toString().padStart(4, '0')}-${String(number + 1).padStart(2, '0')}`;
  const { data, error } = await supabase.from('day_faces')
    .select('date, photos!inner(id, hangout_id, storage_path, thumb_storage_path, sort, updated_at)')
    .eq('user_id', await currentUserId()).gte('date', `${month}-01`).lt('date', `${nextMonth}-01`)
    .order('date').limit(31).returns<{ date: string; photos: PhotoRow }[]>();
  if (error) throw new Error(error.message);
  const photos = await photosFromRows(data.map((row) => row.photos));
  return Object.fromEntries(data.map((row, index) => [row.date, photos[index]]));
}

export async function countProfilePhotos(): Promise<number> {
  const { count, error } = await supabase.from('day_faces').select('photo_id', { count: 'exact', head: true })
    .eq('user_id', await currentUserId());
  if (error) throw new Error(error.message);
  if (count === null) throw new Error('Could not count profile photos.');
  return count;
}

export async function getProfileSettings(): Promise<ProfileSettings> {
  const { data, error } = await supabase.from('profiles').select('username, avatar_storage_path')
    .eq('user_id', await currentUserId()).maybeSingle<{ username: string; avatar_storage_path: string | null }>();
  if (error) throw new Error(error.message);
  let photoUri: string | null = null;
  if (data?.avatar_storage_path) {
    const signed = await supabase.storage.from('photos').createSignedUrl(data.avatar_storage_path, 3600);
    if (signed.error) throw new Error(signed.error.message);
    photoUri = signed.data.signedUrl;
  }
  return { username: data?.username ?? '', photoUri };
}

export async function saveProfileSettings(settings: ProfileSettings): Promise<void> {
  const username = settings.username.trim();
  if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
    throw new Error('Use 3 to 30 letters, numbers, underscores, or periods for your username.');
  }
  const userId = await currentUserId();
  const bucket = supabase.storage.from('photos');
  let avatarPath: string | null = null;
  if (settings.photoUri) {
    if (/^https?:/i.test(settings.photoUri)) {
      // Reuse our signed URL's path even after its token expires. Never save the URL.
      const base = bucket.getPublicUrl('').data.publicUrl.replace('/object/public/', '/object/sign/');
      if (!settings.photoUri.startsWith(base)) throw new Error('Choose an avatar from your photo library.');
      avatarPath = decodeURIComponent(settings.photoUri.slice(base.length).split('?')[0]);
      if (!avatarPath.startsWith(userId + '/avatars/')) throw new Error('Choose an avatar from your photo library.');
    } else {
      const prepared = await preparePhoto(settings.photoUri);
      try {
        // The existing 720px JPEG is sufficient for an avatar; upload only this size.
        if (prepared.thumbnail.bytes <= 0 || prepared.thumbnail.bytes > 5 * 1024 * 1024) throw new Error('The avatar must be between 1 byte and 5 MB.');
        avatarPath = userId + '/avatars/' + newId() + '.jpg';
        const { error } = await bucket.upload(avatarPath, await new File(prepared.thumbnail.uri).arrayBuffer(), {
          contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
        });
        if (error) throw new Error(error.message);
      } finally {
        for (const output of [prepared.image, prepared.thumbnail]) {
          try { new File(output.uri).delete(); } catch { /* OS cache cleanup is the fallback. */ }
        }
      }
    }
  }
  // One row update saves the username/avatar together and queues the replaced file.
  // Failed/uncertain saves preserve the upload for manual cleanup, like hangout saves.
  const unconfirmed = 'Could not confirm the profile save. Reconnect and reopen your profile before trying again.';
  let response;
  try {
    response = await supabase.from('profiles').upsert({
      user_id: userId, username, avatar_storage_path: avatarPath, updated_at: Date.now(),
    }, { onConflict: 'user_id' });
  } catch { throw new Error(unconfirmed); }
  if (response.error?.code === '23505') throw new Error('That username is already taken. Choose another.');
  if (response.error) throw new Error(/^[0-9A-Z]{5}$/.test(response.error.code) ? response.error.message : unconfirmed);
  await flushPhotoCleanup();
}
