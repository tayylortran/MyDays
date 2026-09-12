import type { Photo } from '@/src/data/types';
import { Image, type ImageProps } from 'expo-image';

type Props = Omit<ImageProps, 'source'> & {
  photo: Pick<Photo, 'uri' | 'thumbUri' | 'cacheKey' | 'thumbCacheKey'>;
  thumbnail?: boolean;
};

export function PhotoImage({ photo, thumbnail = false, ...props }: Props) {
  const useThumb = thumbnail && !!photo.thumbUri;
  const uri = useThumb ? photo.thumbUri! : photo.uri;
  const cacheKey = (useThumb ? photo.thumbCacheKey : photo.cacheKey) ?? uri;
  return <Image {...props} source={{ uri, cacheKey }} cachePolicy="disk" recyclingKey={cacheKey} />;
}
