import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

const KEEP_KEY = 'atp.keepSignedIn';

/** "Keep me signed in on this device": tokens live in localStorage, else only for this tab. */
export const keepSignedIn = {
  get: (): boolean => {
    try {
      return localStorage.getItem(KEEP_KEY) !== 'false';
    } catch {
      return true;
    }
  },
  set: (keep: boolean) => {
    try {
      localStorage.setItem(KEEP_KEY, String(keep));
    } catch {
      /* storage unavailable */
    }
  },
};

const authStorage = {
  getItem: (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    (keepSignedIn.get() ? localStorage : sessionStorage).setItem(k, v);
    (keepSignedIn.get() ? sessionStorage : localStorage).removeItem(k);
  },
  removeItem: (k: string) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  },
};

let client: SupabaseClient | null = null;

/** Supabase is used for auth only (D-002): sign-in, magic link, token refresh. */
export function supabase(): SupabaseClient {
  client ??= createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
    },
  });
  return client;
}
