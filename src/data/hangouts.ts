import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { newId } from '../lib/id';
import { preparePhoto } from '../lib/preparePhoto';
import { getDb } from './db';
import { photoFromRow, type PhotoRow } from './photos';
import { MAX_HANGOUT_PHOTOS, type Hangout, type Photo, type SaveHangoutInput, type SavedHangout } from './types';

const photoDirectory = new Directory(Paths.document, 'photos');

async function transaction(db: SQLiteDatabase, task: (tx: SQLiteDatabase) => Promise<void>) {
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => task(db));
  } else {
    await db.withExclusiveTransactionAsync(task);
  }
}

// Deletions are recorded with the database changes, then retried on later saves.
async function enqueueCleanup(db: SQLiteDatabase, uris: string[]) {
  for (const uri of new Set(uris)) {
    await db.runAsync('INSERT OR IGNORE INTO pending_photo_deletions (uri) VALUES (?)', [uri]);
  }
}

export async function flushPhotoCleanup() {
  try {
    const db = await getDb();
    const pending = await db.getAllAsync<{ uri: string }>('SELECT uri FROM pending_photo_deletions');
    for (const { uri } of pending) {
      try {
        // Only remove files managed by the photo library.
        if (!uri.startsWith(`${photoDirectory.uri.replace(/\/$/, '')}/`)) continue;
        const referenced = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) AS count FROM photos WHERE uri = ? OR thumb_uri = ?', [uri, uri]
        );
        if (!referenced?.count) {
          const file = new File(uri);
          if (file.exists) file.delete();
        }
        await db.runAsync('DELETE FROM pending_photo_deletions WHERE uri = ?', [uri]);
      } catch {
        // Leave this entry queued if the OS cannot remove the file yet.
      }
    }
  } catch {
    // Cleanup failure must not report a successfully committed save as failed.
  }
}

