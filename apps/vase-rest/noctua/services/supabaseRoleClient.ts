import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type PersistedAuth = {
  state?: {
    usuario?: {
      rol?: string;
      nombre?: string;
    } | null;
  };
};

function getPersistedNoctuaRole() {
  if (typeof window === 'undefined') return '';

  try {
    const raw = window.localStorage.getItem('noctua-auth');
    if (!raw) return '';

    const parsed = JSON.parse(raw) as PersistedAuth;
    return parsed.state?.usuario?.rol || '';
  } catch {
    return '';
  }
}

export function createSupabaseClientWithNoctuaRole() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-noctua-role': getPersistedNoctuaRole(),
      },
    },
  });
}
