import { useState } from 'react';
import { Button, Text, View } from 'react-native';
import { signOut } from './authService';

export default function SignOutButton() {
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
    <View>
      <Button
        title={loading ? 'Signing out...' : 'Sign out'}
        disabled={loading}
        onPress={handleSignOut}
      />
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}