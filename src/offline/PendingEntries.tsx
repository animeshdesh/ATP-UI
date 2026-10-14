import { CloudUpload, TriangleAlert } from 'lucide-react';
import type { Person, Transaction } from '@/domain/types';
import { EntryRow } from '@/features/transactions/EntryRow';
import { useOutbox } from './hooks';
import { outbox, type OutboxItem } from './outbox';

function asTransaction(item: OutboxItem): Transaction {
  const i = item.input;
  return {
    id: item.key,
    type: i.type,
    amountPaise: i.amountPaise,
    category: i.category,
    entryDate: i.entryDate,
    description: i.description || (i.patientName ? `${i.category} · ${i.patientName}` : i.category),
    ...(i.patientName ? { patientName: i.patientName } : {}),
    paymentMode: i.paymentMode,
    partyKey: i.partyKey,
    recordedBy: item.userKey,
    hasReceipt: !!item.receipt,
  };
}

/** Outbox entries shown above the synced list (F-08). */
export function PendingEntries({ people }: { people: Record<string, Person> | undefined }) {
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
            people={people}
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
