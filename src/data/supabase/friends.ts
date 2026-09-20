import { supabase } from '@/src/lib/supabase';

export type FriendSearchResult = {
  userId: string;
  username: string;
  friendshipId: string | null;
  relationship: 'none' | 'incoming' | 'outgoing' | 'friends';
};

export type FriendListEntry = {
  friendshipId: string;
  userId: string;
  username: string;
  createdAt: string;
  acceptedAt: string | null;
};

type FriendRow = {
  friendship_id: string;
  user_id: string;
  username: string;
  created_at: string;
  accepted_at: string | null;
};

export async function searchFriendUsername(username: string): Promise<FriendSearchResult | null> {
  const query = username.trim();
  if (!/^[A-Za-z0-9_.]{3,30}$/.test(query)) {
    throw new Error('Enter a username with 3 to 30 letters, numbers, underscores, or periods.');
  }
  const { data, error } = await supabase.rpc('find_friend_by_username', { p_username: query })
    .returns<{ user_id: string; username: string; friendship_id: string | null; relationship: FriendSearchResult['relationship'] }[]>();
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Could not load the search result. Please try again.');
  const row = data[0];
  return row ? { userId: row.user_id, username: row.username, friendshipId: row.friendship_id, relationship: row.relationship } : null;
}

async function listRelationships(kind: 'friends' | 'incoming' | 'outgoing'): Promise<FriendListEntry[]> {
  const rows: FriendRow[] = [];
  while (true) {
    const { data, error } = await supabase.rpc('list_my_friendships', {
      p_kind: kind, p_limit: 50, p_offset: rows.length,
    }).returns<FriendRow[]>();
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Could not load friends. Please try again.');
    rows.push(...data);
    if (data.length < 50) break;
  }
  return rows.map((row) => ({
    friendshipId: row.friendship_id, userId: row.user_id, username: row.username,
    createdAt: row.created_at, acceptedAt: row.accepted_at,
  }));
}

export const listFriends = () => listRelationships('friends');
export const listIncomingFriendRequests = () => listRelationships('incoming');
export const listOutgoingFriendRequests = () => listRelationships('outgoing');

// A lost response may follow a committed mutation. Ask the UI to refresh instead
// of claiming the operation failed or inviting a blind retry of a deletion.
async function mutateFriendship(name: string, args: Record<string, string>): Promise<unknown> {
  const unconfirmed = 'Could not confirm the change. Refresh your friends before trying again.';
  let response;
  try { response = await supabase.rpc(name, args); }
  catch { throw new Error(unconfirmed); }
  if (response.error) {
    throw new Error(/^[0-9A-Z]{5}$/.test(response.error.code) ? response.error.message : unconfirmed);
  }
  return response.data;
}

export async function sendFriendRequest(recipientId: string): Promise<string> {
  const id = await mutateFriendship('send_friend_request', { p_recipient_id: recipientId });
  if (typeof id !== 'string') throw new Error('Could not confirm the request. Refresh your friends.');
  return id;
}

export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await mutateFriendship('accept_friend_request', { p_friendship_id: friendshipId });
}

async function endFriendship(friendshipId: string, action: 'decline' | 'cancel' | 'remove'): Promise<void> {
  await mutateFriendship('end_friendship', { p_friendship_id: friendshipId, p_action: action });
}

export const declineFriendRequest = (friendshipId: string) => endFriendship(friendshipId, 'decline');
export const cancelFriendRequest = (friendshipId: string) => endFriendship(friendshipId, 'cancel');
export const removeFriend = (friendshipId: string) => endFriendship(friendshipId, 'remove');
