/*
 * In-memory L3 (ledger) with the contract's shapes, for `VITE_AUTH=mock` and tests.
 * Mirrors backend docs/LEDGER.md: scope own/all, 7-day edit window, idempotent create,
 * receipts, categories, recurring items, people.
 */
import type {
  Category,
  ClinicPerson,
  CreateRecurringItem,
  EntryDefaults,
  EntryType,
  NewTransaction,
  PaymentMode,
  ReceiptLink,
  RecurringItem,
  Transaction,
  TransactionPage,
  TransactionQuery,
  UpdateRecurringItem,
  UpdateTransaction,
} from '@atp/core';
import { daysBetween, ApiError, NetworkError } from '@atp/core';
import { initials } from '@atp/core';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MOCK_TODAY,
  PARTNER_KEYS,
  PEOPLE,
  BUDGET_SEED,
  FUND_SEED,
  RECURRING_SEED,
  SEED_ENTRIES,
  oct,
  r,
} from './fixtures';
import {
  memberIdOf,
  mockMembers,
  mockRole,
  mockScope,
  mockUserKey,
  recordAudit,
} from '@atp/core/mock';

const MODE: Record<string, PaymentMode> = {
  Cash: 'cash',
  UPI: 'upi',
  Card: 'card',
  'Bank transfer': 'bank_transfer',
};
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const ts = (date: string) => `${date}T09:00:00.000Z`;

function seedCategories(): Category[] {
  const mk = (type: EntryType, names: string[]) =>
    names.map((name, i) => ({
      id: `cat-${slug(name)}`,
      type,
      name,
      sortOrder: i + 1,
      archived: false,
    }));
  return [
    ...mk('expense', EXPENSE_CATEGORIES),
    ...mk('income', INCOME_CATEGORIES),
    {
      id: 'cat-printing',
      type: 'expense' as const,
      name: 'Printing',
      sortOrder: 99,
      archived: true,
    },
  ];
}

const personRef = (key: string) => {
  const id = memberIdOf(key);
  return id ? { memberId: id, name: PEOPLE[key]!.fullName } : null;
};

function seedRecurring(cats: Category[]) {
  return RECURRING_SEED.map(([key, name, cat, day, rupees]) => ({
    id: `rec-${key}`,
    name,
    categoryId: cats.find((c) => c.name === cat)!.id,
    categoryName: cat,
    expectedAmountPaise: r(rupees),
    dayOfMonth: day,
    archived: false,
  }));
}

type StoredTxn = Omit<Transaction, 'canEdit'> & {
  deleted: boolean;
  recordedByKey: string;
  partyKey: string | null;
};

function seedTransactions(cats: Category[]): StoredTxn[] {
  return SEED_ENTRIES.map(
    ([d, t, cat, description, patient, mode, rupees, party, rec, receipt], i) => {
      const recurring = RECURRING_SEED.find((x) => x[5] === description);
      const date = oct(d);
      return {
        id: `txn-${i + 1}`,
        type: t === 'in' ? 'income' : 'expense',
        amountPaise: r(rupees),
        categoryId: cats.find((c) => c.name === cat)!.id,
        categoryName: cat,
        entryDate: date,
        description,
        patientName: patient,
        paymentMode: MODE[mode]!,
        party: party === 'Clinic' ? null : personRef(party),
        partyKey: party === 'Clinic' ? null : party,
        recurringItemId: recurring ? `rec-${recurring[0]}` : null,
        hasReceipt: !!receipt,
        settled: false,
        fund: null,
        patientId: null,
        branch: null,
        recordedBy: { userId: rec, name: PEOPLE[rec]!.fullName },
        recordedByKey: rec,
        createdAt: ts(date),
        updatedAt: ts(date),
        deleted: false,
      };
    },
  );
}

/** L6 state lives here too: entries draw from funds, and budgets key off categories. */
function seedL6(categories: Category[], transactions: StoredTxn[]) {
  const budgets = new Map<string, number>(
    BUDGET_SEED.map(([name, rupees]) => [categories.find((c) => c.name === name)!.id, r(rupees)]),
  );
  const funds = FUND_SEED.map((f) => ({
    id: f.id,
    name: f.name,
    rule: f.rule,
    ruleEffectiveMonth: MOCK_TODAY.slice(0, 7),
    startMonth: MOCK_TODAY.slice(0, 7),
    openingBalancePaise: r(f.openingRupees),
    archived: false,
  }));
  const topups = FUND_SEED.filter((f) => f.topUpRupees).map((f) => ({
    fundId: f.id,
    amountPaise: r(f.topUpRupees!),
    entryDate: oct(2),
  }));
  const tens = transactions.find((t) => t.description === 'TENS unit');
  if (tens) tens.fund = { id: 'fund-equipment', name: 'Equipment fund' };
  return { budgets, funds, topups };
}

