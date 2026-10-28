import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  CreateFund,
  CreateRecurringItem,
  FundTopUp,
  SetBudgets,
  UpdateFund,
  DashboardQuery,
  EntryType,
  NewTransaction,
  Role,
  Scope,
  Transaction,
  TransactionQuery,
  UpdateRecurringItem,
  UpdateTransaction,
} from '@atp/core';
import { compressImage } from '@/lib/image';
import { outbox, type OutboxItem } from '@/offline/outbox';
import { sessionKey } from '@atp/core';
import { NetworkError, api } from './index';

export const qk = {
  session: sessionKey,
  transactions: (q: TransactionQuery = {}) => ['transactions', q] as const,
  entryDefaults: ['entry-defaults'] as const,
  people: ['people'] as const,
  dashboard: (q: DashboardQuery) => ['dashboard', q] as const,
  settlement: ['settlement'] as const,
  settlementHistory: ['settlement', 'history'] as const,
  shares: ['settlement', 'shares'] as const,
  partners: ['settlement', 'partners'] as const,
  budgets: (month = '') => ['budgets', month] as const,
  funds: (month = '') => ['funds', month] as const,
  recurring: (month = '') => ['recurring', month] as const,
  report: (month: string) => ['report', month] as const,
  categories: (includeArchived = false) => ['categories', includeArchived] as const,
  permissionCatalog: ['permission-catalog'] as const,
  roles: ['roles'] as const,
  members: ['members'] as const,
  invites: ['invites'] as const,
  audit: (table: string) => ['audit', table] as const,
};

const PAGE = 30;

/** Ledger list with "load more" (cursor pages); totals cover every matching entry. */
export const useTransactions = (q: TransactionQuery) =>
  useInfiniteQuery({
    queryKey: qk.transactions(q),
    queryFn: ({ pageParam }) =>
      api.listTransactions({ ...q, limit: PAGE, ...(pageParam ? { cursor: pageParam } : {}) }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (p) => p,
  });

/** First page only: dashboard lists and totals (`limit` 1 is enough for totals). */
export const useTransactionPage = (q: TransactionQuery, enabled = true) =>
  useQuery({
    queryKey: qk.transactions(q),
    queryFn: () => api.listTransactions(q),
    enabled,
  });

/*
 * Data the entry form needs works offline-first: served from cache when offline, so an entry
 * can be logged without a connection (F-08). The shell loads it up front (usePrefetchEntryData).
 */
export const useEntryDefaults = () =>
  useQuery({
    queryKey: qk.entryDefaults,
    queryFn: api.getEntryDefaults,
    networkMode: 'offlineFirst',
  });
export const usePeople = () =>
  useQuery({
    queryKey: qk.people,
    queryFn: api.listPeople,
    staleTime: 5 * 60_000,
    networkMode: 'offlineFirst',
  });
export const useDashboard = (q: DashboardQuery) =>
  useQuery({
    queryKey: qk.dashboard(q),
    queryFn: () => api.getDashboard(q),
    placeholderData: (p) => p,
  });
/** Open (unsettled) position up to today. */
export const useSettlement = (enabled = true) =>
  useQuery({ queryKey: qk.settlement, queryFn: () => api.getSettlement(), enabled });
export const useSettlementHistory = () =>
  useQuery({ queryKey: qk.settlementHistory, queryFn: api.listSettlements });
export const useShares = () => useQuery({ queryKey: qk.shares, queryFn: api.getShares });
export const usePartners = () => useQuery({ queryKey: qk.partners, queryFn: api.listPartners });
export const useBudgets = (month?: string) =>
  useQuery({ queryKey: qk.budgets(month), queryFn: () => api.getBudgets(month) });
/** Funds for the month; entry-create-only users get names (for the fund picker). */
export const useFunds = (month?: string) =>
  useQuery({
    queryKey: qk.funds(month),
    queryFn: () => api.listFunds(month),
    networkMode: 'offlineFirst',
  });
export const useRecurring = (month?: string) =>
  useQuery({ queryKey: qk.recurring(month), queryFn: () => api.listRecurring(month) });
export const useMonthlyReport = (month: string) =>
  useQuery({ queryKey: qk.report(month), queryFn: () => api.getMonthlyReport(month) });
export const useCategories = (includeArchived = false) =>
  useQuery({
    queryKey: qk.categories(includeArchived),
    queryFn: () => api.listCategories(includeArchived),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  });

/** Mounted by the shell so quick-add has categories and defaults before the device goes offline. */
export function usePrefetchEntryData(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    void qc.prefetchQuery({
      queryKey: qk.categories(false),
      queryFn: () => api.listCategories(false),
    });
    void qc.prefetchQuery({ queryKey: qk.entryDefaults, queryFn: api.getEntryDefaults });
  }, [enabled, qc]);
}
export const usePermissionCatalog = () =>
  useQuery({ queryKey: qk.permissionCatalog, queryFn: api.listPermissions, staleTime: Infinity });
export const useRoles = () => useQuery({ queryKey: qk.roles, queryFn: api.listRoles });
export const useMembers = () => useQuery({ queryKey: qk.members, queryFn: api.listMembers });
export const useInvites = () => useQuery({ queryKey: qk.invites, queryFn: api.listInvites });

