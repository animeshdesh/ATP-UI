/*
 * Clinic-time helpers for the calendar. Appointment times are ISO instants; the UI works in
 * minutes since midnight on a clinic (Asia/Kolkata) calendar date.
 */
import { CLINIC_TZ, addDays, todayIso } from '@atp/core';
import type { PreferredSlot, Weekday } from '@/domain/types';

const partsFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function clinicParts(iso: string) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Clinic calendar date of an instant. */
export const dateOf = (iso: string) => clinicParts(iso).date;

/** Minutes since clinic midnight of an instant. */
export const minutesOf = (iso: string) => clinicParts(iso).minutes;

/** 570 → "09:30". */
export const hm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "09:30" → 570. */
export const toMinutes = (time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
};

/** Clinic date + minutes → ISO instant with the clinic offset (India has no DST). */
export const at = (date: string, minutes: number) => `${date}T${hm(minutes)}:00+05:30`;

export const timeRange = (startsAt: string, endsAt: string) =>
  `${hm(minutesOf(startsAt))}–${hm(minutesOf(endsAt))}`;

/** Minutes since clinic midnight, now. */
export const nowMinutes = () => minutesOf(new Date().toISOString());

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(date: string): Weekday {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) as Weekday;
}

/** Monday of the week containing `date`. */
export const mondayOf = (date: string) => addDays(date, -weekdayOf(date));

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "28 Oct" */
export const dayMonth = (date: string) =>
  `${Number(date.slice(8, 10))} ${MON[Number(date.slice(5, 7)) - 1]}`;

/** "Tue 28 Oct" */
export const dayLabel = (date: string) => `${DOW[weekdayOf(date)]} ${dayMonth(date)}`;

/** "Today", "Tomorrow", "Yesterday" or "Tue 28 Oct". */
export function relativeDay(date: string, today = todayIso()): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return dayLabel(date);
}

export const SLOT_LABEL: Record<PreferredSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  any: 'Any time',
};

/** Part of day a start time falls in (matches the public form's choices). */
export const slotOf = (minutes: number): Exclude<PreferredSlot, 'any'> =>
  minutes < 720 ? 'morning' : minutes < 960 ? 'afternoon' : 'evening';

/** "12 min ago", "3 h ago", "Yesterday", "2 days ago". */
export function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.round(min / 60)} h ago`;
  const days = Math.round(min / (24 * 60));
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
