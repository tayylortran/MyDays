import { Circle, Hangout, Photo } from './types';

export interface Repository {
  listCircles(): Promise<Circle[]>;
  saveCircle(c: Circle): Promise<void>;
  nextCircleSort(): Promise<number>;

  listHangouts(month: string): Promise<Hangout[]>;
  saveHangout(h: Hangout): Promise<void>;
  deleteHangout(id: string): Promise<void>;

  addPhoto(hangoutId: string, pickedUri: string): Promise<Photo>;
  listPhotos(hangoutId: string): Promise<Photo[]>;
  deletePhoto(id: string): Promise<void>;
}