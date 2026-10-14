/** All clinic dates are Asia/Kolkata calendar dates, ISO `YYYY-MM-DD`. */
export const CLINIC_TZ = 'Asia/Kolkata';

const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayIso(now: Date = new Date()): string {
  return isoFmt.format(now);
}

function parts(iso: string): { y: number; m: number; d: number } {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return { y, m, d };
}

const asUtc = (iso: string) => {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d));
};

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...opts }).format(asUtc(iso));

/** "Wed, 14 Oct 2026" */
export const longDate = (iso: string) => `${shortWeekday(iso)} ${parts(iso).y}`;

/** "Wed, 14 Oct" */
export const shortWeekday = (iso: string) =>
  fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });

/** "October 2026" */
export const monthYear = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' });

/** "Oct" */
export const monthShort = (iso: string) => fmt(iso, { month: 'short' });

/** "14" → zero-padded day of month */
export const dayOfMonth = (iso: string) => String(parts(iso).d).padStart(2, '0');

/** "1–14 Oct 2026": month start to the given day */
export const monthToDate = (iso: string) => {
  const { d } = parts(iso);
  return `1–${d} ${fmt(iso, { month: 'short', year: 'numeric' })}`;
};

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((asUtc(toIso).getTime() - asUtc(fromIso).getTime()) / 86_400_000);
}

/** Whole seconds elapsed since an epoch-ms timestamp, at least 1. */
export function secondsSince(epochMs: number): number {
  return Math.max(1, Math.round((Date.now() - epochMs) / 1000));
}
