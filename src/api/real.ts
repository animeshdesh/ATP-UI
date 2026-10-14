/* Real L2 (auth & RBAC): Supabase Auth for sign-in, the backend API for everything else. */
import type { AuthError } from '@supabase/supabase-js';
import type {
  Budgets,
  CreateFund,
  Fund,
  FundTopUp,
  SetBudgets,
  UpdateFund,
  DashboardData,
  DashboardQuery,
  Partner,
  PartnerShares,
  SetPartnerShares,
  SettlementPosition,
  SettlementSummary,
  Category,
  ClinicPerson,
  CreateRecurringItem,
  EntryDefaults,
  EntryType,
  NewTransaction,
  ReceiptLink,
  RecurringItem,
  Transaction,
  TransactionPage,
  TransactionQuery,
  UpdateRecurringItem,
  UpdateTransaction,
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

  // ── L3 ledger (docs/LEDGER.md) ─────────────────────────────
  getEntryDefaults: (): Promise<EntryDefaults> => unwrap(http.GET('/v1/transactions/defaults')),
  listPeople: (): Promise<ClinicPerson[]> => unwrap(http.GET('/v1/people')),
  listTransactions: (q: TransactionQuery = {}): Promise<TransactionPage> =>
    unwrap(http.GET('/v1/transactions', { params: { query: q } })),
  createTransaction: (input: NewTransaction): Promise<Transaction> =>
    unwrap(http.POST('/v1/transactions', { body: input })),
  updateTransaction: (id: string, patch: UpdateTransaction): Promise<Transaction> =>
    unwrap(http.PATCH('/v1/transactions/{id}', { params: { path: { id } }, body: patch })),
  deleteTransaction: async (id: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/transactions/{id}', { params: { path: { id } } }));
  },
  /** Raw image body; the API rejects > 5 MB with 413 payload_too_large. */
  uploadReceipt: async (id: string, file: Blob): Promise<void> => {
    await unwrap(
      http.PUT('/v1/transactions/{id}/receipt', {
        params: { path: { id } },
        body: file as unknown as string,
        bodySerializer: (b: unknown) => b as Blob,
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      }),
    );
  },
  getReceiptUrl: (id: string): Promise<ReceiptLink> =>
    unwrap(http.GET('/v1/transactions/{id}/receipt', { params: { path: { id } } })),
  deleteReceipt: async (id: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/transactions/{id}/receipt', { params: { path: { id } } }));
  },

  listCategories: (includeArchived = false): Promise<Category[]> =>
    unwrap(
      http.GET('/v1/categories', {
        params: { query: includeArchived ? { includeArchived: 'true' } : {} },
      }),
    ),
  createCategory: (type: EntryType, name: string): Promise<Category> =>
    unwrap(http.POST('/v1/categories', { body: { type, name } })),
  updateCategory: (id: string, patch: { name?: string; archived?: boolean }): Promise<Category> =>
    unwrap(http.PATCH('/v1/categories/{id}', { params: { path: { id } }, body: patch })),
  reorderCategories: (type: EntryType, ids: string[]): Promise<Category[]> =>
    unwrap(http.PUT('/v1/categories/order', { body: { type, ids } })),

  listRecurring: (month?: string): Promise<RecurringItem[]> =>
    unwrap(http.GET('/v1/recurring-items', { params: { query: month ? { month } : {} } })),
  createRecurring: (input: CreateRecurringItem): Promise<RecurringItem> =>
    unwrap(http.POST('/v1/recurring-items', { body: input })),
  updateRecurring: async (id: string, patch: UpdateRecurringItem): Promise<void> => {
    await unwrap(http.PATCH('/v1/recurring-items/{id}', { params: { path: { id } }, body: patch }));
  },

  // ── L4 settlement (docs/SETTLEMENT.md) ─────────────────────
  getSettlement: (to?: string): Promise<SettlementPosition> =>
    unwrap(http.GET('/v1/settlement', { params: { query: to ? { to } : {} } })),
  settle: (v: { to: string; fingerprint: string }): Promise<SettlementSummary> =>
    unwrap(http.POST('/v1/settlements', { body: v })),
  listSettlements: (): Promise<SettlementSummary[]> => unwrap(http.GET('/v1/settlements')),
  undoSettlement: async (id: string): Promise<void> => {
    await unwrap(http.DELETE('/v1/settlements/{id}', { params: { path: { id } } }));
  },
  getShares: (): Promise<PartnerShares> => unwrap(http.GET('/v1/partners/shares')),
  setShares: (v: SetPartnerShares): Promise<PartnerShares> =>
    unwrap(http.PUT('/v1/partners/shares', { body: v })),
  listPartners: (): Promise<Partner[]> => unwrap(http.GET('/v1/partners')),
  addPartner: (memberId: string): Promise<Partner> =>
    unwrap(http.POST('/v1/partners', { body: { memberId } })),

  // ── L5 dashboard (docs/DASHBOARD.md) ───────────────────────
  getDashboard: (q: DashboardQuery = {}): Promise<DashboardData> =>
    unwrap(http.GET('/v1/dashboard', { params: { query: q } })),

  // ── L6 budgets & funds (docs/BUDGETS.md) ───────────────────
  getBudgets: (month?: string): Promise<Budgets> =>
    unwrap(http.GET('/v1/budgets', { params: { query: month ? { month } : {} } })),
  setBudgets: (v: SetBudgets): Promise<Budgets> => unwrap(http.PUT('/v1/budgets', { body: v })),
  listFunds: (month?: string, includeArchived = false): Promise<Fund[]> =>
    unwrap(
      http.GET('/v1/funds', {
        params: {
          query: {
            ...(month ? { month } : {}),
            ...(includeArchived ? { includeArchived: 'true' as const } : {}),
          },
        },
      }),
    ),
  createFund: (v: CreateFund): Promise<Fund> => unwrap(http.POST('/v1/funds', { body: v })),
  updateFund: (id: string, v: UpdateFund): Promise<Fund> =>
    unwrap(http.PATCH('/v1/funds/{id}', { params: { path: { id } }, body: v })),
  topUpFund: (id: string, v: FundTopUp): Promise<Fund> =>
    unwrap(http.POST('/v1/funds/{id}/topups', { params: { path: { id } }, body: v })),
};
