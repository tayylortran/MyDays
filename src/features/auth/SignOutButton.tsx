import { useTheme } from '@/src/theme/ThemeProvider';
import { Text } from '@/src/theme/primitives';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { signOut } from './authService';

export default function SignOutButton() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOut() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      await signOut();
    } catch {
      setError('Could not sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={handleSignOut}
        style={({ pressed }) => ({
          minHeight: 44,
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: 10,
          backgroundColor: pressed ? colors.surfaceAlt : colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>
          {loading ? 'Signing out...' : 'Sign out'}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, fontSize: 13 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
