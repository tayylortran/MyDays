import { supabase } from '@/src/lib/supabase';
import type { FriendProfile } from '../friendTypes';
type ProfileRow = {
  user_id: string; username: string; avatar_storage_path: string | null; total_photos: number;
  covers: { id: string; date: string; storage_path: string; thumb_storage_path: string | null }[];
};

export async function getFriendProfile(userId: string, month: string): Promise<FriendProfile> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) throw new Error('This profile is unavailable.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000')) throw new Error('Use a month in YYYY-MM format.');
  const { data, error } = await supabase.rpc('get_friend_profile', { p_user_id: userId, p_month: month });
  if (error) throw new Error(error.message);
  const row = data as ProfileRow | null;
  if (!row || row.user_id !== userId || !Array.isArray(row.covers)) throw new Error('Could not load this profile. Please try again.');
  const paths = [...new Set([
    ...(row.avatar_storage_path ? [row.avatar_storage_path] : []),
    ...row.covers.flatMap((cover) => [cover.storage_path, ...(cover.thumb_storage_path ? [cover.thumb_storage_path] : [])]),
  ])];
  const urls = new Map<string, string>();
  if (paths.length) {
    // Short-lived links limit access after removal; already downloaded images
    // cannot be recalled. Storage checks accepted friendship for every new link.
    const signed = await supabase.storage.from('photos').createSignedUrls(paths, 300);
    if (signed.error) throw new Error(signed.error.message);
    for (const item of signed.data) {
      if (item.error || !item.path || !item.signedUrl) throw new Error('Could not load shared photos. Please refresh.');
      urls.set(item.path, item.signedUrl);
    }
  }
  const url = (path: string) => {
    const value = urls.get(path);
    if (!value) throw new Error('Could not load shared photos. Please refresh.');
    return value;
  };
  return {
    userId: row.user_id, username: row.username, avatarUri: row.avatar_storage_path ? url(row.avatar_storage_path) : null,
    totalPhotos: row.total_photos,
    covers: row.covers.map((cover) => ({
      id: cover.id, date: cover.date, uri: url(cover.storage_path),
      ...(cover.thumb_storage_path ? { thumbUri: url(cover.thumb_storage_path) } : {}),
    })),
  };
}
