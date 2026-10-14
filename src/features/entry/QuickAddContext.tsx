import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { NewTransaction, Transaction } from '@/domain/types';
import { EntrySheet } from './EntrySheet';

export type QuickAddPrefill = Partial<
  Pick<
    NewTransaction,
    | 'type'
    | 'categoryId'
    | 'amountPaise'
    | 'description'
    | 'paymentMode'
    | 'partyMemberId'
    | 'recurringItemId'
  >
>;

interface EntrySheetApi {
  add: (prefill?: QuickAddPrefill) => void;
  edit: (txn: Transaction) => void;
}

const EntryContext = createContext<EntrySheetApi>({ add: () => {}, edit: () => {} });

type SheetState =
  | { open: false; n: number }
  | {
      open: true;
      n: number;
      mode: 'create';
      prefill?: QuickAddPrefill;
      openedAt: number;
      entryKey: string;
    }
  | { open: true; n: number; mode: 'edit'; txn: Transaction };

/** Global add-entry sheet, reachable from every screen (F-07); also edits entries (F-06). */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SheetState>({ open: false, n: 0 });
  const add = useCallback((prefill?: QuickAddPrefill) => {
    // One idempotency key per opened form: double taps and offline replays create one entry.
    const openedAt = Date.now();
    const entryKey = crypto.randomUUID();
    setState((s) => ({ open: true, n: s.n + 1, mode: 'create', prefill, openedAt, entryKey }));
  }, []);
  const edit = useCallback(
    (txn: Transaction) => setState((s) => ({ open: true, n: s.n + 1, mode: 'edit', txn })),
    [],
  );
  const close = useCallback(() => setState((s) => ({ open: false, n: s.n })), []);
  const value = useMemo(() => ({ add, edit }), [add, edit]);
  return (
    <EntryContext value={value}>
      {children}
      {state.open && (
        <EntrySheet
          key={state.n}
          onClose={close}
          {...(state.mode === 'create'
            ? {
                mode: 'create',
                prefill: state.prefill,
                openedAt: state.openedAt,
                entryKey: state.entryKey,
              }
            : { mode: 'edit', txn: state.txn })}
        />
      )}
    </EntryContext>
  );
}

/** Opens the add-entry sheet. */
export const useQuickAdd = () => use(EntryContext).add;
/** Opens an existing entry for editing. */
export const useEditEntry = () => use(EntryContext).edit;
