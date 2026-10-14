import type { RecurringItem, Tone } from '@/domain/types';
import { monthShort, todayIso } from '@/lib/dates';

export function recurringStatus(
  r: RecurringItem,
  today = todayIso(),
): { label: string; short: string; tone: Tone; overdue: boolean } {
  if (r.logged) return { label: 'Logged', short: 'Logged', tone: 'accent', overdue: false };
  const day = Number(today.slice(8, 10));
  const mon = monthShort(today);
  if (r.dayOfMonth < day)
    return {
      label: `Overdue · due ${r.dayOfMonth} ${mon}`,
      short: 'Overdue',
      tone: 'danger',
      overdue: true,
    };
  return {
    label: `Due ${r.dayOfMonth} ${mon}`,
    short: `Due ${r.dayOfMonth} ${mon}`,
    tone: 'neutral',
    overdue: false,
  };
}
