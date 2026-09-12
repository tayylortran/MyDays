import {
  Circle, Hangout,
  LibraryPhotoOptions, LibraryPhotoPage,
  Photo, ProfileSettings, SaveHangoutInput, SavedHangout
} from './types';

export interface Repository {
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
  countProfilePhotos(): Promise<number>;
  getDayFace(date: string): Promise<string | null>;
  setDayFace(date: string, photoId: string): Promise<void>;
  getProfileSettings(): Promise<ProfileSettings>;
  saveProfileSettings(settings: ProfileSettings): Promise<void>;
}
