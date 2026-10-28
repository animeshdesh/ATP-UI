import { CloudUpload, TriangleAlert } from 'lucide-react';
import type { Transaction } from '@atp/core';
import { EntryRow } from '@/features/transactions/EntryRow';
import { useOutbox } from './hooks';
import { outbox, type OutboxItem } from './outbox';

function asTransaction(item: OutboxItem): Transaction {
  const i = item.input;
  const at = new Date(item.queuedAt).toISOString();
  return {
    id: item.key,
    type: i.type,
    amountPaise: i.amountPaise,
    categoryId: i.categoryId,
    categoryName: item.display.categoryName,
    entryDate: i.entryDate ?? at.slice(0, 10),
    description: i.description ?? '',
    patientName: i.patientName ?? null,
    paymentMode: i.paymentMode ?? 'cash',
    party:
      i.partyMemberId === null || !item.display.partyName
        ? null
        : { memberId: i.partyMemberId ?? '', name: item.display.partyName },
    recurringItemId: i.recurringItemId ?? null,
    hasReceipt: !!item.receipt,
    settled: false,
    fund: null,
    recordedBy: { userId: item.userKey, name: item.display.recordedByName },
    createdAt: at,
    updatedAt: at,
    canEdit: false,
  };
}

/** Outbox entries shown above the synced list (F-08). */
export function PendingEntries() {
  const items = useOutbox();
  if (items.length === 0) return null;
  return (
    <section aria-label="Waiting to sync" className="flex flex-col">
      <div className="border-b-2 border-divider pb-1.5 kicker">On this device · not synced yet</div>
      <ul className="m-0 flex list-none flex-col bg-warn-bg/40 p-0">
        {items.map((item) => (
          <EntryRow
            key={item.key}
            txn={asTransaction(item)}
            detailed
            status={
              item.error ? (
                <span className="flex flex-col items-end gap-0.5 text-right text-xs">
                  <span className="flex items-center gap-1 font-semibold text-danger-fg">
                    <TriangleAlert aria-hidden size={12} />
                    {item.error}
                  </span>
                  <button
                    type="button"
                    onClick={() => void outbox.remove(item.key)}
                    className="border-0 bg-transparent p-0 text-xs font-semibold text-accent-700 underline"
                  >
                    Discard
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-warn-fg">
                  <CloudUpload aria-hidden size={12} />
                  Waiting to sync
                </span>
              )
            }
          />
        ))}
      </ul>
    </section>
  );
}
