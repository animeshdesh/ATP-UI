/*
 * In-memory L2 (auth & RBAC) with the contract's response shapes, for `VITE_AUTH=mock` and tests.
 * Mirrors backend docs/AUTH.md: catalog × roles matrix, members, invites, raw audit rows.
 */
import type {
  AuditPage,
  AuditRow,
  CreateInvite,
  CreatedInvite,
  Invite,
  InvitePreview,
  Member,
  PermissionDef,
  PermissionKey,
  Role,
  RoleKey,
  Scope,
  Session,
} from '../../types';
import { ApiError } from '../errors';
import { initials, shortName } from '../session';
import { PEOPLE, ROLE_LABEL, USER_FOR_ROLE } from './people';

const SESSION_KEY = 'atp.mock.session';
const CLINIC = { id: '00000000-0000-4000-8000-000000000001', name: 'ATP Rehab' };

const P = (
  key: PermissionKey,
  label: string,
  supportsOwn: boolean,
  release: PermissionDef['release'] = 'v1',
): PermissionDef => ({ key, label, supportsOwn, release, module: key.split('.')[0]! });

export const CATALOG: PermissionDef[] = [
  P('finance.entry.create', 'Log income & expenses', true),
  P('finance.entry.view', 'View entries', true),
  P('finance.entry.edit_own', 'Edit own entries (7 days)', true),
  P('finance.entry.edit_any', 'Edit any entry', false),
  P('finance.report.view', 'Dashboard & CA report', false),
  P('finance.settlement.manage', 'Partner settlement', false),
  P('finance.budget.manage', 'Budgets & funds', false),
  P('settings.categories.manage', 'Manage categories', false),
  P('settings.users.invite', 'Invite users', false),
  P('settings.roles.manage', 'Edit roles', false),
  P('audit.view', 'View audit log', false),
  P('appointments.manage', 'Appointments', true, 'v2'),
  P('patients.view', 'Patient records', true, 'v2'),
  P('patients.manage', 'Manage patients & requests', true, 'v2'),
  P('patients.clinical', 'Clinical notes', true, 'v2'),
  P('settings.branches.manage', 'Manage branches', false, 'v2'),
  P('inventory.manage', 'Inventory', false, 'v3'),
];

const all = Object.fromEntries(CATALOG.map((p) => [p.key, 'all'])) as Record<string, 'all'>;

const seedRoles = (): Role[] => [
  {
    id: 'role-owner',
    name: 'Owner',
    description: 'Clinic partners. Full access.',
    isSystem: true,
    memberCount: 4,
    permissions: { ...all },
  },
  {
    id: 'role-therapist',
    name: 'Therapist',
    description: 'Physiotherapist.',
    isSystem: true,
    memberCount: 1,
    permissions: {
      'finance.entry.create': 'own',
      'finance.entry.view': 'own',
      'finance.entry.edit_own': 'own',
      'appointments.manage': 'own',
      'patients.view': 'own',
      'patients.manage': 'own',
      'patients.clinical': 'own',
    },
  },
  {
    id: 'role-frontdesk',
    name: 'Front desk',
    description: 'Receptionist or admin.',
    isSystem: true,
    memberCount: 1,
    permissions: {
      'finance.entry.create': 'own',
      'finance.entry.view': 'own',
      'finance.entry.edit_own': 'own',
      'appointments.manage': 'all',
      'patients.view': 'all',
      'patients.manage': 'all',
    },
  },
  {
    id: 'role-ca',
    name: 'CA (read-only)',
    description: 'Chartered accountant. Reads entries, reports and audit log.',
    isSystem: true,
    memberCount: 1,
    permissions: { 'finance.entry.view': 'all', 'finance.report.view': 'all', 'audit.view': 'all' },
  },
];

const ROLE_ID: Record<RoleKey, string> = {
  owner: 'role-owner',
  therapist: 'role-therapist',
  frontdesk: 'role-frontdesk',
  ca: 'role-ca',
};

const ref = (id: string, roles: Role[]) => ({ id, name: roles.find((r) => r.id === id)!.name });

function seedMembers(roles: Role[]): Member[] {
  const rows: Array<[string, string | null, string | null, string]> = [
    ['Sameer', 'sameer@atpxrehab.com', '+919822041736', 'role-owner'],
    ['RY', null, '+919890122457', 'role-owner'],
    ['RP', null, '+919730081924', 'role-owner'],
    ['Santosh', null, '+919860677031', 'role-owner'],
    ['Anjali', null, '+919765422018', 'role-therapist'],
    ['Pooja', null, '+919011056432', 'role-frontdesk'],
    ['CA', 'accounts@kulkarnica.in', null, 'role-ca'],
  ];
  return rows.map(([key, email, phone, roleId], i) => ({
    id: `member-${i + 1}`,
    userId: key,
    displayName: '',
    fullName: PEOPLE[key]!.fullName,
    email,
    phone,
    status: 'active',
    joinedAt: '2026-10-01T09:00:00+05:30',
    deactivatedAt: null,
    roles: [ref(roleId, roles)],
  }));
}

