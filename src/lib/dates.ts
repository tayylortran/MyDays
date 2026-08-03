export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const todayISODate = (): string => toISODate(new Date());

export const monthKey = (isoDate: string): string => isoDate.slice(0, 7); // "YYYY-MM"