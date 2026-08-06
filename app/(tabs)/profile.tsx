import { MonthHeader } from '@/src/features/calendar/MonthHeader';
import { ProfileCalendarGrid } from '@/src/features/profile/ProfileCalendarGrid';
import { useProfileScreen } from '@/src/features/profile/useProfileScreen';
import { Image, Modal, Pressable, Text, View } from 'react-native';

export default function Profile() {
  const profile = useProfileScreen();

  return (
    <View style={{ flex: 1, paddingTop: 70, paddingHorizontal: 12 }}>
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

      <Modal visible={profile.openDate !== null} transparent animationType="slide" onRequestClose={profile.closeDay}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={profile.closeDay}>
          <Pressable
            onPress={() => {}}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 34,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Pick this day's photo</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{profile.openDate}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.dayPhotos.map((p) => (
                <Pressable key={p.id} onPress={() => profile.chooseFace(p.id)}>
                  <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: 8 }} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
