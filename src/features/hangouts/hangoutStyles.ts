import { Platform } from 'react-native';

export const hangoutSerif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export function hangoutDate(date: string, long = false) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: long ? 'long' : 'short', month: long ? 'long' : 'short', day: 'numeric',
    ...(long ? { year: 'numeric' as const } : {}),
  });
}

export function circleTint(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}22` : '#f4f2ee';
}
