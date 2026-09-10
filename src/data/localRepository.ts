import * as circles from './circles';
import * as hangouts from './hangouts';
import * as photos from './photos';
import * as profile from './profile';
import { Repository } from './repository';

export const localRepository: Repository = {
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
  faceUrisForMonth: profile.faceUrisForMonth,
  countProfilePhotos: profile.countProfilePhotos,
  getDayFace: profile.getDayFace,
  setDayFace: profile.setDayFace,
  getProfileSettings: profile.getProfileSettings,
  saveProfileSettings: profile.saveProfileSettings,
};
