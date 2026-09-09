import { supabase } from '@/src/lib/supabase';

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

