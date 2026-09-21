import {
  Circle, Hangout,
  LibraryPhotoOptions, LibraryPhotoPage,
  Photo, ProfileSettings, SaveHangoutInput, SavedHangout
} from './types';

import type { FriendListEntry, FriendProfile, FriendSearchResult, FriendsToday } from './friendTypes';

export interface FriendsRepository {
  searchFriendUsername(username: string): Promise<FriendSearchResult | null>;
  listFriends(): Promise<FriendListEntry[]>;
  listIncomingFriendRequests(): Promise<FriendListEntry[]>;
  listOutgoingFriendRequests(): Promise<FriendListEntry[]>;
  sendFriendRequest(recipientId: string): Promise<string>;
  acceptFriendRequest(friendshipId: string): Promise<void>;
  declineFriendRequest(friendshipId: string): Promise<void>;
  cancelFriendRequest(friendshipId: string): Promise<void>;
  removeFriend(friendshipId: string): Promise<void>;
  getFriendsToday(timeZone?: string): Promise<FriendsToday>;
  getFriendProfile(userId: string, month: string): Promise<FriendProfile>;
}

export interface Repository extends FriendsRepository {
  listCircles(): Promise<Circle[]>;
  saveCircle(c: Circle): Promise<void>;
  countHangoutsForCircle(circleId: string): Promise<number>;
  moveHangoutsAndDeleteCircle(circleId: string, destinationCircleId: string | null): Promise<void>;

  listHangouts(month: string): Promise<Hangout[]>;
  saveHangoutWithPhotos(input: SaveHangoutInput): Promise<SavedHangout>;
  deleteHangout(id: string): Promise<void>;

  listPhotos(hangoutId: string): Promise<Photo[]>;
  listPhotosForDate(date: string): Promise<Photo[]>;
  listLibraryPhotos(options: LibraryPhotoOptions): Promise<LibraryPhotoPage>;
  countLibraryPhotos(circleId?: string): Promise<number>;

  facesForMonth(month: string): Promise<Record<string, Photo>>;
  photoDatesForMonth(month: string): Promise<string[]>;
  countProfilePhotos(): Promise<number>;
  getDayFace(date: string): Promise<string | null>;
  setDayFace(date: string, photoId: string | null): Promise<void>;
  getProfileSettings(): Promise<ProfileSettings>;
  saveProfileSettings(settings: ProfileSettings): Promise<void>;
}
