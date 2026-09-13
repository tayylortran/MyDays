import { preparePhoto } from '@/src/lib/preparePhoto';
import { supabase } from '@/src/lib/supabase';
import { File } from 'expo-file-system';
import type { Photo } from '../types';

export type PhotoPaths = { storagePath: string; thumbStoragePath: string };
export type PhotoRow = {
  id: string; hangout_id: string; storage_path: string;
  thumb_storage_path: string | null; sort: number; updated_at: number;
};

// The caller supplies unique paths. Upload failure can leave unused remote files.
// Uploads never overwrite files or insert database rows.
export async function uploadPhotoFiles(uri: string, paths: PhotoPaths) {
  const { image, thumbnail } = await preparePhoto(uri);
  try {
    for (const file of [image, thumbnail]) {
      if (file.bytes <= 0 || file.bytes > 5 * 1024 * 1024) {
        throw new Error('Each prepared photo must be between 1 byte and 5 MB.');
      }
    }
    for (const [file, path] of [[image, paths.storagePath], [thumbnail, paths.thumbStoragePath]] as const) {
      const { error } = await supabase.storage.from('photos').upload(path, await new File(file.uri).arrayBuffer(), {
        contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
      });
      if (error) throw error;
    }
    return { imageBytes: image.bytes, thumbnailBytes: thumbnail.bytes };
  } finally {
    for (const file of [image, thumbnail]) {
      try { new File(file.uri).delete(); } catch { /* OS cache cleanup is the fallback. */ }
    }
  }
}

export async function listPhotos(hangoutId: string): Promise<Photo[]> {
  const { data, error } = await supabase.from('photos')
    .select('id, hangout_id, storage_path, thumb_storage_path, sort, updated_at')
    .eq('hangout_id', hangoutId).order('sort').order('id').returns<PhotoRow[]>();
  if (error) throw error;
  return Promise.all(data.map(photoFromRow));
}

export async function photoFromRow(row: PhotoRow): Promise<Photo> {
  const paths = [row.storage_path, ...(row.thumb_storage_path ? [row.thumb_storage_path] : [])];
  const { data, error: signingError } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
  if (signingError) throw signingError;
  const urls = new Map(data.map((item) => [item.path, item]));
  const signedUrl = (path: string) => {
    const item = urls.get(path);
    if (!item?.signedUrl || item.error) throw new Error(item?.error || 'Could not get a photo viewing URL.');
    return item.signedUrl;
  };
  const uri = signedUrl(row.storage_path);
  // Include the project/bucket and immutable path, but never the expiring token.
  const cacheKey = (path: string) => `${uri.split('/object/sign/')[0]}/object/${path}`;
  return {
    id: row.id, hangoutId: row.hangout_id, sort: row.sort, updatedAt: row.updated_at,
    uri, cacheKey: cacheKey(`photos/${row.storage_path}`),
    ...(row.thumb_storage_path ? {
      thumbUri: signedUrl(row.thumb_storage_path), thumbCacheKey: cacheKey(`photos/${row.thumb_storage_path}`),
    } : {}),
  };
}
