import { RepositoryProvider } from '@/src/data/RepositoryProvider';
import {
  AuthProvider,
  useAuth,
} from '@/src/features/auth/AuthProvider';
import { CalendarMonthProvider } from '@/src/features/calendar/CalendarMonthProvider';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <RepositoryProvider key={user?.id ?? 'signed-out'}>
      <CalendarMonthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={user !== null}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>

          <Stack.Protected guard={user === null}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </CalendarMonthProvider>
    </RepositoryProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
