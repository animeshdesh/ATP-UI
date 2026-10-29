import type { components, paths } from './api/schema';

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
  | 'patients.manage'
  | 'patients.clinical'
  | 'settings.branches.manage'
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
  /** My membership in the active clinic (therapist id on appointments, `own` scope). */
  memberId: string;
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
export type Transaction = S['Transaction'];
export type NewTransaction = S['NewTransaction'];
export type UpdateTransaction = S['UpdateTransaction'];
export type TransactionPage = S['TransactionPage'];
export type EntryDefaults = S['EntryDefaults'];
export type Category = S['Category'];
export type RecurringItem = S['RecurringItem'];
export type CreateRecurringItem = S['CreateRecurringItem'];
export type UpdateRecurringItem = S['UpdateRecurringItem'];
/** Clinic member for pickers and filters (`GET /v1/people`). */
export type ClinicPerson = S['Person'];
export type ReceiptLink = S['ReceiptLink'];
export type Partner = S['Partner'];

// ── L4 (settlement) and L5 (dashboard): contract types ──────────────
export type PartyRef = S['PartyRef'];
export type SettleTransfer = S['SettleTransfer'];
export type SettlementPosition = S['SettlementPosition'];
export type SettlementSummary = S['SettlementSummary'];
export type SettlementDetail = S['SettlementDetail'];
export type PartnerShares = S['PartnerShares'];
export type SetPartnerShares = S['SetPartnerShares'];
export type PeriodTotals = S['PeriodTotals'];
export type DashboardData = S['Dashboard'];
// ── L6 (budgets & funds): contract types ─────────────────────────
export type Budgets = S['Budgets'];
export type BudgetLine = S['BudgetLine'];
export type SetBudgets = S['SetBudgets'];
export type Fund = S['Fund'];
export type FundRule = S['FundRule'];
export type CreateFund = S['CreateFund'];
export type UpdateFund = S['UpdateFund'];
export type FundTopUp = S['FundTopUp'];

// ── L7 (reports): contract types ────────────────────────────────
export type MonthlyReport = S['MonthlyReport'];
export type ReceiptsMode = 'links' | 'appendix' | 'none';
export type ReportFormat = 'pdf' | 'csv' | 'xlsx';
/** A downloaded export, ready to save or share. */
export interface ReportFile {
  blob: Blob;
  filename: string;
}

export type DashboardQuery = NonNullable<paths['/v1/dashboard']['get']['parameters']['query']>;
/** Query for `GET /v1/transactions`. */
export type TransactionQuery = NonNullable<paths['/v1/transactions']['get']['parameters']['query']>;

export type { Tone } from '@atp/ui';

export interface AttentionItem {
  tone: 'danger' | 'warn';
  text: string;
  sub: string;
  action:
    | { label: string; kind: 'log-recurring'; item: RecurringItem }
    | { label: string; kind: 'budgets' };
}

// ── L2 (auth & RBAC): contract types ─────────────────────────────
export type PermissionDef = S['Permission'];
export type Role = S['Role'];
export type Member = S['Member'];
export type UpdateMember = S['UpdateMember'];
export type Invite = S['Invite'];
export type CreateInvite = S['CreateInvite'];
export type CreatedInvite = S['CreatedInvite'];
export type InvitePreview = S['InvitePreview'];
export type AcceptedInvite = S['AcceptedInvite'];
export type AuditRow = S['AuditEntry'];
export type AuditPage = S['AuditPage'];
export type Me = S['Me'];
