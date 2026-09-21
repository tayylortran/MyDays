import type { Photo } from './types';

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

export type SharedCover = Pick<Photo, 'id' | 'uri' | 'thumbUri' | 'cacheKey' | 'thumbCacheKey'> & { date: string };
export type FriendProfile = { userId: string; username: string; avatarUri: string | null; totalPhotos: number; covers: SharedCover[] };
export type FeedPerson = { userId: string; username: string; avatarUri: string | null };
export type TodayPost = FeedPerson & { title: string; photo: SharedCover; updatedAt: number };
export type FriendsToday = { date: string; friendCount: number; posts: TodayPost[]; quietFriends: FeedPerson[] };

// Shared by feed loading and rendering so only displayed avatars need loading.
export const QUIET_FRIEND_PREVIEW_LIMIT = 9;
