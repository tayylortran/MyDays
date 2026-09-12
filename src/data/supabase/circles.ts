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
