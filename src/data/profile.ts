import { getDb } from './db';
import { photoFromRow, type PhotoRow } from './photos';
import { Photo, ProfileSettings } from './types';

// all photos taken on a given date, across every hangout that day
export async function listPhotosForDate(date: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT p.id, p.hangout_id, p.uri, p.thumb_uri, p.sort, p.updated_at
     FROM photos p
     JOIN hangouts h ON h.id = p.hangout_id
     WHERE h.date = ?
     ORDER BY p.sort`,
    [date]
  );
  return rows.map(photoFromRow);
}

// the chosen face photo per date, for a whole month -> { "2026-08-14": "<uri>" }
export async function faceUrisForMonth(month: string): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; uri: string }>(
    `SELECT f.date AS date, p.uri AS uri
     FROM day_faces f
     JOIN photos p ON p.id = f.photo_id
     WHERE f.date LIKE ?`,
    [`${month}%`]
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => { map[r.date] = r.uri; });
  return map;
}

// Count unique displayed photos across all dates, excluding missing photo records.
export async function countProfilePhotos(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT p.id) AS count
     FROM day_faces f
     JOIN photos p ON p.id = f.photo_id`
  );
  return row?.count ?? 0;
}

export async function setDayFace(date: string, photoId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO day_faces (date, photo_id, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET photo_id = excluded.photo_id, updated_at = excluded.updated_at`,
    [date, photoId, Date.now()]
  );
}

export async function getProfileSettings(): Promise<ProfileSettings> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT username, photo_uri
     FROM profile_settings
     WHERE id = 1`
  );

  return {
    username: row?.username ?? '',
    photoUri: row?.photo_uri ?? null,
  };
}

export async function saveProfileSettings(settings: ProfileSettings): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO profile_settings (id, username, photo_uri, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username = excluded.username,
       photo_uri = excluded.photo_uri,
       updated_at = excluded.updated_at`,
    [settings.username, settings.photoUri, Date.now()]
  );
}