function fresh() {
  const categories = seedCategories();
  const transactions = seedTransactions(categories);
  return {
    categories,
    recurring: seedRecurring(categories),
    transactions,
    ...seedL6(categories, transactions),
    lastMode: {} as Record<string, PaymentMode>,
    idempotency: new Map<string, string>(),
    seq: 100,
  };
}

/** `fundId` on an entry: expenses only, active funds (docs/BUDGETS.md). */
function fundFor(fundId: string | null | undefined, type: EntryType) {
  if (!fundId) return null;
  if (type !== 'expense')
    throw new ApiError(400, 'Only expenses can be drawn from a fund.', 'bad_request');
  const f = db.funds.find((x) => x.id === fundId && !x.archived);
  if (!f) throw new ApiError(400, 'Fund not found or archived.', 'bad_request');
  return { id: f.id, name: f.name };
}

let db = fresh();
export const resetMockLedger = () => {
  db = fresh();
};

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

/** Simulates fetch failing while the device is offline. */
function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new NetworkError();
}

const me = mockUserKey;
const myMemberId = () => memberIdOf(me()) ?? 'member-0';
const canSeeAll = () => mockScope('finance.entry.view') === 'all';
/** Own scope = entries I recorded, not ones someone else logged with me as party (D-050). */
const visible = (t: StoredTxn) => !t.deleted && (canSeeAll() || t.recordedByKey === me());

function canEdit(t: StoredTxn): boolean {
  if (t.settled) return false;
  if (mockScope('finance.entry.edit_any') !== 'none') return true;
  return (
    mockScope('finance.entry.edit_own') !== 'none' &&
    t.recordedByKey === me() &&
    daysBetween(t.createdAt.slice(0, 10), MOCK_TODAY) <= 7
  );
}

const view = (t: StoredTxn): Transaction => {
  const { deleted: _d, recordedByKey: _r, partyKey: _p, ...rest } = t;
  return { ...rest, canEdit: canEdit(t) };
};

function findOwn(id: string): StoredTxn {
  const t = db.transactions.find((x) => x.id === id && visible(x));
  if (!t) throw new ApiError(404, 'Entry not found', 'not_found');
  return t;
}

function category(id: string, type: EntryType): Category {
  const c = db.categories.find((x) => x.id === id);
  if (!c) throw new ApiError(404, 'Category not found', 'not_found');
  if (c.type !== type)
    throw new ApiError(400, 'Category does not match the entry type', 'category_type_mismatch');
  return c;
}

function partyFor(memberId: string | null | undefined) {
  if (memberId === null) return { party: null, partyKey: null };
  const id = memberId ?? myMemberId();
  const m = mockMembers().find((x) => x.id === id);
  if (!m) throw new ApiError(400, 'Unknown person', 'bad_request');
  if (m.status !== 'active')
    throw new ApiError(409, `${m.fullName} is deactivated`, 'member_inactive');
  if (!canSeeAll() && m.userId !== me())
    throw new ApiError(403, 'You can only record your own payments', 'forbidden');
  return { party: { memberId: m.id, name: m.fullName }, partyKey: m.userId };
}

const auditRow = (t: StoredTxn) => ({
  type: t.type,
  category: t.categoryName,
  amount_paise: t.amountPaise,
  payment_mode: t.paymentMode,
  description: t.description,
  ...(t.patientName ? { patient_name: t.patientName } : {}),
  deleted_at: t.deleted ? t.updatedAt : null,
});

