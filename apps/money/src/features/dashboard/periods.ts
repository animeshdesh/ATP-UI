import { addDays, addMonths, monthShort, monthStart, todayIso, weekStart } from '@atp/core';
import type { Period } from './PeriodSwitch';

export interface Range {
  from: string;
  to: string;
}

/** Selected period and the same span just before it, for "vs" comparisons. */
export function periodRanges(
  period: Period,
  today = todayIso(),
): { current: Range; previous: Range; vsLabel: string } {
  switch (period) {
    case 'today':
      return {
        current: { from: today, to: today },
        previous: { from: addDays(today, -1), to: addDays(today, -1) },
        vsLabel: 'yesterday',
      };
    case 'week': {
      const from = weekStart(today);
      return {
        current: { from, to: today },
        previous: { from: addDays(from, -7), to: addDays(today, -7) },
        vsLabel: 'last week',
      };
    }
    case 'month': {
      const prev = addMonths(today, -1);
      return {
        current: { from: monthStart(today), to: today },
        previous: { from: monthStart(prev), to: prev },
        vsLabel: monthShort(prev),
      };
    }
  }
}

/** "+10% vs Sep" ; null when there is nothing to compare against. */
export function change(current: number, previous: number, vsLabel: string): string | null {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  return `${pct > 0 ? '+' : ''}${pct}% vs ${vsLabel}`;
}
