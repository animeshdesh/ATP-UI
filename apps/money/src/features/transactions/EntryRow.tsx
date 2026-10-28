import type { ReactNode } from 'react';
import { ChevronRight, Lock, Paperclip } from 'lucide-react';
import { PAYMENT_MODE_LABEL, type Transaction, dayOfMonth, monthShort } from '@atp/core';
import { signedInr } from '@/lib/money';
import { cn } from '@atp/ui';

interface Props {
  txn: Transaction;
  /** Full row with recorder, patient, receipt and edit state (transactions list). */
  detailed?: boolean;
  /** Opens the entry (edit or view). */
  onOpen?: () => void;
  /** Replaces the edit/locked marker, e.g. an outbox entry's sync state and actions. */
  status?: ReactNode;
}

const partyLabel = (t: Pick<Transaction, 'party'>) => t.party?.name ?? 'Clinic account';

export function EntryRow({ txn, detailed, onOpen, status }: Props) {
  const sub = [
    txn.categoryName,
    PAYMENT_MODE_LABEL[txn.paymentMode],
    `${txn.type === 'expense' ? 'paid by' : 'received by'} ${partyLabel(txn)}`,
  ].join(' · ');
  const title =
    txn.description ||
    (txn.patientName ? `${txn.categoryName} · ${txn.patientName}` : txn.categoryName);
  const amount = (
    <div
      className={cn(
        'text-[15px] font-extrabold tabular',
        txn.type === 'income' && 'text-accent-700',
      )}
    >
      {signedInr(txn.amountPaise, txn.type)}
    </div>
  );
  const body = (
    <>
      <div className="leading-[1.1] tabular">
        <div className="text-lg font-extrabold">{dayOfMonth(txn.entryDate)}</div>
        <div className="text-[11px] text-neutral-700">{monthShort(txn.entryDate)}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold">{title}</div>
        <div className={cn('text-xs text-neutral-700', !detailed && 'truncate')}>{sub}</div>
        {detailed && (
          <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-neutral-600">
            <span>Recorded by {txn.recordedBy.name}</span>
            {txn.patientName && <span>Patient: {txn.patientName}</span>}
            {txn.fund && <span>From {txn.fund.name}</span>}
            {txn.hasReceipt && (
              <span className="flex items-center gap-[3px] text-accent-700">
                <Paperclip aria-hidden size={12} />
                Receipt
              </span>
            )}
          </div>
        )}
      </div>
      {detailed ? (
        <div className="flex flex-col items-end gap-1">
          {amount}
          {status ??
            (txn.canEdit ? (
              <span className="flex items-center gap-0.5 text-xs text-neutral-700">
                Edit
                <ChevronRight aria-hidden size={12} />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-neutral-600">
                <Lock aria-hidden size={12} />
                Locked
              </span>
            ))}
        </div>
      ) : (
        amount
      )}
    </>
  );
  const grid = cn(
    'grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule text-left',
    detailed ? 'py-3' : 'py-[11px]',
  );
  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${title}, ${signedInr(txn.amountPaise, txn.type)}`}
          className={cn(grid, 'border-x-0 border-t-0 bg-transparent text-ink hover:bg-white/60')}
        >
          {body}
        </button>
      ) : (
        <div className={grid}>{body}</div>
      )}
    </li>
  );
}
