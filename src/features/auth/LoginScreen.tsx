import { signIn, signUp } from '@/src/features/auth/authService';
import { useState } from 'react';
import {
    Button,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from 'react-native';

export default function LoginScreen() {
  // These hold what the user types while this screen is open.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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
        : await signUp(email.trim(), password);

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
        <Text>Sign in or create an account.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Email"
          placeholder="you@example.com"
          placeholderTextColor="#777"
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
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Button
          title="Sign in"
          disabled={loading}
          onPress={() => handleSubmit('signIn')}
        />

        <Button
          title="Create account"
          disabled={loading}
          onPress={() => handleSubmit('signUp')}
        />

        <Text accessibilityLiveRegion="polite">{message}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
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
    color: '#111',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#111',
  },
});