/*
 * In-memory stand-in for backend endpoints that are not in contracts/openapi.json yet
 * (L2 auth/RBAC … L7 reports). Each function mirrors one planned endpoint. When an endpoint
 * lands in the contract, replace its body in src/api/index.ts with an openapi-fetch call.
 */
import { monthToDate, monthYear } from '@/lib/dates';
import { inr } from '@/lib/money';
import type {
  AttentionItem,
  AuditEntry,
  Budgets,
  Categories,
  Dashboard,
  InviteInput,
  Member,
  NewTransaction,
  PermissionKey,
  PermissionMatrix,
  ReportPreview,
  RoleKey,
  Scope,
  Session,
  Settlement,
  StatTile,
  Transaction,
  TransactionFilters,
} from '@/domain/types';
import {
  CATEGORY_SPEND,
  EXPENSE_CATEGORIES,
  FUNDS,
  INCOME_CATEGORIES,
  MOCK_TODAY,
  PARTNER_KEYS,
  PARTNER_LEDGER,
  PEOPLE,
  ROLE_COLUMNS,
  ROLE_LABEL,
  USER_FOR_ROLE,
  seedAudit,
  seedMembers,
  seedPermissions,
  seedRecurring,
  seedTransactions,
} from './fixtures';
import { computeSettlement } from './settlement';

const SESSION_KEY = 'atp.mock.session';

function freshDb() {
  return {
    role: null as Exclude<RoleKey, 'ca'> | null,
    transactions: seedTransactions(),
    recurring: seedRecurring(),
    permissions: seedPermissions(),
    categories: {
      expense: [...EXPENSE_CATEGORIES],
      income: [...INCOME_CATEGORIES],
      archived: { expense: ['Printing'], income: [] as string[] },
    },
    members: seedMembers(),
    audit: seedAudit(),
    settledOn: undefined as string | undefined,
    lastMode: {} as Record<string, NewTransaction['paymentMode']>,
    seq: 100,
  };
}

let db = freshDb();

/** Test hook: restore seed state. */
export function resetMockDb() {
  db = freshDb();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function currentRole(): Exclude<RoleKey, 'ca'> {
  if (!db.role) {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved === 'owner' || saved === 'therapist' || saved === 'frontdesk') db.role = saved;
    } catch {
      /* storage unavailable */
    }
  }
  if (!db.role) throw new ApiError(401, 'Not signed in');
  return db.role;
}

function permissionsFor(role: RoleKey): Record<PermissionKey, Scope> {
  const col = ROLE_COLUMNS.indexOf(role);
  return Object.fromEntries(db.permissions.map((p) => [p.key, p.scopes[col] ?? 'none'])) as Record<
    PermissionKey,
    Scope
  >;
}

function buildSession(): Session {
  const role = currentRole();
  return {
    user: PEOPLE[USER_FOR_ROLE[role]]!,
    role,
    roleLabel: ROLE_LABEL[role],
    clinicName: 'ATP Rehab',
    permissions: permissionsFor(role),
  };
}

const me = () => USER_FOR_ROLE[currentRole()];
const scopeOf = (key: PermissionKey) => permissionsFor(currentRole())[key];
const visibleTransactions = () =>
  scopeOf('finance.entry.view') === 'all'
    ? db.transactions
    : db.transactions.filter((t) => t.recordedBy === me());

const sum = (rows: Transaction[], type: Transaction['type']) =>
  rows.filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);

function settlementNow() {
  const result = computeSettlement(PARTNER_LEDGER);
  return {
    ...result,
    transfers: result.transfers.map((t) => ({
      from: PEOPLE[t.from]!.shortName,
      to: PEOPLE[t.to]!.shortName,
      amountPaise: t.amountPaise,
    })),
  };
}

