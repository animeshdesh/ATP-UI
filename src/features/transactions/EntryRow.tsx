import { Lock, Paperclip, Pencil } from 'lucide-react';
import type { Person, Transaction } from '@/domain/types';
import { dayOfMonth, monthShort } from '@/lib/dates';
import { signedInr } from '@/lib/money';
import { cn } from '@/lib/cn';

interface Props {
  txn: Transaction;
  people: Record<string, Person> | undefined;
  /** Full row with recorder, patient, receipt and edit state (transactions list). */
  detailed?: boolean;
  editable?: boolean;
}

export function EntryRow({ txn, people, detailed, editable }: Props) {
  const name = (k: string) => people?.[k]?.shortName ?? k;
  const sub = [
    txn.category,
    txn.paymentMode,
    `${txn.type === 'expense' ? 'paid by' : 'received by'} ${name(txn.partyKey)}`,
  ].join(' · ');
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
  return (
    <li
      className={cn(
        'grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule',
        detailed ? 'py-3' : 'py-[11px]',
      )}
    >
      <div className="leading-[1.1] tabular">
        <div className="text-lg font-extrabold">{dayOfMonth(txn.entryDate)}</div>
        <div className="text-[11px] text-neutral-700">{monthShort(txn.entryDate)}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[15px] font-semibold">{txn.description}</div>
        <div className={cn('text-xs text-neutral-700', !detailed && 'truncate')}>{sub}</div>
        {detailed && (
          <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-neutral-600">
            <span>Recorded by {name(txn.recordedBy)}</span>
            {txn.patientName && <span>Patient: {txn.patientName}</span>}
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
          {editable ? (
            <span className="flex items-center gap-1 text-xs text-neutral-700">
              <Pencil aria-hidden size={12} />
              Edit
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-neutral-600">
              <Lock aria-hidden size={12} />
              Locked
            </span>
          )}
        </div>
      ) : (
        amount
      )}
    </li>
  );
}
