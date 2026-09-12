import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { CirclesTestPanel } from '@/src/features/dev/CirclesTestPanel';
import { ChooseDayFaceModal } from '@/src/features/profile/ChooseDayFaceModal';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { ProfilePhotoGrid } from '@/src/features/profile/ProfilePhotoGrid';
import { ProfileSettingsModal } from '@/src/features/profile/ProfileSettingsModal';
import { ProfileViewSwitcher } from '@/src/features/profile/ProfileViewSwitcher';
import { useProfileScreen } from '@/src/features/profile/useProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

export default function Profile() {
  const profile = useProfileScreen();

  return (
    <View style={{ flex: 1, paddingTop: 54, paddingHorizontal: 8 }}>
      {__DEV__ && <CirclesTestPanel />}
      <View style={{ alignItems: 'flex-end', marginBottom: 12 }}>
        <Pressable onPress={profile.openSettings} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color="#333" />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 40,
        }}
      >
        {profile.photoUri ? (
          <Image
            source={{ uri: profile.photoUri }}
            style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#ddd' }}
          />
        ) : (
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: '#ddd',
            }}
          />
        )}

        <Text style={{ fontSize: 20, fontWeight: '600' }}>
          {profile.username || 'Your name'}
        </Text>
      </View>

      <MonthHeader
        month={profile.month}
        year={profile.year}
        subtitle={profile.totalProfilePhotos === null
          ? undefined
          : `${profile.totalProfilePhotos} ${profile.totalProfilePhotos === 1 ? 'photo' : 'photos'} total`}
        onPrev={profile.prev}
        onNext={profile.next}
      />
      <ProfileViewSwitcher
        viewMode={profile.viewMode}
        onChange={profile.setViewMode}
      />

      {profile.viewMode === 'calendar' ? (
        <ProfileCalendarGrid
          year={profile.year}
          month={profile.month}
          faces={profile.faces}
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
    </View>
  );
}