export const mockServer = {
  // ── Auth (L2) ────────────────────────────────────────────
  async signIn(role: Exclude<RoleKey, 'ca'> = 'owner'): Promise<Session> {
    db.role = role;
    try {
      localStorage.setItem(SESSION_KEY, role);
    } catch {
      /* storage unavailable */
    }
    return latency(buildSession(), 250);
  },
  async signOut(): Promise<void> {
    db.role = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage unavailable */
    }
    return latency(undefined, 50);
  },
  async getSession(): Promise<Session | null> {
    try {
      return await latency(buildSession(), 30);
    } catch {
      return null;
    }
  },
  async sendMagicLink(_contact: string): Promise<void> {
    return latency(undefined, 300);
  },
  async getInvite(_token: string) {
    return latency({
      invitedBy: PEOPLE.Sameer!.fullName,
      clinicName: 'ATP Rehab',
      role: 'Therapist',
      name: PEOPLE.Anjali!.fullName,
      contact: '+91 97654 22018',
    });
  },
  async acceptInvite(_input: { token: string; name: string; password: string }): Promise<Session> {
    return mockServer.signIn('therapist');
  },

  // ── Ledger (L3) ──────────────────────────────────────────
  async listTransactions(f: TransactionFilters = {}): Promise<Transaction[]> {
    const q = (f.search ?? '').trim().toLowerCase();
    const rows = visibleTransactions().filter(
      (t) =>
        (!f.type || f.type === 'All' || (f.type === 'Expense') === (t.type === 'expense')) &&
        (!f.mode || f.mode === 'All' || t.paymentMode === f.mode) &&
        (!f.category || f.category === 'All' || t.category === f.category) &&
        (!f.person || f.person === 'All' || t.partyKey === f.person || t.recordedBy === f.person) &&
        (!q ||
          [t.description, t.category, t.patientName ?? '', PEOPLE[t.partyKey]?.shortName ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q)),
    );
    return latency(rows);
  },
  async createTransaction(input: NewTransaction): Promise<Transaction> {
    if (scopeOf('finance.entry.create') === 'none') throw new ApiError(403, 'Not allowed');
    if (input.amountPaise <= 0) throw new ApiError(400, 'Enter an amount.');
    const txn: Transaction = {
      id: `txn_${++db.seq}`,
      type: input.type,
      amountPaise: input.amountPaise,
      category: input.category,
      entryDate: input.entryDate,
      description:
        input.description?.trim() ||
        (input.patientName ? `${input.category} · ${input.patientName}` : input.category),
      ...(input.patientName ? { patientName: input.patientName } : {}),
      paymentMode: input.paymentMode,
      partyKey: input.partyKey,
      recordedBy: me(),
      hasReceipt: !!input.receiptFileName,
    };
    db.transactions = [txn, ...db.transactions];
    db.lastMode[me()] = input.paymentMode;
    if (input.recurringKey) {
      db.recurring = db.recurring.map((r) =>
        r.key === input.recurringKey ? { ...r, logged: true } : r,
      );
    }
    db.audit = [
      {
        at: 'Just now',
        user: PEOPLE[me()]!.shortName,
        action: 'Created',
        kind: 'Entries',
        entity: `${input.type === 'income' ? 'Income' : 'Expense'} · ${input.category}`,
        after: [inr(input.amountPaise), input.paymentMode, input.patientName]
          .filter(Boolean)
          .join(' · '),
      },
      ...db.audit,
    ];
    return latency(txn, 200);
  },
  /** F-03: default payment mode is the user's last used one. */
  async getEntryDefaults() {
    const role = currentRole();
    return latency({
      paymentMode: db.lastMode[me()] ?? (role === 'owner' ? 'UPI' : 'Cash'),
      partyOptions: role === 'owner' ? [...PARTNER_KEYS, 'Clinic'] : [me(), 'Clinic'],
      me: me(),
    } as const);
  },
  async listPeople() {
    return latency(PEOPLE);
  },

  // ── Dashboard (L5) ───────────────────────────────────────
  async getDashboard(_period: string): Promise<Dashboard> {
    const role = currentRole();
    const clinic = scopeOf('finance.report.view') === 'all';
    const mine = db.transactions.filter((t) => t.recordedBy === me());
    const recent = (clinic ? db.transactions : mine).slice(0, 5);
    if (!clinic) {
      const cashHeld = mine
        .filter((t) => t.partyKey === me() && t.paymentMode === 'Cash')
        .reduce((a, t) => a + (t.type === 'income' ? t.amountPaise : -t.amountPaise), 0);
      const tiles: StatTile[] = [
        { label: 'Entries logged', value: String(mine.length), sub: 'This month' },
        {
          label: 'Income logged',
          valuePaise: sum(mine, 'income'),
          sub: 'Patient payments',
          emphasis: 'income',
        },
        { label: 'Expense logged', valuePaise: sum(mine, 'expense'), sub: 'Paid for the clinic' },
        {
          label: 'Cash you hold',
          valuePaise: cashHeld,
          sub: role === 'frontdesk' ? 'Collected at desk' : 'Net cash on you',
        },
      ];
      return latency({
        scope: 'own',
        tiles,
        attention: [],
        breakdown: [],
        transfers: [],
        recurring: [],
        recent,
      });
    }

    const attention: AttentionItem[] = [
      ...db.recurring
        .filter((r) => !r.logged && r.dayOfMonth < Number(MOCK_TODAY.slice(8)))
        .map<AttentionItem>((r) => ({
          tone: 'danger',
          text: `${r.name} not logged`,
          sub: `Recurring · ${inr(r.amountPaise)} expected on ${r.dayOfMonth} Oct`,
          action: { label: 'Log now', kind: 'log-recurring', recurringKey: r.key },
        })),
      ...CATEGORY_SPEND.filter((c) => c.spentPaise / c.budgetPaise >= 0.8).map<AttentionItem>(
        (c) => {
          const p = c.spentPaise / c.budgetPaise;
          return {
            tone: p >= 1 ? 'danger' : 'warn',
            text: `${c.name} at ${Math.round(p * 100)}% of budget`,
            sub: `${inr(c.spentPaise)} of ${inr(c.budgetPaise)}`,
            action: { label: 'Budgets', kind: 'budgets' },
          };
        },
      ),
    ];
    const tiles: StatTile[] = [
      { label: 'Income', valuePaise: 32910000, sub: '+10% vs Sep', emphasis: 'income' },
      { label: 'Expense', valuePaise: 15055000, sub: '+14% vs Sep' },
      { label: 'Net', valuePaise: 17855000, sub: '+7% vs Sep' },
      { label: 'Cash in hand', valuePaise: 2245000, sub: 'Cash in ₹41,200 − out ₹18,750' },
    ];
    return latency({
      scope: 'clinic',
      tiles,
      attention,
      breakdown: CATEGORY_SPEND,
      transfers: settlementNow().transfers,
      ...(db.settledOn ? { settledOn: db.settledOn } : {}),
      recurring: db.recurring,
      recent,
    });
  },

  // ── Settlement (L4) ──────────────────────────────────────
  async getSettlement(): Promise<Settlement> {
    const s = settlementNow();
    const owed = s.balances.filter((b) => b.balance > 0).reduce((a, b) => a + b.balance, 0);
    return latency({
      period: monthToDate(MOCK_TODAY),
      clinicNetPaise: s.net,
      transfers: s.transfers,
      partners: PARTNER_LEDGER.map((p) => ({
        person: PEOPLE[p.key]!,
        sharePct: p.sharePct,
        paidPaise: p.paid,
        receivedPaise: p.received,
        balancePaise: db.settledOn ? 0 : (s.balances.find((b) => b.key === p.key)?.balance ?? 0),
      })),
      ...(db.settledOn ? { settledOn: db.settledOn } : {}),
      history: [
        ...(db.settledOn
          ? [
              {
                period: monthToDate(MOCK_TODAY),
                meta: `Settled today by ${PEOPLE[me()]!.shortName} · ${s.transfers.length} payments`,
                amountPaise: owed,
              },
            ]
          : []),
        {
          period: 'September 2026',
          meta: 'Settled 2 Oct by Rushikesh Y. · 3 payments',
          amountPaise: 3124000,
        },
        {
          period: 'August 2026',
          meta: 'Settled 3 Sep by Sameer U. · 2 payments',
          amountPaise: 1896000,
        },
      ],
    });
  },
  async markSettled(): Promise<{ payments: number }> {
    db.settledOn = MOCK_TODAY;
    return latency({ payments: settlementNow().transfers.length }, 200);
  },
  async undoSettlement(): Promise<void> {
    db.settledOn = undefined;
    return latency(undefined);
  },

  // ── Budgets & recurring (L6) ─────────────────────────────
  async getBudgets(): Promise<Budgets> {
    return latency({ month: monthYear(MOCK_TODAY), categories: CATEGORY_SPEND, funds: FUNDS });
  },
  async listRecurring() {
    return latency(db.recurring);
  },

  // ── Reports (L7) ─────────────────────────────────────────
  async getReportPreview(month: string): Promise<ReportPreview> {
    return latency({
      month,
      periodLabel: '1–30 September 2026',
      incomePaise: 29850000,
      expensePaise: 13190000,
      categories: [
        ['Rent', 60000],
        ['Salaries', 38000],
        ['Consumables', 14650],
        ['Utilities', 7420],
        ['Marketing', 5000],
        ['Other', 6830],
      ].map(([name, v]) => ({ name: name as string, amountPaise: (v as number) * 100 })),
      transactions: [
        ['01 Sep', 'Salaries · Watchman', 'Cash', 9000],
        ['01 Sep', 'Salaries · Staff', 'Bank', 21000],
        ['02 Sep', 'Clinic session · R. Pawar', 'UPI', 600],
        ['03 Sep', 'Consumables · Gel', 'UPI', 2150],
        ['05 Sep', 'Rent · September', 'Bank', 60000],
        ['05 Sep', 'Package · A. Kulkarni', 'Card', 6000],
      ].map(([date, label, mode, v]) => ({
        date: date as string,
        label: label as string,
        mode: mode as string,
        amountPaise: (v as number) * 100,
      })),
      transactionCount: 148,
      settlementLine: 'Settled 2 Oct 2026 · 3 payments · ₹31,240',
      caEmail: 'accounts@kulkarnica.in',
      pages: 6,
    });
  },
  async exportReport(_month: string, format: 'pdf' | 'xlsx' | 'csv' | 'receipts' | 'email') {
    const messages = {
      pdf: 'CA report for September ready · 6 pages',
      xlsx: 'Exported September as Excel',
      csv: 'Exported September as CSV',
      receipts: 'Zipped 38 receipt photos',
      email: 'Sent to accounts@kulkarnica.in',
    };
    return latency({ message: messages[format] }, 400);
  },

  // ── Settings (L2–L3) ─────────────────────────────────────
  async getCategories(): Promise<Categories> {
    return latency({ ...db.categories, recurring: db.recurring });
  },
  async addCategory(type: 'expense' | 'income', name: string) {
    db.categories[type] = [...db.categories[type], name];
    return latency(undefined);
  },
  async archiveCategory(type: 'expense' | 'income', name: string) {
    db.categories[type] = db.categories[type].filter((c) => c !== name);
    db.categories.archived[type] = [...db.categories.archived[type], name];
    return latency(undefined);
  },
  async restoreCategory(type: 'expense' | 'income', name: string) {
    db.categories.archived[type] = db.categories.archived[type].filter((c) => c !== name);
    db.categories[type] = [...db.categories[type], name];
    return latency(undefined);
  },
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    const counts = { owner: '4 users', therapist: '1 user', frontdesk: '1 user', ca: '1 invited' };
    return latency({
      roles: ROLE_COLUMNS.map((key) => ({ key, name: ROLE_LABEL[key], users: counts[key] })),
      rows: db.permissions,
    });
  },
  async setPermission(key: PermissionKey, role: RoleKey, scope: Scope) {
    if (role === 'owner') throw new ApiError(400, "Owner access can't be reduced");
    const col = ROLE_COLUMNS.indexOf(role);
    db.permissions = db.permissions.map((p) =>
      p.key === key ? { ...p, scopes: p.scopes.map((s, i) => (i === col ? scope : s)) } : p,
    );
    return latency(undefined, 80);
  },
  async listMembers(): Promise<Member[]> {
    return latency(
      db.members.map((m) => {
        const p = 'key' in m && m.key ? PEOPLE[m.key] : undefined;
        return {
          name: p?.fullName ?? m.name ?? '',
          initials: p?.initials ?? m.initials ?? '',
          contact: m.contact,
          roles: m.roles,
          status: m.invited ? 'Invited' : 'Active',
        };
      }),
    );
  },
  async invite(input: InviteInput) {
    const initials = input.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
    db.members = [
      ...db.members,
      { name: input.name, initials, contact: input.contact, roles: input.roles, invited: true },
    ];
    return latency(undefined, 250);
  },
  async listAudit(kind: 'All' | AuditEntry['kind']): Promise<AuditEntry[]> {
    return latency(db.audit.filter((a) => kind === 'All' || a.kind === kind));
  },
};

export { ApiError };
