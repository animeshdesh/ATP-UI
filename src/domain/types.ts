/*
 * Frontend domain types. Provisional until backend L2–L7 publish their schemas in
 * contracts/openapi.json; then these become aliases of the generated types in src/api/schema.d.ts.
 */

export type RoleKey = 'owner' | 'therapist' | 'frontdesk' | 'ca';
export type EntryType = 'income' | 'expense';
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank transfer';
export const PAYMENT_MODES: PaymentMode[] = ['Cash', 'UPI', 'Card', 'Bank transfer'];

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
  user: Person;
  role: RoleKey;
  roleLabel: string;
  clinicName: string;
  permissions: Record<PermissionKey, Scope>;
}

export interface Transaction {
  id: string;
  type: EntryType;
  amountPaise: number;
  category: string;
  /** Clinic calendar date, YYYY-MM-DD */
  entryDate: string;
  description: string;
  patientName?: string;
  paymentMode: PaymentMode;
  /** Partner who paid / received, or 'Clinic' for the clinic account */
  partyKey: string;
  recordedBy: string;
  hasReceipt: boolean;
}

export interface NewTransaction {
  type: EntryType;
  amountPaise: number;
  category: string;
  entryDate: string;
  description?: string;
  patientName?: string;
  paymentMode: PaymentMode;
  partyKey: string;
  receiptFileName?: string;
  recurringKey?: string;
  /** Client-generated; the server returns the original entry on replay (F-08). */
  idempotencyKey?: string;
}

export interface TransactionFilters {
  search?: string;
  type?: 'All' | 'Income' | 'Expense';
  category?: string;
  mode?: string;
  person?: string;
}

export type Tone = 'accent' | 'neutral' | 'danger' | 'warn' | 'solid';

export interface StatTile {
  label: string;
  valuePaise?: number;
  value?: string;
  sub: string;
  emphasis?: 'income';
}

export interface AttentionItem {
  tone: 'danger' | 'warn';
  text: string;
  sub: string;
  action:
    | { label: string; kind: 'log-recurring'; recurringKey: string }
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

export interface RecurringItem {
  key: string;
  name: string;
  category: string;
  dayOfMonth: number;
  amountPaise: number;
  logged: boolean;
}

export interface Dashboard {
  scope: 'clinic' | 'own';
  tiles: StatTile[];
  attention: AttentionItem[];
  breakdown: CategorySpend[];
  transfers: Transfer[];
  settledOn?: string;
  recurring: RecurringItem[];
  recent: Transaction[];
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

export interface Categories {
  expense: string[];
  income: string[];
  archived: { expense: string[]; income: string[] };
  recurring: RecurringItem[];
}

export interface PermissionRow {
  key: PermissionKey;
  label: string;
  group: 'Finance' | 'Settings' | 'Later versions';
  later?: boolean;
  /** Scopes per role column, same order as `PermissionMatrix.roles` */
  scopes: Scope[];
}

export interface PermissionMatrix {
  roles: Array<{ key: RoleKey; name: string; users: string }>;
  rows: PermissionRow[];
}

export interface Member {
  name: string;
  initials: string;
  contact: string;
  roles: string[];
  status: 'Active' | 'Invited';
}

export interface InviteInput {
  name: string;
  contact: string;
  roles: string[];
}

export type AuditAction = 'Created' | 'Edited' | 'Deleted' | 'Settings' | 'Settled';

export interface AuditEntry {
  at: string;
  user: string;
  action: AuditAction;
  kind: 'Entries' | 'Settings';
  entity: string;
  before?: string;
  after: string;
}

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
