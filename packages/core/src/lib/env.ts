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

/**
 * Sign-in options that need Supabase to deliver SMS or email. Off in deployed builds unless the
 * Pages variable is `true` (no SMS provider or SMTP yet); on in dev and tests.
 */
const flag = (v: string | undefined) => (v === undefined ? env.DEV : v === 'true');
export const features = {
  phoneAuth: flag(env.VITE_PHONE_AUTH),
  magicLink: flag(env.VITE_MAGIC_LINK),
};

/** Label and validation copy for the sign-in / invite contact field. */
export const contactField = features.phoneAuth
  ? { label: 'Phone or email', invalid: 'Enter a valid phone number or email.' }
  : { label: 'Email', invalid: 'Enter a valid email.' };
