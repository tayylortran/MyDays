import { PhotoImage } from '@/src/components/PhotoImage';
import type { LibraryPhoto } from '@/src/data/types';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ProfilePhotoPreview } from './ProfilePhotoPreview';

type ProfilePhotoGridProps = {
  photos: Pick<LibraryPhoto, 'id' | 'date' | 'uri' | 'thumbUri' | 'cacheKey' | 'thumbCacheKey'>[];
};

export function ProfilePhotoGrid({ photos }: ProfilePhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ProfilePhotoGridProps['photos'][number] | null>(null);
  const sortedPhotos = [...photos].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {sortedPhotos.map((photo) => (
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

      <ProfilePhotoPreview photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </>
  );
}
