import type { Repository } from './repository';
import * as circles from './supabase/circles';
import * as hangouts from './supabase/hangouts';
import * as photos from './supabase/photos';
import * as profile from './supabase/profile';
import * as saveHangout from './supabase/saveHangout';

export const supabaseRepository: Repository = {
    listCircles: circles.listCircles,
    saveCircle: circles.saveCircle,
    countHangoutsForCircle: circles.countHangoutsForCircle,
    moveHangoutsAndDeleteCircle: circles.moveHangoutsAndDeleteCircle,

    listHangouts: hangouts.listHangouts,
    saveHangoutWithPhotos: saveHangout.saveHangoutWithPhotos,
    deleteHangout: saveHangout.deleteHangout,

    listPhotos: photos.listPhotos,
    listPhotosForDate: photos.listPhotosForDate,
    listLibraryPhotos: photos.listLibraryPhotos,
    countLibraryPhotos: photos.countLibraryPhotos,

    facesForMonth: profile.facesForMonth,
    countProfilePhotos: profile.countProfilePhotos,
    getDayFace: profile.getDayFace,
    setDayFace: profile.setDayFace,
    getProfileSettings: profile.getProfileSettings,
    saveProfileSettings: profile.saveProfileSettings,
}