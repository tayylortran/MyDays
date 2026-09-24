import { RepositoryProvider } from '@/src/data/RepositoryProvider';
import {
  AuthProvider,
  useAuth,
} from '@/src/features/auth/AuthProvider';
import { CalendarMonthProvider } from '@/src/features/calendar/CalendarMonthProvider';
import { Stack, ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/src/theme/ThemeProvider';

function AppNavigator() {
  const { colors, mode } = useTheme();
  const navigationTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.text,
      notification: colors.accent,
    },
  };
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
        <ActivityIndicator size="large" color={colors.muted} />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={navigationTheme}>
    <RepositoryProvider key={user?.id ?? 'signed-out'}>
      <CalendarMonthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={user !== null}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="friends/[userId]" />
          </Stack.Protected>

          <Stack.Protected guard={user === null}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      </CalendarMonthProvider>
    </RepositoryProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
