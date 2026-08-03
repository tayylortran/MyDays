import * as circles from './circles';
import * as hangouts from './hangouts';
import { Repository } from './repository';

export const localRepository: Repository = {
  listCircles: circles.listCircles,
  saveCircle: circles.saveCircle,
  nextCircleSort: circles.nextCircleSort,
  listHangouts: hangouts.listHangouts,
  saveHangout: hangouts.saveHangout,
};