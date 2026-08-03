import { RepositoryProvider } from '@/src/data/RepositoryProvider';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <RepositoryProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RepositoryProvider>
  );
}