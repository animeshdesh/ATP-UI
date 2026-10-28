import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, NetworkError, api } from '@/api';
import { attachReceipt, invalidateLedger } from '@/api/queries';
import { useAuthedSession } from '@atp/core';
import { useToast } from '@atp/ui';
import { flushOutbox, outbox, type OutboxItem, type SendResult } from './outbox';

import { useOnline } from '@atp/core';

export { useOnline };

/** Outbox items for the signed-in user. */
export function useOutbox(): OutboxItem[] {
  const { user } = useAuthedSession();
  const all = useSyncExternalStore(outbox.subscribe, outbox.snapshot, outbox.snapshot);
  return all.filter((i) => i.userKey === user.key);
}

async function send(item: OutboxItem): Promise<SendResult> {
  try {
    const txn = await api.createTransaction(item.input);
    // A failed receipt upload doesn't block the entry; it can be re-added from the entry.
    if (item.receipt) await attachReceipt(txn.id, item.receipt);
    return 'sent';
  } catch (e) {
    if (e instanceof NetworkError) return 'retry';
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return { rejected: e.message };
    return 'retry';
  }
}

const RETRY_MS = 30_000;

/** Mounted once in the authenticated shell: replays the outbox on reconnect and every 30 s. */
export function useOutboxSync() {
  const { user } = useAuthedSession();
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const pending = useOutbox().filter((i) => !i.error).length;

  useEffect(() => {
    if (!online || pending === 0) return;
    const run = async () => {
      const result = await flushOutbox(user.key, send);
      if (!result?.sent) return;
      await invalidateLedger(qc);
      toast(`Synced ${result.sent} offline ${result.sent === 1 ? 'entry' : 'entries'}`);
    };
    void run();
    const timer = setInterval(run, RETRY_MS);
    return () => clearInterval(timer);
  }, [online, pending, user.key, qc, toast]);
}
