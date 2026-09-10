export interface Circle {
    id: string;
    name: string;
    color: string;
    sort: number;
    updatedAt: number;
}

export interface Hangout {
    id: string;
    date: string;
    title: string;
    note: string;
    circleId: string;
    updatedAt: number;
}

export interface Photo {
    id: string;
    hangoutId: string;
    uri: string;
    thumbUri?: string;
    sort: number;
    updatedAt: number;
}

export const MAX_HANGOUT_PHOTOS = 5;

export type HangoutPhotoInput =
  | { kind: 'existing'; id: string }
  | { kind: 'new'; id: string; uri: string };

export interface SaveHangoutInput {
  mode: 'create' | 'edit';
  hangout: Hangout;
  photos: HangoutPhotoInput[];
}

export interface SavedHangout {
  hangout: Hangout;
  photos: Photo[];
}

export interface ProfileSettings {
    username: string;
    photoUri: string | null;
}

// A photo plus the date of the hangout it belongs to.
export interface LibraryPhoto extends Photo {
  date: string;
}

export interface LibraryPhotoOptions {
  circleId?: string;
  cursor?: string;
  limit: number;
}

export interface LibraryPhotoPage {
  items: LibraryPhoto[];
  nextCursor: string | null;
}
