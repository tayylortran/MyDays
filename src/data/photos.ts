import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { newId } from '../lib/id';
import { getDb } from './db';
import {
  LibraryPhoto,
  LibraryPhotoOptions,
  LibraryPhotoPage,
  Photo,
} from './types';

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
     FROM photos WHERE hangout_id = ? ORDER BY sort, id`,
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
  await db.runAsync(`DELETE FROM day_faces WHERE photo_id = ?`, [id]);
  await db.runAsync(`DELETE FROM photos WHERE id = ?`, [id]);
}

type LibraryPhotoRow = {
  id: string;
  hangout_id: string;
  uri: string;
  thumb_uri: string | null;
  sort: number;
  updated_at: number;
  date: string;
};

export async function listLibraryPhotos(
  options: LibraryPhotoOptions
): Promise<LibraryPhotoPage> {
  const { circleId, cursor, limit } = options;

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Photo page size must be between 1 and 100.');
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Only filter by circle when one was supplied.
  if (circleId !== undefined) {
    conditions.push('h.circle_id = ?');
    params.push(circleId);
  }

  // Continue after the last photo from the previous batch.
  if (cursor !== undefined) {
    const bookmark = JSON.parse(cursor);

    if (
      !bookmark ||
      typeof bookmark.date !== 'string' ||
      typeof bookmark.id !== 'string' ||
      bookmark.circleId !== (circleId ?? null)
    ) {
      throw new Error('Invalid photo cursor for this filter.');
    }

    conditions.push(`
      (
        h.date < ?
        OR (h.date = ? AND p.id < ?)
      )
    `);

    params.push(bookmark.date, bookmark.date, bookmark.id);
  }

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  // Fetch one extra row to find out whether another page exists.
  params.push(limit + 1);

  const db = await getDb();

  const rows = await db.getAllAsync<LibraryPhotoRow>(
    `
      SELECT
        p.id,
        p.hangout_id,
        p.uri,
        p.thumb_uri,
        p.sort,
        p.updated_at,
        h.date
      FROM photos p
      JOIN hangouts h ON h.id = p.hangout_id
      ${where}
      ORDER BY h.date DESC, p.id DESC
      LIMIT ?
    `,
    params
  );

  const hasMore = rows.length > limit;

  const items: LibraryPhoto[] = rows
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      hangoutId: row.hangout_id,
      uri: row.uri,
      thumbUri: row.thumb_uri ?? undefined,
      sort: row.sort,
      updatedAt: row.updated_at,
      date: row.date,
    }));

  const lastPhoto = items[items.length - 1];

  return {
    items,
    nextCursor:
      hasMore && lastPhoto
        ? JSON.stringify({
            date: lastPhoto.date,
            id: lastPhoto.id,
            circleId: circleId ?? null,
          })
        : null,
  };
}
