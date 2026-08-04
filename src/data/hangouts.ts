import { getDb } from './db';
import { Hangout } from './types';

export async function saveHangout(h: Hangout): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO hangouts (id, date, title, note, circle_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date,
       title = excluded.title,
       note = excluded.note,
       circle_id = excluded.circle_id,
       updated_at = excluded.updated_at`,
    [h.id, h.date, h.title, h.note, h.circleId, h.updatedAt]
  );
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

export async function deleteHangout(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM hangouts WHERE id = ?`, [id]);
}