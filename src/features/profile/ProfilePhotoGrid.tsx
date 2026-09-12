import { PhotoImage } from '@/src/components/PhotoImage';
import type { LibraryPhoto } from '@/src/data/types';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

type ProfilePhotoGridProps = {
  photos: LibraryPhoto[];
};

export function ProfilePhotoGrid({ photos }: ProfilePhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<LibraryPhoto | null>(null);

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {photos.map((photo) => (
            <Pressable
              key={photo.date}
              accessibilityLabel={`View photo from ${photo.date}`}
              accessibilityRole="button"
              onPress={() => setSelectedPhoto(photo)}
              style={{ width: '33%' }}
            >
              <PhotoImage
                photo={photo}
                thumbnail
                style={{
                  width: '100%',
                  aspectRatio: 0.8,
                  backgroundColor: '#eee',
                }}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <Pressable
          accessibilityLabel="Close photo preview"
          onPress={() => setSelectedPhoto(null)}
          style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.88)', padding: 20 }}
        >
          <Pressable onPress={() => {}} style={{ width: '100%', height: '80%' }}>
            {selectedPhoto && (
              <PhotoImage
                photo={selectedPhoto}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