const at = (d: string) => `${d}+05:30`;

function seedAudit(): AuditRow[] {
  const actor = (k: string) => ({ id: k, name: PEOPLE[k]!.fullName });
  const txn = (o: Record<string, unknown>) => ({ type: 'expense', ...o });
  return [
    {
      id: '8',
      at: at('2026-10-14T11:42:00'),
      action: 'insert',
      tableName: 'transactions',
      rowId: 'txn_1',
      actor: actor('Pooja'),
      before: null,
      after: {
        type: 'income',
        category: 'Clinic session',
        amount_paise: 60000,
        payment_mode: 'Cash',
        patient_name: 'Atharva Kale',
      },
    },
    {
      id: '7',
      at: at('2026-10-13T19:05:00'),
      action: 'update',
      tableName: 'transactions',
      rowId: 'txn_2',
      actor: actor('RP'),
      before: txn({ category: 'Consumables', amount_paise: 342000 }),
      after: txn({ category: 'Consumables', amount_paise: 324000 }),
    },
    {
      id: '6',
      at: at('2026-10-12T09:15:00'),
      action: 'update',
      tableName: 'transactions',
      rowId: 'txn_6',
      actor: actor('Santosh'),
      before: txn({ category: 'Utilities', payment_mode: 'Cash' }),
      after: txn({ category: 'Utilities', payment_mode: 'Bank transfer' }),
    },
    {
      id: '5',
      at: at('2026-10-11T18:30:00'),
      action: 'update',
      tableName: 'transactions',
      rowId: 'txn_x',
      actor: actor('Sameer'),
      before: txn({
        category: 'Miscellaneous',
        amount_paise: 45000,
        description: 'Tea & snacks (duplicate)',
        deleted_at: null,
      }),
      after: txn({
        category: 'Miscellaneous',
        amount_paise: 45000,
        description: 'Tea & snacks (duplicate)',
        deleted_at: '2026-10-11T18:30:00+05:30',
      }),
    },
    {
      id: '4',
      at: at('2026-10-08T16:20:00'),
      action: 'insert',
      tableName: 'role_permissions',
      rowId: 'rp-1',
      actor: actor('Sameer'),
      before: null,
      after: { role: 'Front desk', permission_key: 'finance.entry.view', scope: 'own' },
    },
    {
      id: '3',
      at: at('2026-10-02T10:00:00'),
      action: 'insert',
      tableName: 'clinic_members',
      rowId: 'member-7',
      actor: actor('Sameer'),
      before: null,
      after: { display_name: 'Kulkarni & Associates', status: 'active' },
    },
    {
      id: '2',
      at: at('2026-10-01T08:45:00'),
      action: 'update',
      tableName: 'roles',
      rowId: 'role-ca',
      actor: actor('Sameer'),
      before: { name: 'CA' },
      after: { name: 'CA (read-only)' },
    },
    {
      id: '1',
      at: at('2026-10-01T08:30:00'),
      action: 'insert',
      tableName: 'invites',
      rowId: 'inv-0',
      actor: actor('Sameer'),
      before: null,
      after: { display_name: 'Dr. Anjali Deshmukh', status: 'accepted' },
    },
  ];
}

function fresh() {
  const roles = seedRoles();
  return {
    role: null as RoleKey | null,
    roles,
    members: seedMembers(roles),
    invites: [] as Array<Invite & { token: string }>,
    audit: seedAudit(),
    /** Names changed through PATCH /v1/me, by person key. */
    names: {} as Record<string, string>,
    seq: 100,
  };
}

let l2 = fresh();

