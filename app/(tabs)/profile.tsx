import { ChooseDayFaceModal } from '@/src/features/profile/ChooseDayFaceModal';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { ProfilePhotoGrid } from '@/src/features/profile/ProfilePhotoGrid';
import { ProfileSettingsModal } from '@/src/features/profile/ProfileSettingsModal';
import { ProfileLayout } from '@/src/features/profile/ProfileLayout';
import { useProfileScreen } from '@/src/features/profile/useProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

export default function Profile() {
  const profile = useProfileScreen();

  return (
    <ProfileLayout
      username={profile.username || 'Your name'} photoUri={profile.photoUri}
      year={profile.year} month={profile.month} totalPhotos={profile.totalProfilePhotos}
      viewMode={profile.viewMode} onChangeView={profile.setViewMode} onPrev={profile.prev} onNext={profile.next}
      toolbar={
        <Pressable onPress={profile.openSettings} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color="#333" />
        </Pressable>
      }
    >

      {profile.viewMode === 'calendar' ? (
        <ProfileCalendarGrid
          year={profile.year}
          month={profile.month}
          faces={profile.faces}
          photoDates={profile.photoDates}
          onPressDay={profile.openDay}
        />
      ) : (
        <View style={{ flex: 1, marginHorizontal: -8 }}>
          <ProfilePhotoGrid photos={profile.gridPhotos} />
        </View>
    )}

      <ChooseDayFaceModal
        openDate={profile.openDate}
        dayPhotos={profile.dayPhotos}
        selectedPhotoId={profile.selectedPhotoId}
        currentPhotoId={profile.currentPhotoId}
        onSelectPhoto={profile.setSelectedPhotoId}
        saving={profile.savingPhoto}
        error={profile.photoError}
        onClose={profile.closeDay}
        onChooseFace={profile.chooseFace}
      />

      <ProfileSettingsModal
        visible={profile.settingsOpen}
        username={profile.draftUsername}
        photoUri={profile.draftPhotoUri}
        onClose={profile.closeSettings}
        onChangeUsername={profile.setDraftUsername}
        onPickPhoto={profile.pickProfilePhoto}
        onRemovePhoto={profile.removeProfilePhoto}
        onSave={profile.saveSettings}
      />
    </ProfileLayout>
  );
}
