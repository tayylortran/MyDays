import { Circle, Hangout } from './types';

export interface Repository {
  listCircles(): Promise<Circle[]>;
  saveCircle(c: Circle): Promise<void>;
  nextCircleSort(): Promise<number>;

  listHangouts(month: string): Promise<Hangout[]>;
  saveHangout(h: Hangout): Promise<void>;
}