import { supabase } from '@/src/lib/supabase';
import type { Photo } from '../types';
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

export async function setDayFace(date: string, photoId: string): Promise<void> {
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

// Username storage is independent of the avatar upload, which is still local.
export async function getUsername(): Promise<string> {
  const { data, error } = await supabase.from('profiles').select('username')
    .eq('user_id', await currentUserId()).maybeSingle<{ username: string }>();
  if (error) throw new Error(error.message);
  return data?.username ?? '';
}

export async function saveUsername(value: string): Promise<void> {
  const username = value.trim();
  if (!/^[A-Za-z0-9_.]{3,30}$/.test(username)) {
    throw new Error('Use 3–30 letters, numbers, underscores, or periods for your username.');
  }
  const { error } = await supabase.from('profiles').upsert({
    user_id: await currentUserId(), username, updated_at: Date.now(),
  }, { onConflict: 'user_id' });
  if (error?.code === '23505') throw new Error('That username is already taken. Choose another.');
  if (error) throw new Error(error.message);
}
