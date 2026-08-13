import { Image, ScrollView, View } from 'react-native';

type GridPhoto = {
  date: string;
  uri: string;
};

type ProfilePhotoGridProps = {
  photos: GridPhoto[];
};

export function ProfilePhotoGrid({ photos }: ProfilePhotoGridProps) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap'}}>
        {photos.map((photo) => (
          <View
            key={photo.date}
            style={{
              width: '33.333%',
            }}
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
          </View>
        ))}
      </View>
    </ScrollView>
  );
}