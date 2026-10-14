import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { NewTransaction, Role, Scope, Transaction, TransactionFilters } from '@/domain/types';
import { outbox } from '@/offline/outbox';
import { ApiError, NetworkError, api } from './index';

export const qk = {
  session: ['session'] as const,
  transactions: (f: TransactionFilters = {}) => ['transactions', f] as const,
  entryDefaults: ['entry-defaults'] as const,
  people: ['people'] as const,
  dashboard: (period: string) => ['dashboard', period] as const,
  settlement: ['settlement'] as const,
  budgets: ['budgets'] as const,
  recurring: ['recurring'] as const,
  report: (month: string) => ['report', month] as const,
  categories: ['categories'] as const,
  permissionCatalog: ['permission-catalog'] as const,
  roles: ['roles'] as const,
  members: ['members'] as const,
  invites: ['invites'] as const,
  audit: (table: string) => ['audit', table] as const,
};

export const useSessionQuery = () =>
  useQuery({
    queryKey: qk.session,
    queryFn: api.getSession,
    staleTime: 5 * 60_000,
    // Retry only transient failures; a 401/403 answer is final.
    retry: (n, e) => !(e instanceof ApiError) && n < 2,
  });
export const useTransactions = (f: TransactionFilters) =>
  useQuery({
    queryKey: qk.transactions(f),
    queryFn: () => api.listTransactions(f),
    placeholderData: (p) => p,
  });
export const useEntryDefaults = () =>
  useQuery({ queryKey: qk.entryDefaults, queryFn: api.getEntryDefaults });
export const usePeople = () =>
  useQuery({ queryKey: qk.people, queryFn: api.listPeople, staleTime: Infinity });
export const useDashboard = (period: string) =>
  useQuery({ queryKey: qk.dashboard(period), queryFn: () => api.getDashboard(period) });
export const useSettlement = () =>
  useQuery({ queryKey: qk.settlement, queryFn: api.getSettlement });
export const useBudgets = () => useQuery({ queryKey: qk.budgets, queryFn: api.getBudgets });
export const useRecurring = () => useQuery({ queryKey: qk.recurring, queryFn: api.listRecurring });
export const useReportPreview = (month: string) =>
  useQuery({ queryKey: qk.report(month), queryFn: () => api.getReportPreview(month) });
export const useCategories = () =>
  useQuery({ queryKey: qk.categories, queryFn: api.getCategories });
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

export type CreateResult = { status: 'saved'; txn: Transaction } | { status: 'queued' };

/**
 * Saves an entry, or queues it in the offline outbox when the server is unreachable (F-08).
 * Validation and permission errors still throw.
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
    }): Promise<CreateResult> => {
      const queue = async (): Promise<CreateResult> => {
        await outbox.add({
          input: v.input,
          userKey: v.userKey,
          ...(v.receipt ? { receipt: v.receipt } : {}),
        });
        return { status: 'queued' };
      };
      if (!navigator.onLine) return queue();
      try {
        return { status: 'saved', txn: await api.createTransaction(v.input) };
      } catch (e) {
        if (e instanceof NetworkError) return queue();
        throw e;
      }
    },
    onSuccess: (r) => (r.status === 'saved' ? invalidate() : undefined),
  });
}

export function useMarkSettled() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.markSettled, onSuccess: invalidate });
}

export function useUndoSettlement() {
  const invalidate = useLedgerInvalidation();
  return useMutation({ mutationFn: api.undoSettlement, onSuccess: invalidate });
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: qk.categories });
  return {
    add: useMutation({
      mutationFn: (v: { type: 'expense' | 'income'; name: string }) =>
        api.addCategory(v.type, v.name),
      onSuccess: done,
    }),
    archive: useMutation({
      mutationFn: (v: { type: 'expense' | 'income'; name: string }) =>
        api.archiveCategory(v.type, v.name),
      onSuccess: done,
    }),
    restore: useMutation({
      mutationFn: (v: { type: 'expense' | 'income'; name: string }) =>
        api.restoreCategory(v.type, v.name),
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
