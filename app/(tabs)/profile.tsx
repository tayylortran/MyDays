import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { ChooseDayFaceModal } from '@/src/features/profile/ChooseDayFaceModal';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { useProfileScreen } from '@/src/features/profile/useProfileScreen';
import { Text, View } from 'react-native';

export default function Profile() {
  const profile = useProfileScreen();

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 8 }}>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 60,
        }}
      >
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: '#ddd',
          }}
        />

        <Text style={{ fontSize: 20, fontWeight: '600' }}>
          Profile user
        </Text>
      </View>

      <MonthHeader
        month={profile.month}
        year={profile.year}
        onPrev={profile.prev}
        onNext={profile.next}
      />

      <ProfileCalendarGrid
        year={profile.year}
        month={profile.month}
        faces={profile.faces}
        onPressDay={profile.openDay}
      />

      <ChooseDayFaceModal
        openDate={profile.openDate}
        dayPhotos={profile.dayPhotos}
        onClose={profile.closeDay}
        onChooseFace={profile.chooseFace}
      />
    </View>
  );
}
