import type { ThemeColors } from '@/src/theme/palette';
import { useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { Text, TextInput } from '@/src/theme/primitives';
import { signIn, signUp } from '@/src/features/auth/authService';
import { useState } from 'react';
import { Button, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,  } from 'react-native';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  // These hold what the user types while this screen is open.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [username, setUsername] = useState('');

  async function handleSubmit(action: 'signIn' | 'signUp') {
  if (loading) return;

  if (!email.trim() || !password) {
    setMessage('Please enter your email and password.');
    return;
  }

  setLoading(true);
  setMessage('Please wait...');

  try {
    const result =
      action === 'signIn'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, username);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    if (result.status === 'confirmationRequired') {
      setMessage('Check your email to confirm your account.');
      return;
    }

    setMessage(
      action === 'signIn'
        ? 'Signed in successfully!'
        : 'Account created! You are signed in.'
    );
    setPassword('');
  } catch {
    setMessage('Unable to complete the request. Please try again.');
  } finally {
    setLoading(false);
  }
}

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome to MyDays</Text>
        <Text>{mode === 'signUp' ? 'Create your account.' : 'Sign in to your account.'}</Text>

        {mode === 'signUp' && (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              accessibilityLabel="Username"
              placeholder="Choose a username"
              placeholderTextColor={colors.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              editable={!loading}
            />
            <Text>3–30 letters, numbers, underscores, or periods. You can change it in Settings.</Text>
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Email"
          placeholder="you@example.com"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Password"
          placeholder="Enter your password"
          placeholderTextColor={colors.muted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Button
          title={mode === 'signIn' ? 'Sign in' : 'Create account'}
          disabled={loading}
          onPress={() => handleSubmit(mode)}
        />

        <Button
          title={mode === 'signIn' ? 'Create an account' : 'Already have an account? Sign in'}
          disabled={loading}
          onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setMessage('');
          }}
        />

        <Text accessibilityLiveRegion="polite">{message}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  form: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 64,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
});
