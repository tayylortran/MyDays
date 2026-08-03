import { getDb } from './db';
import { Circle } from './types';

export async function saveCircle(c: Circle): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO circles (id, name, color, sort, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       color = excluded.color,
       sort = excluded.sort,
       updated_at = excluded.updated_at`,
    [c.id, c.name, c.color, c.sort, c.updatedAt]
  );
}

export async function listCircles(): Promise<Circle[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, color, sort, updated_at FROM circles ORDER BY sort`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    sort: r.sort,
    updatedAt: r.updated_at,
  }));
}

export async function nextCircleSort(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT COALESCE(MAX(sort), -1) + 1 AS next FROM circles`
  );
  return row.next;
}