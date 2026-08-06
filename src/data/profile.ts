import { getDb } from './db';
import { Photo } from './types';

// all photos taken on a given date, across every hangout that day
export async function listPhotosForDate(date: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT p.id, p.hangout_id, p.uri, p.thumb_uri, p.sort, p.updated_at
     FROM photos p
     JOIN hangouts h ON h.id = p.hangout_id
     WHERE h.date = ?
     ORDER BY p.sort`,
    [date]
  );
  return rows.map((r) => ({
    id: r.id, hangoutId: r.hangout_id, uri: r.uri,
    thumbUri: r.thumb_uri ?? undefined, sort: r.sort, updatedAt: r.updated_at,
  }));
}

// the chosen face photo per date, for a whole month -> { "2026-08-14": "<uri>" }
export async function faceUrisForMonth(month: string): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
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

export async function setDayFace(date: string, photoId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO day_faces (date, photo_id, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET photo_id = excluded.photo_id, updated_at = excluded.updated_at`,
    [date, photoId, Date.now()]
  );
}