import {
  Circle, Hangout,
  LibraryPhotoOptions, LibraryPhotoPage,
  Photo, ProfileSettings
} from './types';

export interface Repository {
  listCircles(): Promise<Circle[]>;
  saveCircle(c: Circle): Promise<void>;
  nextCircleSort(): Promise<number>;
  countHangoutsForCircle(circleId: string): Promise<number>;
  moveHangoutsAndDeleteCircle(circleId: string, destinationCircleId: string | null): Promise<void>;

  listHangouts(month: string): Promise<Hangout[]>;
  saveHangout(h: Hangout): Promise<void>;
  deleteHangout(id: string): Promise<void>;

  addPhoto(hangoutId: string, pickedUri: string): Promise<Photo>;
  listPhotos(hangoutId: string): Promise<Photo[]>;
  deletePhoto(id: string): Promise<void>;
  listPhotosForDate(date: string): Promise<Photo[]>;
  listLibraryPhotos(
  options: LibraryPhotoOptions
): Promise<LibraryPhotoPage>;

  faceUrisForMonth(month: string): Promise<Record<string, string>>;
  countProfilePhotos(): Promise<number>;
  setDayFace(date: string, photoId: string): Promise<void>;
  getProfileSettings(): Promise<ProfileSettings>;
  saveProfileSettings(settings: ProfileSettings): Promise<void>;
}
