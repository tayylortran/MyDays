export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISODate = (): string => toISODate(new Date());

export const monthKey = (isoDate: string): string => isoDate.slice(0, 7); // "YYYY-MM"

export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const pad = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(pad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISODate(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);   // ← fill out the last week
  return cells;
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WEEKDAYS = ['M','T','W','T','F','S','S'];