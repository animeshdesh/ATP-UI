/* Real L2 (auth & RBAC): Supabase Auth for sign-in, the backend API for everything else. */
import type { AuthError } from '@supabase/supabase-js';
import type {
  AuditPage,
  ClinicPick,
  CreateInvite,
  CreatedInvite,
  Invite,
  InvitePreview,
  Member,
  PermissionDef,
  Role,
  Scope,
  Session,
} from '@/domain/types';
import { supabase } from '@/lib/supabase';
import { clinicChoice, http, unwrap } from './client';
import { ApiError, NetworkError } from './errors';
import { parseIdentifier, sessionFromMe } from './session';

function authError(e: AuthError): Error {
  if (e.name === 'AuthRetryableFetchError') return new NetworkError();
  if (e.code === 'invalid_credentials')
    return new ApiError(400, 'Wrong phone, email or password.', e.code);
  if (e.code === 'otp_disabled' || e.code === 'user_not_found')
    return new ApiError(400, 'No account uses this email. Ask an Owner for an invite.', e.code);
  return new ApiError(e.status ?? 400, e.message, e.code ?? 'auth_error');
}

async function getSession(): Promise<Session | ClinicPick | null> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) return null;
  try {
    return sessionFromMe(await unwrap(http.GET('/v1/me')));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.code === 'no_clinic')) {
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

export const realL2 = {
  getSession,

  async signIn(v: { identifier: string; password: string }): Promise<Session | ClinicPick> {
    const id = parseIdentifier(v.identifier);
    if (!id) throw new ApiError(400, 'Enter a valid phone number or email.', 'bad_request');
    if (!v.password) throw new ApiError(400, 'Enter your password.', 'bad_request');
    await signInWith(id, v.password);
    return requireSession();
  },

  async signOut(): Promise<void> {
    clinicChoice.set(null);
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

  listPermissions: (): Promise<PermissionDef[]> => unwrap(http.GET('/v1/permissions')),
  listRoles: (): Promise<Role[]> => unwrap(http.GET('/v1/roles')),
  createRole: (name: string): Promise<Role> =>
    unwrap(http.POST('/v1/roles', { body: { name, description: '', permissions: {} } })),
  updateRolePermissions: (roleId: string, permissions: Record<string, Scope>): Promise<Role> =>
    unwrap(
      http.PATCH('/v1/roles/{id}', { params: { path: { id: roleId } }, body: { permissions } }),
    ),

  listMembers: (): Promise<Member[]> => unwrap(http.GET('/v1/members')),
  setMemberActive: (memberId: string, active: boolean): Promise<Member> =>
    unwrap(
      active
        ? http.POST('/v1/members/{id}/reactivate', { params: { path: { id: memberId } } })
        : http.POST('/v1/members/{id}/deactivate', { params: { path: { id: memberId } } }),
    ),
  listInvites: (): Promise<Invite[]> => unwrap(http.GET('/v1/invites')),
  createInvite: (input: CreateInvite): Promise<CreatedInvite> =>
    unwrap(http.POST('/v1/invites', { body: input })),
  revokeInvite: async (id: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/invites/{id}', { params: { path: { id } } }));
  },

  listAudit: (q: { table?: string; cursor?: string; limit?: number }): Promise<AuditPage> =>
    unwrap(http.GET('/v1/audit', { params: { query: q } })),
};