export function resetMockL2() {
  l2 = fresh();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

/** Mock identity. In supabase mode it follows the real user's role so ledger mocks scope correctly. */
export function setMockRole(role: RoleKey | null) {
  l2.role = role;
  try {
    if (role) localStorage.setItem(SESSION_KEY, role);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function mockRole(): RoleKey {
  if (!l2.role) {
    try {
      const saved = localStorage.getItem(SESSION_KEY) as RoleKey | null;
      if (saved && saved in ROLE_ID) l2.role = saved;
    } catch {
      /* storage unavailable */
    }
  }
  if (!l2.role) throw new ApiError(401, 'Not signed in', 'unauthorized');
  return l2.role;
}

export const mockUserKey = () => USER_FOR_ROLE[mockRole()];

/** Member id for a fixture person key (member userId = person key in the mock). */
export const memberIdOf = (key: string) => l2.members.find((m) => m.userId === key)?.id ?? null;
export const mockMembers = () => l2.members;

export function mockScope(key: PermissionKey): Scope {
  const role = l2.roles.find((r) => r.id === ROLE_ID[mockRole()]);
  return role?.permissions[key] ?? 'none';
}

export function recordAudit(row: Omit<AuditRow, 'id' | 'at' | 'actor'>) {
  const k = mockUserKey();
  l2.audit = [
    {
      ...row,
      id: String(++l2.seq),
      at: new Date().toISOString(),
      actor: { id: k, name: PEOPLE[k]!.fullName },
    },
    ...l2.audit,
  ];
}

function require(key: PermissionKey) {
  if (mockScope(key) === 'none') throw new ApiError(403, 'Not allowed', 'forbidden');
}

function person(key: string) {
  const p = PEOPLE[key]!;
  const name = l2.names[key];
  return name ? { ...p, fullName: name, shortName: shortName(name), initials: initials(name) } : p;
}

function buildSession(): Session {
  const role = mockRole();
  return {
    user: person(USER_FOR_ROLE[role]),
    role,
    roleLabel: ROLE_LABEL[role],
    clinicId: CLINIC.id,
    clinicName: CLINIC.name,
    memberId: memberIdOf(USER_FOR_ROLE[role]) ?? '',
    permissions: Object.fromEntries(
      CATALOG.map((p) => [p.key, mockScope(p.key as PermissionKey)]),
    ) as Session['permissions'],
  };
}

export const mockL2 = {
  async getSession(): Promise<Session | null> {
    try {
      return await latency(buildSession(), 30);
    } catch {
      return null;
    }
  },
  async signIn(v: { identifier: string; password: string; devRole?: RoleKey }): Promise<Session> {
    if (!v.identifier.trim() || !v.password)
      throw new ApiError(400, 'Enter your phone or email and password.');
    setMockRole(v.devRole ?? 'owner');
    return latency(buildSession(), 250);
  },
  async signOut(): Promise<void> {
    setMockRole(null);
    return latency(undefined, 50);
  },
  async sendMagicLink(_email: string, _redirectTo: string): Promise<void> {
    return latency(undefined, 300);
  },

  async getInvite(token: string): Promise<InvitePreview> {
    const inv = l2.invites.find((i) => i.token === token);
    if (!inv && token !== 'demo')
      throw new ApiError(404, 'This invite link is not valid.', 'invite_not_found');
    return latency({
      clinicName: CLINIC.name,
      displayName: inv?.displayName ?? 'Dr. Anjali Deshmukh',
      identifierHint: inv?.email ? inv.email.replace(/^(.).*@/, '$1•••@') : '+91 ••••• •2018',
      signInWith: inv?.email ? 'email' : 'phone',
      roles: inv?.roles.map((r) => r.name) ?? ['Therapist'],
      status: 'pending',
    });
  },
  async acceptInvite(token: string, _v: { fullName: string; password: string }): Promise<Session> {
    const inv = l2.invites.find((i) => i.token === token);
    const roleName = inv?.roles[0]?.name ?? 'Therapist';
    const key =
      (Object.keys(ROLE_ID) as RoleKey[]).find((k) => ROLE_LABEL[k] === roleName) ?? 'therapist';
    l2.invites = l2.invites.filter((i) => i.token !== token);
    setMockRole(key);
    return latency(buildSession(), 250);
  },

  async updateMe(fullName: string): Promise<Session> {
    const key = mockUserKey();
    l2.names[key] = fullName;
    for (const m of l2.members) if (m.userId === key) m.fullName = fullName;
    return latency(buildSession(), 150);
  },
  /** "wrong" stands for a wrong current password. */
  async changePassword(current: string, _next: string): Promise<void> {
    if (current === 'wrong')
      throw new ApiError(400, 'Current password is wrong.', 'wrong_password');
    return latency(undefined, 150);
  },

  async listPermissions(): Promise<PermissionDef[]> {
    return latency(CATALOG);
  },
  async listRoles(): Promise<Role[]> {
    return latency(l2.roles);
  },
  async createRole(name: string): Promise<Role> {
    require('settings.roles.manage');
    const role: Role = {
      id: `role-${++l2.seq}`,
      name,
      description: '',
      isSystem: false,
      memberCount: 0,
      permissions: {},
    };
    l2.roles = [...l2.roles, role];
    recordAudit({
      action: 'insert',
      tableName: 'roles',
      rowId: role.id,
      before: null,
      after: { name },
    });
    return latency(role);
  },
  async updateRolePermissions(roleId: string, permissions: Record<string, Scope>): Promise<Role> {
    require('settings.roles.manage');
    const role = l2.roles.find((r) => r.id === roleId);
    if (!role) throw new ApiError(404, 'Role not found', 'not_found');
    for (const [key, scope] of Object.entries(permissions)) {
      if (scope === 'own' && !CATALOG.find((p) => p.key === key)?.supportsOwn)
        throw new ApiError(400, `${key} has no "own" scope`, 'scope_own_not_supported');
      const before = role.permissions[key] ?? 'none';
      if (scope === 'none') delete role.permissions[key];
      else role.permissions[key] = scope;
      recordAudit({
        action: before === 'none' ? 'insert' : scope === 'none' ? 'delete' : 'update',
        tableName: 'role_permissions',
        rowId: `${roleId}:${key}`,
        before: before === 'none' ? null : { role: role.name, permission_key: key, scope: before },
        after: scope === 'none' ? null : { role: role.name, permission_key: key, scope },
      });
    }
    return latency(role, 80);
  },

  async listMembers(): Promise<Member[]> {
    require('settings.users.invite');
    return latency(l2.members);
  },
  async setMemberActive(memberId: string, active: boolean): Promise<Member> {
    require('settings.users.invite');
    const m = l2.members.find((x) => x.id === memberId);
    if (!m) throw new ApiError(404, 'Member not found', 'not_found');
    m.status = active ? 'active' : 'deactivated';
    m.deactivatedAt = active ? null : new Date().toISOString();
    return latency(m);
  },
  /** PATCH /v1/members/{id}: name needs settings.users.invite, roles settings.roles.manage. */
  async updateMember(
    memberId: string,
    v: { displayName?: string; roleIds?: string[] },
  ): Promise<Member> {
    if (v.displayName !== undefined) require('settings.users.invite');
    if (v.roleIds !== undefined) require('settings.roles.manage');
    const m = l2.members.find((x) => x.id === memberId);
    if (!m) throw new ApiError(404, 'Member not found', 'not_found');
    if (v.roleIds) {
      if (!v.roleIds.length) throw new ApiError(400, 'Pick at least one role.', 'bad_request');
      const before = m.roles;
      m.roles = v.roleIds.map((rid) => ref(rid, l2.roles));
      const admin = (x: Member) =>
        x.status === 'active' &&
        x.roles.some(
          (r) => l2.roles.find((role) => role.id === r.id)?.permissions['settings.roles.manage'],
        );
      if (!l2.members.some(admin)) {
        m.roles = before;
        throw new ApiError(
          409,
          'At least one active member must keep a role that can manage roles',
          'last_admin',
        );
      }
      for (const role of l2.roles)
        role.memberCount = l2.members.filter((x) => x.roles.some((r) => r.id === role.id)).length;
    }
    if (v.displayName !== undefined) m.displayName = v.displayName.trim();
    return latency(m);
  },
  async listInvites(): Promise<Invite[]> {
    require('settings.users.invite');
    return latency(l2.invites.map(({ token: _t, ...i }) => i));
  },
  async createInvite(input: CreateInvite): Promise<CreatedInvite> {
    require('settings.users.invite');
    const contact = input.email ?? input.phone;
    if (!contact) throw new ApiError(400, 'Add a phone number or email.', 'bad_request');
    if (l2.members.some((m) => m.email === input.email || (input.phone && m.phone === input.phone)))
      throw new ApiError(409, 'This person is already a member.', 'already_member');
    const id = `inv-${++l2.seq}`;
    const token = `mock-${id}`;
    const invite: Invite = {
      id,
      displayName: input.displayName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      roles: input.roleIds.map((rid) => ref(rid, l2.roles)),
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    l2.invites = [...l2.invites, { ...invite, token }];
    recordAudit({
      action: 'insert',
      tableName: 'invites',
      rowId: id,
      before: null,
      after: { display_name: input.displayName, status: 'pending' },
    });
    return latency({ invite, inviteUrl: `${location.origin}/invite/${token}` }, 250);
  },
  async revokeInvite(id: string): Promise<void> {
    require('settings.users.invite');
    l2.invites = l2.invites.filter((i) => i.id !== id);
    return latency(undefined);
  },

  async listAudit(q: { table?: string; cursor?: string; limit?: number }): Promise<AuditPage> {
    require('audit.view');
    const rows = l2.audit.filter((a) => !q.table || a.tableName === q.table);
    const start = q.cursor ? Number(q.cursor) : 0;
    const limit = q.limit ?? 50;
    const items = rows.slice(start, start + limit);
    return latency({
      items,
      nextCursor: start + limit < rows.length ? String(start + limit) : null,
    });
  },
};