export const mockLedger = {
  async getEntryDefaults(): Promise<EntryDefaults> {
    const owner = canSeeAll();
    const keys = owner ? [me(), ...PARTNER_KEYS.filter((k) => k !== me())] : [me()];
    return latency({
      entryDate: MOCK_TODAY,
      paymentMode: db.lastMode[me()] ?? 'cash',
      myMemberId: myMemberId(),
      parties: keys.map((k) => ({
        ...personRef(k)!,
        isPartner: PARTNER_KEYS.includes(k),
        isMe: k === me(),
      })),
    });
  },

  async listPeople(): Promise<ClinicPerson[]> {
    mockRole();
    return latency(
      mockMembers().map((m) => ({
        memberId: m.id,
        userId: m.userId,
        name: m.fullName,
        initials: initials(m.fullName),
        isPartner: PARTNER_KEYS.includes(m.userId),
        status: m.status,
      })),
    );
  },

  async listTransactions(q: TransactionQuery = {}): Promise<TransactionPage> {
    assertOnline();
    const s = (q.search ?? '').trim().toLowerCase();
    const rows = db.transactions.filter(
      (t) =>
        visible(t) &&
        (!q.type || t.type === q.type) &&
        (!q.categoryId || t.categoryId === q.categoryId) &&
        (!q.paymentMode || t.paymentMode === q.paymentMode) &&
        (!q.memberId ||
          t.party?.memberId === q.memberId ||
          memberIdOf(t.recordedByKey) === q.memberId) &&
        (q.party !== 'clinic' || t.party === null) &&
        (!q.from || t.entryDate >= q.from) &&
        (!q.to || t.entryDate <= q.to) &&
        (!s ||
          [
            t.description,
            t.categoryName,
            t.patientName ?? '',
            t.party?.name ?? '',
            t.recordedBy.name,
          ]
            .join(' ')
            .toLowerCase()
            .includes(s)),
    );
    rows.sort(
      (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt),
    );
    const start = q.cursor ? Number(q.cursor) : 0;
    const limit = q.limit ?? 50;
    const sum = (type: EntryType) =>
      rows.filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);
    return latency({
      items: rows.slice(start, start + limit).map(view),
      nextCursor: start + limit < rows.length ? String(start + limit) : null,
      totals: { count: rows.length, incomePaise: sum('income'), expensePaise: sum('expense') },
    });
  },

  async createTransaction(input: NewTransaction): Promise<Transaction> {
    assertOnline();
    if (mockScope('finance.entry.create') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    if (!(input.amountPaise > 0)) throw new ApiError(400, 'Enter an amount.', 'bad_request');
    const replayed = input.idempotencyKey && db.idempotency.get(input.idempotencyKey);
    if (replayed) {
      const existing = db.transactions.find((t) => t.id === replayed);
      if (existing) return latency(view(existing), 80);
    }
    const c = category(input.categoryId, input.type);
    if (c.archived) throw new ApiError(400, `${c.name} is archived`, 'bad_request');
    const now = new Date().toISOString();
    const t: StoredTxn = {
      id: `txn-${++db.seq}`,
      type: input.type,
      amountPaise: input.amountPaise,
      categoryId: c.id,
      categoryName: c.name,
      entryDate: input.entryDate ?? MOCK_TODAY,
      description: input.description?.trim() ?? '',
      patientName: input.type === 'income' ? input.patientName?.trim() || null : null,
      paymentMode: input.paymentMode ?? db.lastMode[me()] ?? 'cash',
      ...partyFor(input.partyMemberId),
      recurringItemId: input.recurringItemId ?? null,
      fund: fundFor(input.fundId, input.type),
      hasReceipt: false,
      settled: false,
      patientId: null,
      branch: null,
      recordedBy: { userId: me(), name: PEOPLE[me()]!.fullName },
      recordedByKey: me(),
      createdAt: now,
      updatedAt: now,
      deleted: false,
    };
    db.transactions = [t, ...db.transactions];
    if (input.idempotencyKey) db.idempotency.set(input.idempotencyKey, t.id);
    db.lastMode[me()] = t.paymentMode;
    recordAudit({
      action: 'insert',
      tableName: 'transactions',
      rowId: t.id,
      before: null,
      after: auditRow(t),
    });
    return latency(view(t), 200);
  },

  async updateTransaction(id: string, patch: UpdateTransaction): Promise<Transaction> {
    assertOnline();
    const t = findOwn(id);
    if (t.settled)
      throw new ApiError(409, 'This entry is part of a settlement and is locked.', 'entry_settled');
    if (!canEdit(t))
      throw new ApiError(
        403,
        'Entries can be changed for 7 days. Ask an Owner.',
        'edit_window_closed',
      );
    const before = auditRow(t);
    const type = patch.type ?? t.type;
    if (patch.categoryId || patch.type) {
      const c = category(patch.categoryId ?? t.categoryId, type);
      t.categoryId = c.id;
      t.categoryName = c.name;
    }
    t.type = type;
    if (patch.amountPaise !== undefined) t.amountPaise = patch.amountPaise;
    if (patch.entryDate) t.entryDate = patch.entryDate;
    if (patch.description !== undefined) t.description = patch.description;
    if (patch.patientName !== undefined) t.patientName = patch.patientName;
    if (patch.paymentMode) t.paymentMode = patch.paymentMode;
    if (patch.partyMemberId !== undefined) Object.assign(t, partyFor(patch.partyMemberId));
    if (patch.recurringItemId !== undefined) t.recurringItemId = patch.recurringItemId;
    if (patch.fundId !== undefined) t.fund = fundFor(patch.fundId, t.type);
    else if (t.type !== 'expense') t.fund = null;
    t.updatedAt = new Date().toISOString();
    recordAudit({
      action: 'update',
      tableName: 'transactions',
      rowId: id,
      before,
      after: auditRow(t),
    });
    return latency(view(t), 150);
  },

  async deleteTransaction(id: string): Promise<void> {
    assertOnline();
    const t = findOwn(id);
    if (t.settled)
      throw new ApiError(409, 'This entry is part of a settlement and is locked.', 'entry_settled');
    if (!canEdit(t))
      throw new ApiError(
        403,
        'Entries can be deleted for 7 days. Ask an Owner.',
        'edit_window_closed',
      );
    const before = auditRow(t);
    t.deleted = true;
    t.updatedAt = new Date().toISOString();
    recordAudit({
      action: 'update',
      tableName: 'transactions',
      rowId: id,
      before,
      after: auditRow(t),
    });
    return latency(undefined, 120);
  },

  async uploadReceipt(id: string, file: Blob): Promise<void> {
    assertOnline();
    if (file.size > 5 * 1024 * 1024)
      throw new ApiError(413, 'Photo is over 5 MB.', 'payload_too_large');
    findOwn(id).hasReceipt = true;
    return latency(undefined, 300);
  },
  async getReceiptUrl(id: string): Promise<ReceiptLink> {
    if (!findOwn(id).hasReceipt) throw new ApiError(404, 'No receipt', 'not_found');
    return latency({ url: '/atp-mark.svg', expiresInSec: 300 });
  },
  async deleteReceipt(id: string): Promise<void> {
    findOwn(id).hasReceipt = false;
    return latency(undefined);
  },

  async listCategories(includeArchived = false): Promise<Category[]> {
    mockRole();
    return latency(
      db.categories
        .filter((c) => includeArchived || !c.archived)
        .sort((a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder),
    );
  },
  async createCategory(type: EntryType, name: string): Promise<Category> {
    if (mockScope('settings.categories.manage') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    if (db.categories.some((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase()))
      throw new ApiError(409, `${name} already exists`, 'conflict');
    const c: Category = {
      id: `cat-${slug(name)}-${++db.seq}`,
      type,
      name,
      sortOrder:
        Math.max(0, ...db.categories.filter((x) => x.type === type).map((x) => x.sortOrder)) + 1,
      archived: false,
    };
    db.categories = [...db.categories, c];
    return latency(c);
  },
  async updateCategory(
    id: string,
    patch: { name?: string; archived?: boolean },
  ): Promise<Category> {
    if (mockScope('settings.categories.manage') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const c = db.categories.find((x) => x.id === id);
    if (!c) throw new ApiError(404, 'Category not found', 'not_found');
    Object.assign(c, patch);
    if (patch.name) {
      for (const t of db.transactions) if (t.categoryId === id) t.categoryName = patch.name;
      for (const r of db.recurring) if (r.categoryId === id) r.categoryName = patch.name;
    }
    return latency(c);
  },
  async reorderCategories(type: EntryType, ids: string[]): Promise<Category[]> {
    if (mockScope('settings.categories.manage') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    ids.forEach((id, i) => {
      const c = db.categories.find((x) => x.id === id && x.type === type);
      if (c) c.sortOrder = i + 1;
    });
    return mockLedger.listCategories();
  },

  async listRecurring(month?: string): Promise<RecurringItem[]> {
    mockRole();
    const m = month ?? MOCK_TODAY.slice(0, 7);
    const [y, mo] = m.split('-').map(Number) as [number, number];
    const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
    return latency(
      db.recurring
        .filter((x) => !x.archived)
        .map((x) => {
          const t = db.transactions.find(
            (t) => !t.deleted && t.recurringItemId === x.id && t.entryDate.startsWith(m),
          );
          return {
            ...x,
            dueDate: `${m}-${String(Math.min(x.dayOfMonth, lastDay)).padStart(2, '0')}`,
            logged: t
              ? { transactionId: t.id, amountPaise: t.amountPaise, entryDate: t.entryDate }
              : null,
          };
        })
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    );
  },
  async createRecurring(input: CreateRecurringItem): Promise<RecurringItem> {
    if (mockScope('settings.categories.manage') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const c = category(input.categoryId, 'expense');
    db.recurring = [
      ...db.recurring,
      { ...input, id: `rec-${++db.seq}`, categoryName: c.name, archived: false },
    ];
    return (await mockLedger.listRecurring()).find((x) => x.name === input.name)!;
  },
  async updateRecurring(id: string, patch: UpdateRecurringItem): Promise<void> {
    if (mockScope('settings.categories.manage') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const x = db.recurring.find((r) => r.id === id);
    if (!x) throw new ApiError(404, 'Recurring item not found', 'not_found');
    Object.assign(x, patch);
    if (patch.categoryId) x.categoryName = category(patch.categoryId, 'expense').name;
    return latency(undefined);
  },
};

/** Shared with the L4/L5 mocks (finance.ts), which compute from the same entries. */
export const ledgerDb = () => db;
export type { StoredTxn };
