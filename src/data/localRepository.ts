import * as circles from './circles';
import * as hangouts from './hangouts';
import * as photos from './photos';
import { Repository } from './repository';

export const localRepository: Repository = {
  listCircles: circles.listCircles,
  saveCircle: circles.saveCircle,
  nextCircleSort: circles.nextCircleSort,
  listHangouts: hangouts.listHangouts,
  saveHangout: hangouts.saveHangout,
  deleteHangout: hangouts.deleteHangout,
  addPhoto: photos.addPhoto,
  listPhotos: photos.listPhotos,
  deletePhoto: photos.deletePhoto,
};