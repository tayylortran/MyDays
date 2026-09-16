import { supabase } from '@/src/lib/supabase';
import type { Circle } from '../types';

type CircleRow = Omit<Circle, 'updatedAt'> & { updated_at: number };

export async function listCircles(): Promise<Circle[]> {
  const { data, error } = await supabase
    .from('circles')
    .select('id, name, color, sort, updated_at')
    .order('sort')
    .order('id')
    .returns<CircleRow[]>();

  if (error) throw error;

  return data.map(({ updated_at, ...circle }) => ({
    ...circle,
    updatedAt: updated_at,
  }));
}

export async function saveCircle(circle: Circle): Promise<void> {
  // The database supplies user_id from the session and enforces ownership.
  const { error } = await supabase.from('circles').upsert({
    id: circle.id,
    name: circle.name,
    color: circle.color,
    sort: circle.sort,
    updated_at: circle.updatedAt,
  }, { onConflict: 'id' });

  if (error) throw error;
}

export async function countHangoutsForCircle(circleId: string): Promise<number> {
  const { count, error } = await supabase.from('hangouts')
    .select('id', { count: 'exact', head: true }).eq('circle_id', circleId);
  if (error) throw new Error(error.message);
  if (count === null) throw new Error('Could not count hangouts.');
  return count;
}

export async function moveHangoutsAndDeleteCircle(circleId: string, destinationCircleId: string | null): Promise<void> {
  if (circleId === destinationCircleId) throw new Error('Choose a different destination circle.');
  const unconfirmed = 'Could not confirm the circle change. Reconnect and reload your calendar before trying again.';
  let response;
  try {
    response = await supabase.rpc('move_hangouts_and_delete_circle', {
      p_circle_id: circleId, p_destination_id: destinationCircleId,
    });
  } catch { throw new Error(unconfirmed); }
  if (response.error) throw new Error(/^[0-9A-Z]{5}$/.test(response.error.code) ? response.error.message : unconfirmed);
}
