import * as circles from './circles';
import * as hangouts from './hangouts';
import * as photos from './photos';
import * as profile from './profile';
import { Repository } from './repository';

// The local database has no accounts or shared friendship data.
async function friendsUnavailable(): Promise<never> {
  throw new Error('Friends are unavailable in local-only mode.');
}

export const localRepository: Repository = {
  searchFriendUsername: friendsUnavailable,
  listFriends: friendsUnavailable,
  listIncomingFriendRequests: friendsUnavailable,
  listOutgoingFriendRequests: friendsUnavailable,
  sendFriendRequest: friendsUnavailable,
  acceptFriendRequest: friendsUnavailable,
  declineFriendRequest: friendsUnavailable,
  cancelFriendRequest: friendsUnavailable,
  removeFriend: friendsUnavailable,
  getFriendsToday: friendsUnavailable,
  getFriendProfile: friendsUnavailable,
  listCircles: circles.listCircles,
  saveCircle: circles.saveCircle,
  countHangoutsForCircle: circles.countHangoutsForCircle,
  moveHangoutsAndDeleteCircle: circles.moveHangoutsAndDeleteCircle,

  listHangouts: hangouts.listHangouts,
  saveHangoutWithPhotos: hangouts.saveHangoutWithPhotos,
  deleteHangout: hangouts.deleteHangout,

  listPhotos: photos.listPhotos,
  listPhotosForDate: profile.listPhotosForDate,
  listLibraryPhotos: photos.listLibraryPhotos,
  countLibraryPhotos: photos.countLibraryPhotos,

  facesForMonth: profile.facesForMonth,
  photoDatesForMonth: profile.photoDatesForMonth,
  countProfilePhotos: profile.countProfilePhotos,
  getDayFace: profile.getDayFace,
  setDayFace: profile.setDayFace,
  getProfileSettings: profile.getProfileSettings,
  saveProfileSettings: profile.saveProfileSettings,
};
