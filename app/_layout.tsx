import { RepositoryProvider } from '@/src/data/RepositoryProvider';
import { CalendarMonthProvider } from '@/src/features/calendar/CalendarMonthProvider';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <CalendarMonthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CalendarMonthProvider>
    </RepositoryProvider>
  );
}
