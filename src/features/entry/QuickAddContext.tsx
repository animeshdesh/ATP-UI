import { createContext, use, useCallback, useState, type ReactNode } from 'react';
import type { NewTransaction } from '@/domain/types';
import { QuickAddSheet } from './QuickAddSheet';

export type QuickAddPrefill = Partial<
  Pick<
    NewTransaction,
    | 'type'
    | 'category'
    | 'amountPaise'
    | 'description'
    | 'paymentMode'
    | 'partyKey'
    | 'recurringKey'
  >
>;

const QuickAddContext = createContext<(prefill?: QuickAddPrefill) => void>(() => {});

/** Global add-entry sheet, reachable from every screen (F-07). */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    prefill?: QuickAddPrefill;
    n: number;
    openedAt: number;
    entryKey: string;
  }>({
    open: false,
    n: 0,
    openedAt: 0,
    entryKey: '',
  });
  const open = useCallback((prefill?: QuickAddPrefill) => {
    // One idempotency key per opened form: double taps and offline replays create one entry.
    const openedAt = Date.now();
    const entryKey = crypto.randomUUID();
    setState((s) => ({ open: true, prefill, n: s.n + 1, openedAt, entryKey }));
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return (
    <QuickAddContext value={open}>
      {children}
      <QuickAddSheet
        key={state.n}
        open={state.open}
        openedAt={state.openedAt}
        entryKey={state.entryKey}
        prefill={state.prefill}
        onClose={close}
      />
    </QuickAddContext>
  );
}

export const useQuickAdd = () => use(QuickAddContext);
