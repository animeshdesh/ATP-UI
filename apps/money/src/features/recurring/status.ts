import type { RecurringItem, Tone } from '@atp/core';
import { monthShort, todayIso } from '@atp/core';

export function recurringStatus(
  r: RecurringItem,
  today = todayIso(),
): { label: string; short: string; tone: Tone; overdue: boolean } {
  if (r.logged) return { label: 'Logged', short: 'Logged', tone: 'accent', overdue: false };
  const due = `${Number(r.dueDate.slice(8, 10))} ${monthShort(r.dueDate)}`;
  if (r.dueDate < today)
    return { label: `Overdue · due ${due}`, short: 'Overdue', tone: 'danger', overdue: true };
  return { label: `Due ${due}`, short: `Due ${due}`, tone: 'neutral', overdue: false };
}

/** Quick-add prefill that logs a recurring item (clinic account, bank transfer). */
export const logPrefill = (r: RecurringItem) => ({
  type: 'expense' as const,
  categoryId: r.categoryId,
  amountPaise: r.expectedAmountPaise,
  description: r.name,
  recurringItemId: r.id,
  paymentMode: 'bank_transfer' as const,
  partyMemberId: null,
});
