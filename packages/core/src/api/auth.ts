/* Sign-in and session (L2) shared by every app: Supabase Auth for credentials, /v1/me for the session. */
import type { AuthError } from '@supabase/supabase-js';
import type { ClinicPick, InvitePreview, RoleKey, Session } from '../types';
import { authMode, contactField } from '../lib/env';
import { supabase } from '../lib/supabase';
import { clinicChoice, http, unwrap } from './client';
import { ApiError, NetworkError } from './errors';
import { mockL2, setMockRole } from './mock/l2';
import { parseIdentifier, sessionFromMe } from './session';

function authError(e: AuthError): Error {
  if (e.name === 'AuthRetryableFetchError') return new NetworkError();
  if (e.code === 'invalid_credentials')
    return new ApiError(400, `Wrong ${contactField.label.toLowerCase()} or password.`, e.code);
  if (e.code === 'otp_disabled' || e.code === 'user_not_found')
    return new ApiError(400, 'No account uses this email. Ask an Owner for an invite.', e.code);
  return new ApiError(e.status ?? 400, e.message, e.code ?? 'auth_error');
}

/** Last good session per user, so the app opens offline or while the API restarts (F-08). */
const SESSION_CACHE = 'atp.session.cache';
const sessionCache = {
  read(userId: string): Session | null {
    try {
      const v = JSON.parse(localStorage.getItem(SESSION_CACHE) ?? 'null') as Session | null;
      return v?.user.key === userId ? v : null;
    } catch {
      return null;
    }
  },
  write(s: Session | ClinicPick) {
    try {
      if ('permissions' in s) localStorage.setItem(SESSION_CACHE, JSON.stringify(s));
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(SESSION_CACHE);
    } catch {
      /* storage unavailable */
    }
  },
};

async function getSession(): Promise<Session | ClinicPick | null> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) return null;
  try {
    const s = sessionFromMe(await unwrap(http.GET('/v1/me')));
    sessionCache.write(s);
    return s;
  } catch (e) {
    if (e instanceof NetworkError) {
      const cached = sessionCache.read(data.session.user.id);
      if (cached) return cached;
    }
    if (e instanceof ApiError && (e.status === 401 || e.code === 'no_clinic')) {
      sessionCache.clear();
      await supabase().auth.signOut();
      if (e.code === 'no_clinic')
        throw new ApiError(
          403,
          'Your access to this clinic has been turned off. Ask an Owner.',
          e.code,
        );
      return null;
    }
    throw e;
  }
}

async function signInWith(id: { email: string } | { phone: string }, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ ...id, password });
  if (error) throw authError(error);
}

async function requireSession(): Promise<Session | ClinicPick> {
  const s = await getSession();
  if (!s) throw new ApiError(401, 'Sign-in failed. Try again.', 'unauthorized');
  return s;
}

const realAuth = {
  getSession,

  async signIn(v: { identifier: string; password: string }): Promise<Session | ClinicPick> {
    const id = parseIdentifier(v.identifier);
    if (!id) throw new ApiError(400, contactField.invalid, 'bad_request');
    if (!v.password) throw new ApiError(400, 'Enter your password.', 'bad_request');
    await signInWith(id, v.password);
    return requireSession();
  },

  async signOut(): Promise<void> {
    clinicChoice.set(null);
    sessionCache.clear();
    await supabase().auth.signOut();
  },

  async sendMagicLink(email: string, redirectTo: string): Promise<void> {
    const id = parseIdentifier(email);
    if (!id || !('email' in id))
      throw new ApiError(400, 'Enter your email to get a magic link.', 'bad_request');
    const { error } = await supabase().auth.signInWithOtp({
      email: id.email,
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    });
    if (error) throw authError(error);
  },

  getInvite: (token: string): Promise<InvitePreview> =>
    unwrap(http.GET('/v1/public/invites/{token}', { params: { path: { token } } })),

  /** Accept, then sign in with the identifier the API returns (backend docs/AUTH.md, invite flow). */
  async acceptInvite(
    token: string,
    v: { fullName: string; password: string },
  ): Promise<Session | ClinicPick> {
    const accepted = await unwrap(
      http.POST('/v1/public/invites/{token}/accept', { params: { path: { token } }, body: v }),
    );
    const { data } = await supabase().auth.getSession();
    if (!data.session) {
      const id = accepted.signIn.email
        ? { email: accepted.signIn.email }
        : { phone: accepted.signIn.phone ?? '' };
      await signInWith(id, v.password);
    }
    clinicChoice.set(accepted.clinicId);
    return requireSession();
  },

  async chooseClinic(id: string): Promise<Session | ClinicPick | null> {
    clinicChoice.set(id);
    return getSession();
  },
};

const base =
  authMode === 'supabase'
    ? realAuth
    : {
        getSession: mockL2.getSession,
        signIn: mockL2.signIn,
        signOut: mockL2.signOut,
        sendMagicLink: mockL2.sendMagicLink,
        getInvite: mockL2.getInvite,
        acceptInvite: mockL2.acceptInvite,
        chooseClinic: mockL2.getSession,
      };

/** Keep the mocks' identity in step with whoever is signed in. */
const track = <T extends Session | ClinicPick | null>(s: T): T => {
  if (s && 'role' in s) setMockRole(s.role);
  return s;
};

/** Real API in supabase mode, else the in-memory mock (tests, or no backend; D-012). */
export const auth = {
  getSession: async () => track(await base.getSession()),
  signIn: async (v: { identifier: string; password: string; devRole?: RoleKey }) =>
    track(await base.signIn(v)),
  acceptInvite: async (token: string, v: { fullName: string; password: string }) =>
    track(await base.acceptInvite(token, v)),
  chooseClinic: async (id: string) => track(await base.chooseClinic(id)),
  signOut: async () => {
    await base.signOut();
    setMockRole(null);
  },
  sendMagicLink: (email: string, redirectTo: string): Promise<void> =>
    base.sendMagicLink(email, redirectTo),
  getInvite: (token: string): Promise<InvitePreview> => base.getInvite(token),
};
