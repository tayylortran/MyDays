import * as circles from './circles';
import * as hangouts from './hangouts';
import * as photos from './photos';
import * as profile from './profile';
import { Repository } from './repository';


export const localRepository: Repository = {
  listCircles: circles.listCircles,
  saveCircle: circles.saveCircle,
  nextCircleSort: circles.nextCircleSort,
  countHangoutsForCircle: circles.countHangoutsForCircle,
  moveHangoutsAndDeleteCircle: circles.moveHangoutsAndDeleteCircle,
  listHangouts: hangouts.listHangouts,
  saveHangout: hangouts.saveHangout,
  deleteHangout: hangouts.deleteHangout,
  addPhoto: photos.addPhoto,
  listPhotos: photos.listPhotos,
  deletePhoto: photos.deletePhoto,
  listPhotosForDate: profile.listPhotosForDate,
  listLibraryPhotos: photos.listLibraryPhotos,
  faceUrisForMonth: profile.faceUrisForMonth,
  setDayFace: profile.setDayFace,
  getProfileSettings: profile.getProfileSettings,
  saveProfileSettings: profile.saveProfileSettings,
};
