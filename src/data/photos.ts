import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { newId } from '../lib/id';
import { getDb } from './db';
import { Photo } from './types';

const PHOTO_DIR = new Directory(Paths.document, 'photos');

function ensureDir() {
  if (!PHOTO_DIR.exists) PHOTO_DIR.create({ intermediates: true });
}

// pickedUri = the temporary uri from the image picker
export async function addPhoto(hangoutId: string, pickedUri: string): Promise<Photo> {
  ensureDir();

  // downscale to keep files small (new context-based API)
  const context = ImageManipulator.ImageManipulator.manipulate(pickedUri);
  context.resize({ width: 1200 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  // copy into permanent storage under our own filename
  const id = newId();
  const dest = new File(PHOTO_DIR, id + '.jpg');
  new File(saved.uri).copy(dest);

  const db = await getDb();
  const now = Date.now();
  const sortRow = await db.getFirstAsync<any>(
    `SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM photos WHERE hangout_id = ?`,
    [hangoutId]
  );
  await db.runAsync(
    `INSERT INTO photos (id, hangout_id, uri, thumb_uri, sort, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, hangoutId, dest.uri, null, sortRow.next, now]
  );

  return { id, hangoutId, uri: dest.uri, sort: sortRow.next, updatedAt: now };
}

export async function listPhotos(hangoutId: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, hangout_id, uri, thumb_uri, sort, updated_at
     FROM photos WHERE hangout_id = ? ORDER BY sort`,
    [hangoutId]
  );
  return rows.map((r) => ({
    id: r.id,
    hangoutId: r.hangout_id,
    uri: r.uri,
    thumbUri: r.thumb_uri ?? undefined,
    sort: r.sort,
    updatedAt: r.updated_at,
  }));
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT uri FROM photos WHERE id = ?`, [id]);
    if (row?.uri) {
    try { new File(row.uri).delete(); } catch {}
  }

  await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
}
