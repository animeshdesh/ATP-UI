import { describe, expect, it } from 'vitest';
import { dateRange, daysBetween, longDate, monthToDate, monthYear, todayIso } from './dates';

describe('dates', () => {
  it('uses the Asia/Kolkata calendar day', () => {
    // 20:00 UTC on 13 Oct is 01:30 IST on 14 Oct
    expect(todayIso(new Date('2026-10-13T20:00:00Z'))).toBe('2026-10-14');
  });

  it('formats design labels', () => {
    expect(longDate('2026-10-14')).toBe('Wed, 14 Oct 2026');
    expect(monthYear('2026-10-14')).toBe('October 2026');
    expect(monthToDate('2026-10-14')).toBe('1–14 Oct 2026');
    expect(dateRange('2026-10-01', '2026-10-14')).toBe('1–14 Oct 2026');
    expect(dateRange('2026-09-28', '2026-10-14')).toBe('28 Sep – 14 Oct 2026');
    expect(dateRange('2026-10-14', '2026-10-14')).toBe('14 Oct 2026');
  });

  it('counts calendar days for the 7-day edit window', () => {
    expect(daysBetween('2026-10-07', '2026-10-14')).toBe(7);
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1);
  });
});
