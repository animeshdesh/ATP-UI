/*
 * F-08 offline outbox. Entries that cannot reach the server are stored in IndexedDB (with the
 * receipt photo) and replayed in order when the device is back online. Each entry carries the
 * idempotency key generated when the form opened, so a replay after a lost response never
 * creates a duplicate on the server.
 */
import type { NewTransaction } from '@/domain/types';
import { idbStore } from './idb';

export interface OutboxItem {
  key: string;
  input: NewTransaction & { idempotencyKey: string };
  receipt?: Blob;
  /** Who recorded it; replay only for the same signed-in user. */
  userKey: string;
  queuedAt: number;
  attempts: number;
  /** Set when the server rejected the entry; it then waits for the user to discard it. */
  error?: string;
}

type Listener = () => void;
let items: OutboxItem[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l());
const sorted = (xs: OutboxItem[]) => [...xs].sort((a, b) => a.queuedAt - b.queuedAt);

function load() {
  loaded ??= idbStore
    .getAll<OutboxItem>()
    .then((rows) => {
      items = sorted(rows);
      emit();
    })
    .catch(() => {
      /* IndexedDB unavailable (private mode): queue lives in memory only */
    });
  return loaded;
}

export const outbox = {
  subscribe(l: Listener) {
    listeners.add(l);
    void load();
    return () => listeners.delete(l);
  },
  snapshot: () => items,

  async add(item: Omit<OutboxItem, 'key' | 'queuedAt' | 'attempts'>) {
    await load();
    const row: OutboxItem = {
      ...item,
      key: item.input.idempotencyKey,
      queuedAt: Date.now(),
      attempts: 0,
    };
    items = sorted([...items.filter((i) => i.key !== row.key), row]);
    emit();
    await idbStore.put(row).catch(() => {});
  },

  async remove(key: string) {
    items = items.filter((i) => i.key !== key);
    emit();
    await idbStore.delete(key).catch(() => {});
  },

  async update(key: string, patch: Partial<OutboxItem>) {
    const row = items.find((i) => i.key === key);
    if (!row) return;
    const next = { ...row, ...patch };
    items = items.map((i) => (i.key === key ? next : i));
    emit();
    await idbStore.put(next).catch(() => {});
  },
};

export type SendResult = 'sent' | 'retry' | { rejected: string };

let flushing: Promise<{ sent: number }> | null = null;

/**
 * Replays pending items oldest first. Stops at the first retryable failure (still offline) so
 * order is preserved; a rejected item is marked and skipped. Returns null when a flush is
 * already running, so only the caller that started it reports the result.
 */
export function flushOutbox(
  userKey: string,
  send: (item: OutboxItem) => Promise<SendResult>,
): Promise<{ sent: number }> | null {
  if (flushing) return null;
  flushing = (async () => {
    await load();
    let sent = 0;
    for (const item of outbox.snapshot()) {
      if (item.error || item.userKey !== userKey) continue;
      const result = await send(item);
      if (result === 'retry') {
        await outbox.update(item.key, { attempts: item.attempts + 1 });
        break;
      }
      if (result === 'sent') {
        await outbox.remove(item.key);
        sent++;
      } else {
        await outbox.update(item.key, { attempts: item.attempts + 1, error: result.rejected });
      }
    }
    return { sent };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Test hook. */
export async function resetOutbox() {
  items = [];
  loaded = null;
  flushing = null;
  await idbStore.clear().catch(() => {});
  emit();
}
