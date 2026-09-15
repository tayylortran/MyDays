import { preparePhoto } from '@/src/lib/preparePhoto';
import { supabase } from '@/src/lib/supabase';
import { File } from 'expo-file-system';
import type { Photo, LibraryPhotoOptions, LibraryPhotoPage } from '../types';

export type PhotoPaths = { storagePath: string; thumbStoragePath: string };
export type PhotoRow = {
  id: string; hangout_id: string; storage_path: string;
  thumb_storage_path: string | null; sort: number; updated_at: number;
};

const columns = 'id, hangout_id, storage_path, thumb_storage_path, sort, updated_at';
type DatedPhotoRow = PhotoRow & { hangouts: { date: string } };

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
    .select(columns)
    .eq('hangout_id', hangoutId).order('sort').order('id').returns<PhotoRow[]>();
  if (error) throw error;
  return photosFromRows(data);
}

export async function listPhotosForDate(date: string): Promise<Photo[]> {
  const rows: PhotoRow[] = [];
  while (true) {
    const { data, error, count } = await supabase.from('photos')
      .select(columns + ', hangouts!inner(date)', { count: 'exact' })
      .eq('hangouts.date', date).order('sort').order('id')
      .range(rows.length, rows.length + 499).returns<PhotoRow[]>();
    if (error) throw error;
    rows.push(...data);
    if (!data.length || (count !== null && rows.length >= count)) break;
  }
  return photosFromRows(rows);
}

export async function countLibraryPhotos(circleId?: string): Promise<number> {
  let query = supabase.from('photos').select('id, hangouts!inner(circle_id)', { count: 'exact', head: true });
  if (circleId !== undefined) query = query.eq('hangouts.circle_id', circleId);
  const { count, error } = await query;
  if (error) throw error;
  if (count === null) throw new Error('Could not count photos.');
  return count;
}

export async function listLibraryPhotos({ circleId, cursor, limit }: LibraryPhotoOptions): Promise<LibraryPhotoPage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Photo page size must be between 1 and 100.');
  let bookmark: { date: string; id: string; circleId: string | null } | undefined;
  if (cursor !== undefined) {
    try { bookmark = JSON.parse(cursor); } catch { throw new Error('Invalid photo cursor for this filter.'); }
    if (!bookmark || typeof bookmark.date !== 'string' || typeof bookmark.id !== 'string'
      || bookmark.circleId !== (circleId ?? null)) throw new Error('Invalid photo cursor for this filter.');
  }
  const rows: DatedPhotoRow[] = [];
  // Finish the cursor's day, then fetch older days. This avoids cross-table OR filters.
  for (const sameDay of bookmark ? [true, false] : [false]) {
    if (rows.length >= limit + 1) break;
    let query = supabase.from('photos').select(columns + ', hangouts!inner(date, circle_id)')
      .order('hangouts(date)', { ascending: false }).order('id', { ascending: false });
    if (circleId !== undefined) query = query.eq('hangouts.circle_id', circleId);
    if (bookmark) query = sameDay
      ? query.eq('hangouts.date', bookmark.date).lt('id', bookmark.id)
      : query.lt('hangouts.date', bookmark.date);
    const { data, error } = await query.limit(limit + 1 - rows.length).returns<DatedPhotoRow[]>();
    if (error) throw error;
    rows.push(...data);
  }
  const page = rows.slice(0, limit);
  const photos = await photosFromRows(page);
  const items = photos.map((photo, index) => ({ ...photo, date: page[index].hangouts.date }));
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > limit && last
    ? JSON.stringify({ date: last.date, id: last.id, circleId: circleId ?? null }) : null };
}

export async function photoFromRow(row: PhotoRow): Promise<Photo> {
  return (await photosFromRows([row]))[0];
}

export async function photosFromRows(rows: PhotoRow[]): Promise<Photo[]> {
  const photos: Photo[] = [];
  // Bound each signing request, including days containing many hangouts.
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const paths = batch.flatMap((row) => [row.storage_path, ...(row.thumb_storage_path ? [row.thumb_storage_path] : [])]);
    const { data, error } = await supabase.storage.from('photos').createSignedUrls(paths, 3600);
    if (error) throw error;
    const urls = new Map(data.map((item) => [item.path, item]));
    const signedUrl = (path: string) => {
      const item = urls.get(path);
      if (!item?.signedUrl || item.error) throw new Error(item?.error || 'Could not get a photo viewing URL.');
      return item.signedUrl;
    };
    for (const row of batch) {
      const uri = signedUrl(row.storage_path);
      // Stable across expiring tokens; scoped to the project, bucket and immutable path.
      const cacheKey = (path: string) => uri.split('/object/sign/')[0] + '/object/photos/' + path;
      photos.push({
        id: row.id, hangoutId: row.hangout_id, sort: row.sort, updatedAt: row.updated_at,
        uri, cacheKey: cacheKey(row.storage_path),
        ...(row.thumb_storage_path ? { thumbUri: signedUrl(row.thumb_storage_path), thumbCacheKey: cacheKey(row.thumb_storage_path) } : {}),
      });
    }
  }
  return photos;
}
