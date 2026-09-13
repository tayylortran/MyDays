import { supabase } from '@/src/lib/supabase';
import type { Hangout } from '../types';

type HangoutRow = Omit<Hangout, 'circleId' | 'updatedAt'> & {
  circle_id: string;
  updated_at: number;
};

const columns = 'id, date, title, note, circle_id, updated_at';

function fromRow({ circle_id, updated_at, ...row }: HangoutRow): Hangout {
  return { ...row, circleId: circle_id, updatedAt: updated_at };
}

export async function listHangouts(month: string): Promise<Hangout[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month.startsWith('0000')) {
    throw new Error('Use a month in YYYY-MM format.');
  }
  const [year, number] = month.split('-').map(Number);
  const nextMonth = number === 12
    ? `${String(year + 1).padStart(4, '0')}-01`
    : `${String(year).padStart(4, '0')}-${String(number + 1).padStart(2, '0')}`;
  const hangouts: Hangout[] = [];

  // Fetch the full month even if it exceeds the API's response row limit.
  while (true) {
    const { data, error, count } = await supabase
      .from('hangouts')
      .select(columns, { count: 'exact' })
      .gte('date', `${month}-01`)
      .lt('date', `${nextMonth}-01`)
      .order('date')
      .order('id')
      .range(hangouts.length, hangouts.length + 499)
      .returns<HangoutRow[]>();

    if (error) throw error;
    hangouts.push(...data.map(fromRow));
    if (data.length === 0 || (count !== null && hangouts.length >= count)) return hangouts;
  }
}
