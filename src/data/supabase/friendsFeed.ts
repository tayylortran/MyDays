import { supabase } from '@/src/lib/supabase';
import { QUIET_FRIEND_PREVIEW_LIMIT, type FeedPerson, type TodayPost, type FriendsToday } from '../friendTypes';
type FriendRow = {
  user_id: string; username: string; avatar_storage_path: string | null;
  cover: { id: string; date: string; title: string; storage_path: string; thumb_storage_path: string | null; updated_at: number } | null;
};
type FeedPage = { date: string; friend_count: number; friends: FriendRow[] };

export async function getFriendsToday(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'): Promise<FriendsToday> {
  const rows: FriendRow[] = [];
  let date = '';
  let friendCount = 0;
  while (true) {
    const { data, error } = await supabase.rpc('get_friends_today', { p_timezone: timeZone, p_limit: 50, p_offset: rows.length });
    if (error) throw new Error(error.message);
    const page = data as FeedPage | null;
    if (!page || !Array.isArray(page.friends) || !/^\d{4}-\d{2}-\d{2}$/.test(page.date)) throw new Error('Could not load today. Please refresh.');
    if (date && date !== page.date) throw new Error('A new day has started. Refresh to see today’s photos.');
    date = page.date;
    friendCount = page.friend_count;
    rows.push(...page.friends);
    if (page.friends.length < 50) break;
  }
  // Deduplicate in case friendship changes shift page boundaries during a load.
  const people = [...new Map(rows.map((row) => [row.user_id, row])).values()];
  const quiet = people.filter((row) => !row.cover);
  const displayedQuietIds = new Set(quiet.slice(0, QUIET_FRIEND_PREVIEW_LIMIT).map((row) => row.user_id));
  const paths = [...new Set(people.flatMap((row) => [
    ...(row.avatar_storage_path && (row.cover || displayedQuietIds.has(row.user_id)) ? [row.avatar_storage_path] : []),
    ...(row.cover ? [row.cover.thumb_storage_path ?? row.cover.storage_path] : []),
  ]))];
  const urls = new Map<string, string>();
  for (let offset = 0; offset < paths.length; offset += 100) {
    const signed = await supabase.storage.from('photos').createSignedUrls(paths.slice(offset, offset + 100), 300);
    if (signed.error) throw new Error(signed.error.message);
    for (const item of signed.data) {
      if (item.error || !item.path || !item.signedUrl) throw new Error('Some shared photos changed. Please refresh.');
      urls.set(item.path, item.signedUrl);
    }
  }
  const url = (path: string) => {
    const value = urls.get(path);
    if (!value) throw new Error('Could not load shared photos. Please refresh.');
    return value;
  };
  const person = (row: FriendRow): FeedPerson => ({
    userId: row.user_id, username: row.username,
    avatarUri: row.avatar_storage_path && (row.cover || displayedQuietIds.has(row.user_id)) ? url(row.avatar_storage_path) : null,
  });
  const posts = people.filter((row) => row.cover !== null).map((row): TodayPost => {
    const cover = row.cover!;
    return { ...person(row), title: cover.title, updatedAt: cover.updated_at,
      photo: { id: cover.id, date: cover.date, uri: url(cover.thumb_storage_path ?? cover.storage_path) } };
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.userId.localeCompare(b.userId));
  return { date, friendCount, posts, quietFriends: quiet.map(person) };
}
