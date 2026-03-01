import { getSupabase } from '../data/supabase-client.js';

export async function signInWithGitHub() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) console.error('Sign in error:', error);
}

export async function signOut() {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Sign out error:', error);
}

export async function getSession() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(_event, session);
  });
}
