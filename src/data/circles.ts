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

export async function countHangoutsForCircle(circleId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM hangouts WHERE circle_id = ?`,
    [circleId]
  );
  return row?.count ?? 0;
}

export async function moveHangoutsAndDeleteCircle(
  circleId: string,
  destinationCircleId: string | null
): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    if (destinationCircleId) {
      await db.runAsync(
        `UPDATE hangouts SET circle_id = ?, updated_at = ? WHERE circle_id = ?`,
        [destinationCircleId, Date.now(), circleId]
      );
    }

    await db.runAsync(`DELETE FROM circles WHERE id = ?`, [circleId]);
  });
}
