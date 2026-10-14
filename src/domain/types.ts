import type { components, paths } from '@/api/schema';

type S = components['schemas'];

/*
 * Frontend domain types. Provisional until backend L2–L7 publish their schemas in
 * contracts/openapi.json; then these become aliases of the generated types in src/api/schema.d.ts.
 */

export type RoleKey = 'owner' | 'therapist' | 'frontdesk' | 'ca';
export type EntryType = S['EntryType'];
export type PaymentMode = S['PaymentMode'];
export const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'card', 'bank_transfer'];
export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank transfer',
};

/** Permission scope for one role (PRD §3). */
export type Scope = 'all' | 'own' | 'none';

export type PermissionKey =
  | 'finance.entry.create'
  | 'finance.entry.view'
  | 'finance.entry.edit_own'
  | 'finance.entry.edit_any'
  | 'finance.report.view'
  | 'finance.settlement.manage'
  | 'finance.budget.manage'
  | 'settings.categories.manage'
  | 'settings.users.invite'
  | 'settings.roles.manage'
  | 'audit.view'
  | 'appointments.manage'
  | 'patients.view'
  | 'inventory.manage';

export interface Person {
  key: string;
  fullName: string;
  shortName: string;
  initials: string;
}

export interface Session {
  /** `user.key` is the auth user id (or the fixture key in mock mode). */
  user: Person;
  /** Closest default role; drives role-specific labels and the mock ledger identity. */
  role: RoleKey;
  roleLabel: string;
  clinicId: string;
  clinicName: string;
  permissions: Record<PermissionKey, Scope>;
}

/** Signed in, but `/v1/me` has no active clinic: the user must pick one. */
export interface ClinicPick {
  pickClinic: Array<{ id: string; name: string }>;
  userName: string;
}

// ── L3 (ledger): contract types ──────────────────────────────────
export type PersonRef = S['PersonRef'];
/**
 * `party` is PersonRef or null (clinic account). The contract encodes it as
 * allOf[PersonRef, object|null], which generates an unusable type; corrected here.
 */
export type Transaction = Omit<S['Transaction'], 'party'> & { party: PersonRef | null };
export type NewTransaction = S['NewTransaction'];
export type UpdateTransaction = S['UpdateTransaction'];
export type TransactionPage = Omit<S['TransactionPage'], 'items'> & { items: Transaction[] };
export type EntryDefaults = S['EntryDefaults'];
export type Category = S['Category'];
export type RecurringItem = S['RecurringItem'];
export type CreateRecurringItem = S['CreateRecurringItem'];
export type UpdateRecurringItem = S['UpdateRecurringItem'];
/** Clinic member for pickers and filters (`GET /v1/people`). */
export type ClinicPerson = S['Person'];
export type ReceiptLink = S['ReceiptLink'];
/** Query for `GET /v1/transactions`. */
export type TransactionQuery = NonNullable<paths['/v1/transactions']['get']['parameters']['query']>;

export type Tone = 'accent' | 'neutral' | 'danger' | 'warn' | 'solid';

export interface AttentionItem {
  tone: 'danger' | 'warn';
  text: string;
  sub: string;
  action:
    | { label: string; kind: 'log-recurring'; item: RecurringItem }
    | { label: string; kind: 'budgets' };
}

export interface CategorySpend {
  name: string;
  spentPaise: number;
  budgetPaise: number;
  lastMonthPaise: number;
}

export interface Transfer {
  from: string;
  to: string;
  amountPaise: number;
}

/** Aggregates still served by the mock until backend L4–L6 (D-012). */
export interface DashboardAggregates {
  breakdown: CategorySpend[];
  transfers: Transfer[];
  settledOn?: string;
}

export interface PartnerBalance {
  person: Person;
  sharePct: number;
  paidPaise: number;
  receivedPaise: number;
  /** Positive: owes the pool. Negative: is owed. */
  balancePaise: number;
}

export interface SettlementHistoryItem {
  period: string;
  meta: string;
  amountPaise: number;
}

export interface Settlement {
  period: string;
  clinicNetPaise: number;
  transfers: Transfer[];
  partners: PartnerBalance[];
  settledOn?: string;
  history: SettlementHistoryItem[];
}

export interface Fund {
  name: string;
  rule: string;
  balancePaise: number;
  allocatedPaise: number;
  drawnPaise: number;
}

export interface Budgets {
  month: string;
  categories: CategorySpend[];
  funds: Fund[];
}

// ── L2 (auth & RBAC): contract types ─────────────────────────────
export type PermissionDef = S['Permission'];
export type Role = S['Role'];
export type Member = S['Member'];
export type Invite = S['Invite'];
export type CreateInvite = S['CreateInvite'];
export type CreatedInvite = S['CreatedInvite'];
export type InvitePreview = S['InvitePreview'];
export type AcceptedInvite = S['AcceptedInvite'];
export type AuditRow = S['AuditEntry'];
export type AuditPage = S['AuditPage'];
export type Me = S['Me'];

export interface ReportPreview {
  month: string;
  periodLabel: string;
  incomePaise: number;
  expensePaise: number;
  categories: Array<{ name: string; amountPaise: number }>;
  transactions: Array<{ date: string; label: string; mode: string; amountPaise: number }>;
  transactionCount: number;
  settlementLine: string;
  caEmail: string;
  pages: number;
}
