import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';

type GridPhoto = {
  date: string;
  uri: string;
};

type ProfilePhotoGridProps = {
  photos: GridPhoto[];
};

export function ProfilePhotoGrid({ photos }: ProfilePhotoGridProps) {
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {photos.map((photo) => (
            <Pressable
              key={photo.date}
              accessibilityLabel={`View photo from ${photo.date}`}
              accessibilityRole="button"
              onPress={() => setSelectedPhotoUri(photo.uri)}
              style={{ width: '33%' }}
            >
              <Image
                source={{ uri: photo.uri }}
                style={{
                  width: '100%',
                  aspectRatio: 0.8,
                  backgroundColor: '#eee',
                }}
                resizeMode="cover"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedPhotoUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoUri(null)}
      >
        <Pressable
          accessibilityLabel="Close photo preview"
          onPress={() => setSelectedPhotoUri(null)}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.88)', padding: 20 }}
        >
          <Pressable onPress={() => {}} style={{ width: '100%', height: '80%' }}>
            {selectedPhotoUri && (
              <Image
                source={{ uri: selectedPhotoUri }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
