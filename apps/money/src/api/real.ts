/* Real API for money: RBAC admin (L2) and finance (L3–L7). Sign-in lives in @atp/core. */
import type {
  MonthlyReport,
  ReceiptsMode,
  ReportFile,
  ReportFormat,
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
  CreateInvite,
  CreatedInvite,
  Invite,
  Member,
  PermissionDef,
  Role,
  Scope,
} from '@atp/core';
import { http, unwrap, ApiError } from '@atp/core';

export const realL2 = {
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

  // ── L7 reports (docs/REPORTS.md) ───────────────────────────
  getMonthlyReport: (month: string): Promise<MonthlyReport> =>
    unwrap(http.GET('/v1/reports/monthly', { params: { query: { month } } })),
  /** PDF / CSV / XLSX as a Blob, with the server's filename when the header is readable. */
  downloadReport: async (
    month: string,
    format: ReportFormat,
    receipts: ReceiptsMode = 'links',
  ): Promise<ReportFile> => {
    const call =
      format === 'pdf'
        ? http.GET('/v1/reports/monthly.pdf', {
            params: { query: { month, receipts } },
            parseAs: 'blob',
          })
        : format === 'csv'
          ? http.GET('/v1/reports/monthly.csv', { params: { query: { month } }, parseAs: 'blob' })
          : http.GET('/v1/reports/monthly.xlsx', { params: { query: { month } }, parseAs: 'blob' });
    const { data, error, response } = await call;
    if (!response.ok) {
      // Error bodies are JSON even when a blob was requested.
      let body = error as { error?: { code?: string; message?: string } } | Blob | undefined;
      if (body instanceof Blob) {
        try {
          body = JSON.parse(await body.text()) as { error?: { code?: string; message?: string } };
        } catch {
          body = undefined;
        }
      }
      throw new ApiError(
        response.status,
        (body && !(body instanceof Blob) && body.error?.message) || 'Export failed',
        body && !(body instanceof Blob) ? body.error?.code : undefined,
      );
    }
    return { blob: data as unknown as Blob, filename: filenameFrom(response, month, format) };
  },
};

/** `content-disposition` filename, else the documented pattern (header may not be CORS-exposed). */
export function filenameFrom(response: Response, month: string, ext: ReportFormat): string {
  const cd = response.headers.get('content-disposition') ?? '';
  const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return m?.[1] ? decodeURIComponent(m[1]) : `atp-rehab-accounts-${month}.${ext}`;
}