export async function saveHangoutWithPhotos(input: SaveHangoutInput): Promise<SavedHangout> {
  const { hangout, photos, mode } = input;
  if (!hangout.title.trim() || !hangout.circleId) throw new Error('Add a title and choose a circle.');
  if (photos.length > MAX_HANGOUT_PHOTOS) throw new Error(`Choose up to ${MAX_HANGOUT_PHOTOS} photos.`);
  if (new Set(photos.map((p) => p.id)).size !== photos.length) throw new Error('Duplicate photo in draft.');

  const db = await getDb();
  const staged: Photo[] = [];
  const createdUris: string[] = [];
  const saved: SavedHangout = {
    hangout: { ...hangout, title: hangout.title.trim(), note: hangout.note.trim(), updatedAt: Date.now() },
    photos: [],
  };

  try {
    if (!photoDirectory.exists) photoDirectory.create({ intermediates: true });
    // Prepare files before opening a database transaction. No saved data changes yet.
    for (const photo of photos) {
      if (photo.kind !== 'new') continue;
      const prepared = await preparePhoto(photo.uri);
      const filename = `${photo.id}-${newId()}`;
      const destination = new File(photoDirectory, `${filename}.jpg`);
      const thumbnail = new File(photoDirectory, `${filename}-thumb.jpg`);
      createdUris.push(destination.uri, thumbnail.uri);
      try {
        new File(prepared.image.uri).copy(destination);
        new File(prepared.thumbnail.uri).copy(thumbnail);
      } finally {
        for (const output of [prepared.image, prepared.thumbnail]) {
          try { new File(output.uri).delete(); } catch { /* Temporary files remain in the OS cache. */ }
        }
      }
      if (__DEV__) console.info('[Photo sizes]', { imageKB: Math.round(prepared.image.bytes / 1024), thumbnailKB: Math.round(prepared.thumbnail.bytes / 1024) });
      staged.push({ id: photo.id, hangoutId: hangout.id, uri: destination.uri, thumbUri: thumbnail.uri, sort: 0, updatedAt: saved.hangout.updatedAt });
    }

    await transaction(db, async (tx) => {
      const current = await tx.getFirstAsync<{ date: string }>('SELECT date FROM hangouts WHERE id = ?', [hangout.id]);
      if (mode === 'edit' && !current) throw new Error('This hangout no longer exists.');
      if (mode === 'create' && current) throw new Error('This hangout already exists. Reopen it to edit.');
      if (current && current.date !== hangout.date) throw new Error('The hangout date cannot be changed.');
      const previous = await tx.getAllAsync<PhotoRow>('SELECT * FROM photos WHERE hangout_id = ? ORDER BY sort, id', [hangout.id]);
      const retainedIds = new Set(photos.filter((p) => p.kind === 'existing').map((p) => p.id));
      if ([...retainedIds].some((id) => !previous.some((p) => p.id === id))) {
        throw new Error('A selected photo no longer belongs to this hangout. Reopen it to edit.');
      }
      await tx.runAsync(
        `INSERT INTO hangouts (id, date, title, note, circle_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, note = excluded.note,
         circle_id = excluded.circle_id, updated_at = excluded.updated_at`,
        [hangout.id, hangout.date, saved.hangout.title, saved.hangout.note, hangout.circleId, saved.hangout.updatedAt]
      );
      for (const photo of previous) {
        if (retainedIds.has(photo.id)) continue;
        await tx.runAsync('DELETE FROM day_faces WHERE photo_id = ?', [photo.id]);
        await tx.runAsync('DELETE FROM photos WHERE id = ?', [photo.id]);
        await enqueueCleanup(tx, [photo.uri, ...(photo.thumb_uri ? [photo.thumb_uri] : [])]);
      }
      // Existing photos keep their relative order; new photos append in selection order.
      const ordered = [
        ...previous.filter((p) => retainedIds.has(p.id)).map(photoFromRow),
        ...staged,
      ];
      for (const [sort, photo] of ordered.entries()) {
        if (retainedIds.has(photo.id)) {
          await tx.runAsync('UPDATE photos SET sort = ? WHERE id = ? AND hangout_id = ?', [sort, photo.id, hangout.id]);
        } else {
          await tx.runAsync(
            'INSERT INTO photos (id, hangout_id, uri, thumb_uri, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [photo.id, hangout.id, photo.uri, photo.thumbUri ?? null, sort, photo.updatedAt]
          );
        }
        saved.photos.push({ ...photo, sort });
      }
    });
  } catch (error) {
    // New files are never allowed to replace existing photos before commit.
    try { await enqueueCleanup(db, createdUris); } catch { /* Attempt direct cleanup as a fallback. */ }
    for (const uri of createdUris) {
      try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Retried from queue. */ }
    }
    await flushPhotoCleanup();
    throw error;
  }
  await flushPhotoCleanup();
  return saved;
}

export async function deleteHangout(id: string): Promise<void> {
  const db = await getDb();
  await transaction(db, async (tx) => {
    const photos = await tx.getAllAsync<PhotoRow>('SELECT * FROM photos WHERE hangout_id = ?', [id]);
    await enqueueCleanup(tx, photos.flatMap((p) => [p.uri, ...(p.thumb_uri ? [p.thumb_uri] : [])]));
    await tx.runAsync('DELETE FROM day_faces WHERE photo_id IN (SELECT id FROM photos WHERE hangout_id = ?)', [id]);
    await tx.runAsync('DELETE FROM photos WHERE hangout_id = ?', [id]);
    await tx.runAsync('DELETE FROM hangouts WHERE id = ?', [id]);
  });
  await flushPhotoCleanup();
}

export async function listHangouts(month: string): Promise<Hangout[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, date, title, note, circle_id, updated_at
     FROM hangouts
     WHERE date LIKE ?
     ORDER BY date`,
    [`${month}%`]
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: r.title,
    note: r.note,
    circleId: r.circle_id,
    updatedAt: r.updated_at,
  }));
}