/** Audit log, newest first, 30 rows per page; `table` '' means all tables. */
export const useAuditLog = (table: string) =>
  useInfiniteQuery({
    queryKey: qk.audit(table),
    queryFn: ({ pageParam }) =>
      api.listAudit({
        limit: 30,
        ...(table ? { table } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

const LEDGER_KEYS = [
  'transactions',
  'report',
  'budgets',
  'funds',
  'dashboard',
  'recurring',
  'categories',
  'audit',
  'entry-defaults',
  'settlement',
];

/** Invalidate everything derived from the ledger after a write. */
export const invalidateLedger = (qc: QueryClient) =>
  Promise.all(LEDGER_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

function useLedgerInvalidation() {
  const qc = useQueryClient();
  return () => invalidateLedger(qc);
}

export type CreateResult =
  { status: 'saved'; txn: Transaction; receiptFailed?: boolean } | { status: 'queued' };

/** Upload after create (F-04). The entry is already saved, so a failure is reported, not thrown. */
export async function attachReceipt(txnId: string, receipt: Blob): Promise<boolean> {
  try {
    await api.uploadReceipt(txnId, await compressImage(receipt));
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves an entry (+ receipt), or queues it in the offline outbox when the server is
 * unreachable (F-08). Validation and permission errors still throw.
 */
export function useCreateTransaction() {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    // Default 'online' mode would pause this mutation offline; it queues to the outbox instead.
    networkMode: 'always',
    mutationFn: async (v: {
      input: NewTransaction & { idempotencyKey: string };
      receipt?: Blob;
      userKey: string;
      display: OutboxItem['display'];
    }): Promise<CreateResult> => {
      const queue = async (): Promise<CreateResult> => {
        await outbox.add({
          input: v.input,
          userKey: v.userKey,
          display: v.display,
          ...(v.receipt ? { receipt: v.receipt } : {}),
        });
        return { status: 'queued' };
      };
      if (!navigator.onLine) return queue();
      let txn: Transaction;
      try {
        txn = await api.createTransaction(v.input);
      } catch (e) {
        if (e instanceof NetworkError) return queue();
        throw e;
      }
      if (v.receipt && !(await attachReceipt(txn.id, v.receipt)))
        return { status: 'saved', txn, receiptFailed: true };
      return { status: 'saved', txn };
    },
    onSuccess: (r) => (r.status === 'saved' ? invalidate() : undefined),
  });
}

export function useUpdateTransaction() {
  const invalidate = useLedgerInvalidation();
  return useMutation({
    mutationFn: (v: { id: string; patch: UpdateTransaction }) =>
      api.updateTransaction(v.id, v.patch),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.deleteTransaction, onSuccess: invalidate });
}

export function useReceiptMutations() {
  const invalidate = useLedgerInvalidation();
  return {
    upload: useMutation({
      mutationFn: async (v: { id: string; file: Blob }) => {
        await api.uploadReceipt(v.id, await compressImage(v.file));
      },
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: api.deleteReceipt, onSuccess: invalidate }),
  };
}

/** Settling locks entries (settled, canEdit false), so the whole ledger refreshes. */
export function useSettle() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.settle, onSuccess: invalidate });
}

export function useUndoSettlement() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.undoSettlement, onSuccess: invalidate });
}

export function useSetShares() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.setShares, onSuccess: invalidate });
}

export function useBudgetMutations() {
  const qc = useQueryClient();
  const done = () =>
    Promise.all(
      ['budgets', 'funds', 'dashboard'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
  return {
    setBudgets: useMutation({ mutationFn: (v: SetBudgets) => api.setBudgets(v), onSuccess: done }),
    createFund: useMutation({ mutationFn: (v: CreateFund) => api.createFund(v), onSuccess: done }),
    updateFund: useMutation({
      mutationFn: (v: { id: string; patch: UpdateFund }) => api.updateFund(v.id, v.patch),
      onSuccess: done,
    }),
    topUp: useMutation({
      mutationFn: (v: { id: string; topUp: FundTopUp }) => api.topUpFund(v.id, v.topUp),
      onSuccess: done,
    }),
  };
}

export function useAddPartner() {
  const invalidate = useLedgerInvalidation();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addPartner,
    onSuccess: () => Promise.all([invalidate(), qc.invalidateQueries({ queryKey: qk.people })]),
  });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const done = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['categories'] }),
      qc.invalidateQueries({ queryKey: ['recurring'] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (v: { type: EntryType; name: string }) => api.createCategory(v.type, v.name),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; name?: string; archived?: boolean }) =>
        api.updateCategory(v.id, {
          ...(v.name ? { name: v.name } : {}),
          ...(v.archived !== undefined ? { archived: v.archived } : {}),
        }),
      onSuccess: done,
    }),
    reorder: useMutation({
      mutationFn: (v: { type: EntryType; ids: string[] }) => api.reorderCategories(v.type, v.ids),
      onSuccess: done,
    }),
  };
}

export function useRecurringMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['recurring'] });
  return {
    create: useMutation({
      mutationFn: (v: CreateRecurringItem) => api.createRecurring(v),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; patch: UpdateRecurringItem }) =>
        api.updateRecurring(v.id, v.patch),
      onSuccess: done,
    }),
  };
}

/** One matrix cell. Optimistic, rolled back on error (e.g. scope_own_not_supported). */
export function useSetRolePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { roleId: string; key: string; scope: Scope }) =>
      api.updateRolePermissions(v.roleId, { [v.key]: v.scope }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: qk.roles });
      const prev = qc.getQueryData<Role[]>(qk.roles);
      qc.setQueryData<Role[]>(qk.roles, (roles) =>
        roles?.map((r) => {
          if (r.id !== v.roleId) return r;
          const permissions = { ...r.permissions };
          if (v.scope === 'none') delete permissions[v.key];
          else permissions[v.key] = v.scope;
          return { ...r, permissions };
        }),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.roles, ctx?.prev),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: qk.roles }),
        qc.invalidateQueries({ queryKey: qk.session }),
      ]),
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.roles }),
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invites }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invites }),
  });
}

export function useSetMemberActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { memberId: string; active: boolean }) =>
      api.setMemberActive(v.memberId, v.active),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.members }),
  });
}
