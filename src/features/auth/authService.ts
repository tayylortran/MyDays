import { supabase } from '@/src/lib/supabase';
import { AppState, Platform } from 'react-native';

// These are the possible results our screen understands.
type AuthResult =
  | { ok: true; status: 'signedIn' | 'confirmationRequired' }
  | { ok: false; message: string };

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    status: data.session ? 'signedIn' : 'confirmationRequired',
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, status: 'signedIn' };
}

// Only expose the user information our app needs.
export type AuthUser = {
  id: string;
  email: string | null;
};

export function watchAuth(
  onChange: (user: AuthUser | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;

    onChange(
      user
        ? { id: user.id, email: user.email ?? null }
        : null
    );
  });

  // Stops listening when the provider is removed.
  return () => data.subscription.unsubscribe();
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function manageAuthRefresh(): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  function updateRefresh(state: string) {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  }

  updateRefresh(AppState.currentState);

  const subscription = AppState.addEventListener(
    'change',
    updateRefresh
  );

  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}

