import { useTheme } from '@/src/theme/ThemeProvider';
import { ChooseDayFaceModal } from '@/src/features/profile/ChooseDayFaceModal';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { ProfilePhotoGrid } from '@/src/features/profile/ProfilePhotoGrid';
import { ProfileSettingsModal } from '@/src/features/profile/ProfileSettingsModal';
import { SettingsModal } from '@/src/features/profile/SettingsModal';
import { ProfileLayout } from '@/src/features/profile/ProfileLayout';
import { useProfileScreen } from '@/src/features/profile/useProfileScreen';
import { useAuth } from '@/src/features/auth/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

export default function Profile() {
  const { colors } = useTheme();
  const profile = useProfileScreen();
  const { user } = useAuth();

  return (
    <ProfileLayout
      username={profile.username || 'Your name'} photoUri={profile.photoUri}
      onPressIdentity={profile.openProfileSettings}
      year={profile.year} month={profile.month} totalPhotos={profile.totalProfilePhotos}
      viewMode={profile.viewMode} onChangeView={profile.setViewMode} onPrev={profile.prev} onNext={profile.next}
      toolbar={
        <Pressable onPress={profile.openSettings} hitSlop={12}
          accessibilityRole="button" accessibilityLabel="Open settings">
          <Ionicons name="settings-outline" size={22} color={colors.text} />
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
        visible={profile.profileSettingsOpen}
        username={profile.draftUsername}
        email={user?.email ?? null}
        photoUri={profile.draftPhotoUri}
        onClose={profile.closeProfileSettings}
        onChangeUsername={profile.setDraftUsername}
        onPickPhoto={profile.pickProfilePhoto}
        onTakePhoto={profile.takeProfilePhoto}
        onRemovePhoto={profile.removeProfilePhoto}
        onSave={profile.saveProfileSettings}
      />
      <SettingsModal visible={profile.settingsOpen} onClose={profile.closeSettings} />
    </ProfileLayout>
  );
}
