import { Photo } from '@/src/data/types';
import { Image, Modal, Pressable, Text, View } from 'react-native';

type ChooseDayFaceModalProps = {
  openDate: string | null;
  dayPhotos: Photo[];
  onClose: () => void;
  onChooseFace: (photoId: string) => void;
};

export function ChooseDayFaceModal({
  openDate,
  dayPhotos,
  onClose,
  onChooseFace,
}: ChooseDayFaceModalProps) {
  return (
    <Modal visible={openDate !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose}>
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
          <Text style={{ fontSize: 12, color: '#888' }}>{openDate}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dayPhotos.map((p) => (
              <Pressable key={p.id} onPress={() => onChooseFace(p.id)}>
                <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: 8 }} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
