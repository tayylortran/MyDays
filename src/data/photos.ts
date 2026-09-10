import { getDb } from './db';
import {
  LibraryPhoto,
  LibraryPhotoOptions,
  LibraryPhotoPage,
  Photo,
} from './types';

export type PhotoRow = {
  id: string;
  hangout_id: string;
  uri: string;
  thumb_uri: string | null;
  sort: number;
  updated_at: number;
};

export function photoFromRow(row: PhotoRow): Photo {
  return {
    id: row.id,
    hangoutId: row.hangout_id,
    uri: row.uri,
    thumbUri: row.thumb_uri ?? undefined,
    sort: row.sort,
    updatedAt: row.updated_at,
  };
}

export async function listPhotos(hangoutId: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT id, hangout_id, uri, thumb_uri, sort, updated_at
     FROM photos WHERE hangout_id = ? ORDER BY sort, id`,
    [hangoutId]
  );
  return rows.map(photoFromRow);
}

type LibraryPhotoRow = PhotoRow & { date: string };

export async function countLibraryPhotos(circleId?: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM photos p
     JOIN hangouts h ON h.id = p.hangout_id
     ${circleId === undefined ? '' : 'WHERE h.circle_id = ?'}`,
    circleId === undefined ? [] : [circleId]
  );
  return row?.count ?? 0;
}

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
    .map((row) => ({ ...photoFromRow(row), date: row.date }));

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
