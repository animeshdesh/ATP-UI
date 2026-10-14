const env = import.meta.env;

/**
 * `supabase`: real sign-in and the L2 API (default when Supabase is configured).
 * `mock`: in-memory auth and data (tests, or working without the backend).
 */
export const authMode: 'supabase' | 'mock' =
  env.VITE_AUTH === 'mock' || !env.VITE_SUPABASE_URL ? 'mock' : 'supabase';

export const config = {
  apiUrl: env.VITE_API_URL ?? 'http://localhost:4553',
  supabaseUrl: env.VITE_SUPABASE_URL ?? '',
  supabaseKey: env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
};
