import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  House,
  NotebookPen,
  Plus,
  Stethoscope,
  UserX,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { addDays, todayIso, useAuthedSession, useSession } from '@atp/core';
import { Loading, Segmented, cn } from '@atp/ui';
import { useAllHours, useCalendar } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import type { Appointment, TimeOff, WorkingHours } from '@/domain/types';
import {
  at,
  dateOf,
  dayLabel,
  dayMonth,
  hm,
  minutesOf,
  mondayOf,
  nowMinutes,
  toMinutes,
  weekdayOf,
  WEEKDAYS,
} from '@/lib/time';
import { useBooking } from './booking';
import { BLOCK_CLASS, Chip, StatusTag, useTherapistMap } from './common';

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;
const PX_PER_MIN = 0.825;
const y = (m: number) => (Math.min(Math.max(m, DAY_START), DAY_END) - DAY_START) * PX_PER_MIN;
const GRID_H = (DAY_END - DAY_START) * PX_PER_MIN;

/** Today's agenda on phones, day (therapist columns) or week grid on desktop (A-02). */
export function CalendarPage() {
  const session = useAuthedSession();
  const { can } = useSession();
  const booking = useBooking();
  const branch = useBranch();
  const therapists = useTherapistMap();
  const navigate = useNavigate();
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [filter, setFilter] = useState<string>('all');
  const ownOnly = !can('appointments.manage', 'all');
  const monday = mondayOf(date);
  const from = view === 'week' ? monday : date;
  const to = view === 'week' ? addDays(monday, 5) : date;
  const { data, isPending } = useCalendar(from, to);
  const scope = ownOnly
    ? therapists.list.filter((t) => t.memberId === session.memberId)
    : therapists.list.filter((t) => filter === 'all' || t.memberId === filter);
  const ids = scope.map((t) => t.memberId);
  const { data: hours = {} } = useAllHours(therapists.list.map((t) => t.memberId));
  const appts = (data?.appointments ?? []).filter(
    (a) => branch.matches(a.branchId) && ids.includes(a.therapistId),
  );
  const off = (data?.timeOff ?? []).filter((o) => ids.includes(o.memberId));

  // Re-render each minute for the "now" line.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  usePageHeader({
    title: 'Calendar',
    subtitle:
      view === 'day'
        ? `${WEEKDAYS[weekdayOf(date)]}, ${dayMonth(date)} ${date.slice(0, 4)}`
        : `${dayMonth(monday)} – ${dayMonth(addDays(monday, 5))} ${monday.slice(0, 4)}`,
    mobileTitle: ownOnly ? 'My day' : 'Today',
    mobileSubtitle: `${dayLabel(date)} ${date.slice(0, 4)}`,
    action: {
      label: 'New appointment',
      icon: Plus,
      onClick: () => booking.openNew({ date: date < today ? today : date }),
    },
  });

  const step = (n: number) => setDate((d) => addDays(d, view === 'week' ? n * 7 : n));
  const newAt = (therapistId: string | undefined, day: string, m: number) => {
    const t = therapistId ?? ids[0];
    const h = (hours[t ?? ''] ?? []).find(
      (r) =>
        r.weekday === weekdayOf(day) &&
        toMinutes(r.start) <= m &&
        m < toMinutes(r.end) &&
        branch.matches(r.branchId),
    );
    booking.openNew({
      therapistId: t,
      date: day,
      manual: hm(m),
      branchId: branch.current !== 'all' ? branch.current : (h?.branchId ?? branch.defaultId),
      visitType: h?.visitType ?? 'clinic',
    });
  };
  const notes = (a: Appointment) =>
    navigate(`/patients/${a.patientId}?tab=notes&appointment=${a.id}`);

  const therapistChips = !ownOnly && therapists.list.length > 1 && (
    <div className="-mx-4 flex flex-none gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
        All
      </Chip>
      {therapists.list.map((t) => (
        <Chip key={t.memberId} active={filter === t.memberId} onClick={() => setFilter(t.memberId)}>
          {t.shortName}
        </Chip>
      ))}
    </div>
  );

  return (
    <>
      {/* Phone: agenda */}
      <div className="flex flex-col gap-3.5 lg:hidden">
        <div className="flex items-center gap-1.5">
          <NavButton label="Previous day" onClick={() => step(-1)} icon={ChevronLeft} />
          <div className="flex min-h-11 flex-1 items-center justify-center gap-2 border-2 border-ink bg-white px-2.5 text-base font-extrabold">
            {dayLabel(date)}
            {date === today && (
              <span className="border-2 border-ink bg-accent px-1.5 text-[11px] font-bold">
                Today
              </span>
            )}
          </div>
          <NavButton label="Next day" onClick={() => step(1)} icon={ChevronRight} />
          {date !== today && (
            <button
              type="button"
              onClick={() => setDate(today)}
              className="h-11 border-2 border-ink bg-white px-3 text-sm font-bold"
            >
              Today
            </button>
          )}
        </div>
        {therapistChips}
        {isPending ? (
          <Loading label="Loading calendar" />
        ) : (
          <Agenda
            date={date}
            appts={appts}
            off={off}
            hours={ids.length === 1 ? (hours[ids[0]!] ?? []) : null}
            showTherapist={ids.length > 1}
            onOpen={(a) => booking.openDetail(a)}
            onStatus={(a, m) => booking.openDetail(a, m)}
            onNotes={can('patients.clinical') ? notes : undefined}
            onFree={(m) => newAt(ids.length === 1 ? ids[0] : undefined, date, m)}
          />
        )}
      </div>

      {/* Desktop: grid */}
      <div className="hidden min-h-0 flex-1 flex-col gap-4 lg:flex">
        <div className="flex flex-none flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <NavButton label="Previous" onClick={() => step(-1)} icon={ChevronLeft} small />
            <div className="flex h-10 min-w-[150px] items-center justify-center border-2 border-ink bg-white px-3 text-[15px] font-extrabold tabular">
              {view === 'day'
                ? dayLabel(date)
                : `${dayMonth(monday)} – ${dayMonth(addDays(monday, 5))}`}
            </div>
            <NavButton label="Next" onClick={() => step(1)} icon={ChevronRight} small />
            <button
              type="button"
              onClick={() => setDate(today)}
              className="h-10 border-2 border-ink bg-white px-3 text-[13px] font-bold"
            >
              Today
            </button>
          </div>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
            ]}
          />
          {view === 'week' && therapistChips}
          <Legend />
        </div>
        {isPending ? (
          <Loading label="Loading calendar" />
        ) : (
          <Grid
            columns={
              view === 'day'
                ? scope.map((t) => ({
                    key: t.memberId,
                    head: t.fullName,
                    sub: hoursLabel(
                      hours[t.memberId] ?? [],
                      date,
                      off.filter((o) => o.memberId === t.memberId),
                      branch.byId,
                    ),
                    day: date,
                    therapistId: t.memberId,
                    hours: (hours[t.memberId] ?? []).filter((r) => branch.matches(r.branchId)),
                    appts: appts.filter(
                      (a) => a.therapistId === t.memberId && dateOf(a.startsAt) === date,
                    ),
                    off: off.filter((o) => o.memberId === t.memberId),
                  }))
                : Array.from({ length: 6 }, (_, i) => addDays(monday, i)).map((d) => ({
                    key: d,
                    head: dayLabel(d),
                    sub: `${appts.filter((a) => dateOf(a.startsAt) === d && a.status !== 'cancelled').length} booked`,
                    day: d,
                    therapistId: ids.length === 1 ? ids[0] : undefined,
                    hours:
                      ids.length === 1
                        ? (hours[ids[0]!] ?? []).filter((r) => branch.matches(r.branchId))
                        : null,
                    appts: appts.filter((a) => dateOf(a.startsAt) === d),
                    off: ids.length === 1 ? off : [],
                  }))
            }
            today={today}
            showTherapist={view === 'week' && ids.length > 1}
            onOpen={(a) => booking.openDetail(a)}
            onEmpty={newAt}
          />
        )}
        <div className="text-xs text-neutral-700">
          Click an empty slot to start a new appointment. Grey areas are outside working hours.
        </div>
      </div>
    </>
  );
}

function hoursLabel(
  hours: WorkingHours[],
  date: string,
  off: TimeOff[],
  byId: (id: string) => { code: string } | undefined,
) {
  const day = hours.filter((h) => h.weekday === weekdayOf(date));
  if (off.some((o) => o.from <= at(date, 9 * 60) && o.to >= at(date, 19 * 60))) return 'On leave';
  if (!day.length) return 'Not working';
  return day
    .map(
      (h) =>
        `${h.start}–${h.end} ${h.visitType === 'home' ? 'Home·' : ''}${byId(h.branchId)?.code ?? ''}`,
    )
    .join(' · ');
}

function NavButton({
  label,
  onClick,
  icon: Icon,
  small,
}: {
  label: string;
  onClick: () => void;
  icon: typeof Check;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid flex-none place-items-center border-2 border-ink bg-white text-ink hover:bg-accent-100',
        small ? 'size-10' : 'size-11',
      )}
    >
      <Icon aria-hidden size={18} />
    </button>
  );
}

function Legend() {
  const item = (cls: string, label: string) => (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-3', cls)} />
      {label}
    </span>
  );
  return (
    <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-neutral-700">
      {item('bg-accent border-l-[3px] border-ink', 'Confirmed')}
      {item('bg-neutral-200 border-l-[3px] border-neutral-500', 'Completed')}
      {item('bg-danger-bg border-l-[3px] border-danger', 'No-show')}
      {item('hatch border border-neutral-400', 'Time off')}
    </div>
  );
}

type Row =
  | { kind: 'appt'; m: number; a: Appointment }
  | { kind: 'free'; m: number; end: number }
  | { kind: 'off'; m: number; end: number; label: string }
  | { kind: 'now'; m: number };

/** Free gaps of at least 30 min inside working hours, after now when the day is today. */
function freeGaps(
  date: string,
  hours: WorkingHours[],
  busy: Array<[number, number]>,
  earliest: number,
) {
  const out: Array<[number, number]> = [];
  for (const h of hours.filter((r) => r.weekday === weekdayOf(date))) {
    let t = Math.max(toMinutes(h.start), earliest);
    const end = toMinutes(h.end);
    for (const [s, e] of [...busy].sort((a, b) => a[0] - b[0])) {
      if (e <= t || s >= end) continue;
      if (s - t >= 30) out.push([t, s]);
      t = Math.max(t, e);
    }
    if (end - t >= 30) out.push([t, end]);
  }
  return out;
}

function Agenda({
  date,
  appts,
  off,
  hours,
  showTherapist,
  onOpen,
  onStatus,
  onNotes,
  onFree,
}: {
  date: string;
  appts: Appointment[];
  off: TimeOff[];
  /** One therapist shown: list their free gaps too. */
  hours: WorkingHours[] | null;
  showTherapist: boolean;
  onOpen: (a: Appointment) => void;
  onStatus: (a: Appointment, mode: 'complete' | 'no_show') => void;
  onNotes?: (a: Appointment) => void;
  onFree: (m: number) => void;
}) {
  const branch = useBranch();
  const therapists = useTherapistMap();
  const today = todayIso();
  const now = nowMinutes();
  const dayAppts = appts
    .filter((a) => dateOf(a.startsAt) === date)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const dayOff = off
    .filter((o) => o.from < at(addDays(date, 1), 0) && o.to > at(date, 0))
    .map((o) => ({
      s: dateOf(o.from) < date ? 0 : minutesOf(o.from),
      e: dateOf(o.to) > date ? 24 * 60 : minutesOf(o.to),
      label: (showTherapist ? `${therapists.short(o.memberId)} · ` : '') + (o.reason ?? 'Time off'),
    }));
  const rows: Row[] = [
    ...dayAppts.map((a) => ({ kind: 'appt' as const, m: minutesOf(a.startsAt), a })),
    ...dayOff.map((o) => ({ kind: 'off' as const, m: o.s, end: o.e, label: o.label })),
  ];
  if (hours && date >= today) {
    const busy: Array<[number, number]> = [
      ...dayAppts
        .filter((a) => a.status === 'confirmed')
        .map((a) => [minutesOf(a.startsAt), minutesOf(a.endsAt)] as [number, number]),
      ...dayOff.map((o) => [o.s, o.e] as [number, number]),
    ];
    const ranges = hours.filter((h) => branch.matches(h.branchId));
    for (const [s, e] of freeGaps(
      date,
      ranges,
      busy,
      date === today ? Math.ceil(now / 15) * 15 : 0,
    ))
      rows.push({ kind: 'free', m: s, end: e });
  }
  if (date === today) rows.push({ kind: 'now', m: now });
  rows.sort((a, b) => a.m - b.m || (a.kind === 'now' ? 1 : -1));
  const booked = dayAppts.filter((a) => a.status !== 'cancelled').length;

  return (
    <>
      <div className="flex flex-col border-t-2 border-divider">
        {!dayAppts.length && !rows.some((r) => r.kind === 'free') && (
          <div className="py-6 text-center text-sm text-neutral-700">Nothing booked.</div>
        )}
        {rows.map((r, i) => {
          if (r.kind === 'now')
            return (
              <div key="now" className="my-0.5 flex items-center gap-2">
                <span className="w-11 bg-ink px-1.5 py-0.5 text-center text-[11px] font-extrabold text-white tabular">
                  {hm(r.m)}
                </span>
                <div className="h-0.5 flex-1 bg-ink" />
              </div>
            );
          if (r.kind === 'free')
            return (
              <button
                key={`free-${i}`}
                type="button"
                onClick={() => onFree(r.m)}
                className="my-2 ml-[60px] flex min-h-11 items-center gap-2.5 border-2 border-dashed border-neutral-400 bg-transparent px-3 py-2 text-left text-[13px] text-neutral-700 hover:bg-accent-100"
              >
                <Plus aria-hidden size={15} />
                <span className="flex-1">
                  Free{' '}
                  <b className="text-ink tabular">
                    {hm(r.m)}–{hm(r.end)}
                  </b>
                </span>
                <span className="font-bold text-accent-700">Book</span>
              </button>
            );
          if (r.kind === 'off')
            return (
              <div
                key={`off-${i}`}
                className="my-2 ml-[60px] flex items-center gap-2.5 border border-neutral-400 px-3 py-2.5 text-[13px] text-neutral-800 hatch"
              >
                <Coffee aria-hidden size={15} />
                <span className="flex-1 font-semibold">{r.label}</span>
                <span className="tabular">
                  {r.m === 0 && r.end === 24 * 60
                    ? 'All day'
                    : `${hm(r.m)}–${hm(Math.min(r.end, 24 * 60 - 1))}`}
                </span>
              </div>
            );
          const a = r.a;
          const b = branch.byId(a.branchId);
          return (
            <div
              key={a.id}
              className="grid grid-cols-[50px_minmax(0,1fr)] gap-2.5 border-b border-rule py-2.5"
            >
              <div className="pt-1 leading-tight tabular">
                <div className="text-base font-extrabold">{hm(minutesOf(a.startsAt))}</div>
                <div className="text-xs text-neutral-700">{hm(minutesOf(a.endsAt))}</div>
              </div>
              <div
                className={cn(
                  'flex min-w-0 flex-col gap-2 border-l-4 pl-2.5',
                  a.status === 'confirmed'
                    ? 'border-accent'
                    : a.status === 'no_show'
                      ? 'border-danger'
                      : 'border-neutral-300',
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpen(a)}
                  className="flex min-h-11 flex-col justify-center gap-1 border-0 bg-transparent p-0 py-0.5 text-left text-ink"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-base font-bold',
                        a.status === 'cancelled' && 'line-through',
                      )}
                    >
                      {a.patientName}
                    </span>
                    <StatusTag status={a.status} />
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-700">
                    {showTherapist && (
                      <span className="font-semibold text-ink">
                        {therapists.short(a.therapistId)}
                      </span>
                    )}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 border border-divider px-1.5 text-xs text-ink',
                        a.visitType === 'home' ? 'bg-accent-100' : 'bg-white',
                      )}
                    >
                      {a.visitType === 'home' ? (
                        <House aria-hidden size={12} />
                      ) : (
                        <Stethoscope aria-hidden size={12} />
                      )}
                      {a.visitType === 'home' ? 'Home visit' : 'Clinic'}
                    </span>
                    {branch.current === 'all' && b && (
                      <span className="text-xs text-ink">{b.name}</span>
                    )}
                  </span>
                </button>
                {a.status === 'confirmed' && date <= today && (
                  <div className={cn('grid gap-1.5', onNotes ? 'grid-cols-3' : 'grid-cols-2')}>
                    <QuickButton icon={Check} onClick={() => onStatus(a, 'complete')}>
                      Completed
                    </QuickButton>
                    <QuickButton icon={UserX} onClick={() => onStatus(a, 'no_show')}>
                      No-show
                    </QuickButton>
                    {onNotes && (
                      <QuickButton icon={NotebookPen} onClick={() => onNotes(a)}>
                        Notes
                      </QuickButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-neutral-700">
        {booked} {booked === 1 ? 'appointment' : 'appointments'}
      </div>
    </>
  );
}

function QuickButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof Check;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-white text-[13px] font-semibold text-ink hover:bg-accent-100"
    >
      <Icon aria-hidden size={15} />
      {children}
    </button>
  );
}

interface Column {
  key: string;
  head: string;
  sub: string;
  day: string;
  therapistId?: string;
  /** Working hours to grey out around; null = don't grey (several therapists in one column). */
  hours: WorkingHours[] | null;
  appts: Appointment[];
  off: TimeOff[];
}

/** Side-by-side lanes for overlapping blocks (cancelled ones included, drawn faint). */
function lanes(appts: Appointment[]) {
  const sorted = [...appts].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const ends: string[] = [];
  const placed = sorted.map((a) => {
    let lane = ends.findIndex((e) => e <= a.startsAt);
    if (lane < 0) lane = ends.push(a.endsAt) - 1;
    else ends[lane] = a.endsAt;
    return { a, lane };
  });
  return placed.map((p) => ({ ...p, of: Math.max(1, ends.length) }));
}

function Grid({
  columns,
  today,
  showTherapist,
  onOpen,
  onEmpty,
}: {
  columns: Column[];
  today: string;
  showTherapist: boolean;
  onOpen: (a: Appointment) => void;
  onEmpty: (therapistId: string | undefined, day: string, m: number) => void;
}) {
  const branch = useBranch();
  const therapists = useTherapistMap();
  const now = nowMinutes();
  const hoursMarks = Array.from(
    { length: (DAY_END - DAY_START) / 60 + 1 },
    (_, i) => DAY_START + i * 60,
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col border-2 border-ink bg-white">
      <div className="flex flex-none border-b-2 border-ink">
        <div className="w-14 flex-none" />
        {columns.map((c) => (
          <div
            key={c.key}
            className={cn(
              'min-w-0 flex-1 border-l border-rule px-2.5 py-2',
              c.day === today && columns.length > 3 && 'bg-accent-100',
            )}
          >
            <div className="truncate text-sm font-extrabold">{c.head}</div>
            <div className="truncate text-[11px] text-neutral-700 tabular">{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: GRID_H }}>
          <div className="relative w-14 flex-none">
            {hoursMarks.map((m) => (
              <div
                key={m}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-neutral-700 tabular"
                style={{ top: y(m) }}
              >
                {m > DAY_START && m < DAY_END ? hm(m) : ''}
              </div>
            ))}
          </div>
          {columns.map((c) => {
            const day = c.hours?.filter((h) => h.weekday === weekdayOf(c.day)) ?? null;
            return (
              <div key={c.key} className="relative min-w-0 flex-1 border-l border-rule">
                {/* outside working hours */}
                {day && <Outside ranges={day.map((h) => [toMinutes(h.start), toMinutes(h.end)])} />}
                {hoursMarks.map((m) => (
                  <div
                    key={m}
                    className="pointer-events-none absolute inset-x-0 z-[1] border-t border-rule"
                    style={{ top: y(m) }}
                  />
                ))}
                {c.day >= today &&
                  Array.from(
                    { length: (DAY_END - DAY_START) / 15 },
                    (_, i) => DAY_START + i * 15,
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      tabIndex={-1}
                      aria-label={`New appointment ${dayLabel(c.day)} ${hm(m)}`}
                      title={`New appointment ${hm(m)}`}
                      onClick={() => onEmpty(c.therapistId, c.day, m)}
                      className="absolute inset-x-0 z-[2] border-0 bg-transparent p-0 hover:bg-accent-100/60"
                      style={{ top: y(m), height: 15 * PX_PER_MIN }}
                    />
                  ))}
                {c.off
                  .filter((o) => o.from < at(addDays(c.day, 1), 0) && o.to > at(c.day, 0))
                  .map((o) => {
                    const s = dateOf(o.from) < c.day ? DAY_START : minutesOf(o.from);
                    const e = dateOf(o.to) > c.day ? DAY_END : minutesOf(o.to);
                    return (
                      <div
                        key={o.id}
                        className="absolute inset-x-1 z-[3] flex items-start border border-neutral-400 px-1.5 py-1 text-[11px] font-semibold text-neutral-800 hatch"
                        style={{ top: y(s), height: Math.max(y(e) - y(s), 14) }}
                      >
                        {o.reason ?? 'Time off'}
                      </div>
                    );
                  })}
                {lanes(c.appts).map(({ a, lane, of }) => {
                  const s = minutesOf(a.startsAt);
                  const e = minutesOf(a.endsAt);
                  const b = branch.byId(a.branchId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a)}
                      className={cn(
                        'absolute z-[4] overflow-hidden border-0 px-1.5 py-0.5 text-left',
                        BLOCK_CLASS[a.status],
                        a.status === 'cancelled' && 'opacity-70',
                      )}
                      style={{
                        top: y(s) + 1,
                        height: Math.max(y(e) - y(s) - 2, 16),
                        left: `calc(${(lane / of) * 100}% + 2px)`,
                        width: `calc(${100 / of}% - 4px)`,
                      }}
                    >
                      <div
                        className={cn(
                          'truncate text-[12px] font-bold',
                          a.status === 'cancelled' && 'line-through',
                        )}
                      >
                        {a.patientName}
                      </div>
                      <div className="truncate text-[11px] tabular">
                        {hm(s)}–{hm(e)}
                        {showTherapist && ` · ${therapists.short(a.therapistId)}`}
                        {a.visitType === 'home' && ' · Home'}
                        {b && ` · ${b.code}`}
                      </div>
                    </button>
                  );
                })}
                {c.day === today && now >= DAY_START && now <= DAY_END && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-ink"
                    style={{ top: y(now) }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Grey bands outside the given working ranges. */
function Outside({ ranges }: { ranges: Array<[number, number]> }) {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const gaps: Array<[number, number]> = [];
  let t = DAY_START;
  for (const [s, e] of sorted) {
    if (s > t) gaps.push([t, s]);
    t = Math.max(t, e);
  }
  if (t < DAY_END) gaps.push([t, DAY_END]);
  return (
    <>
      {gaps.map(([s, e]) => (
        <div
          key={s}
          className="pointer-events-none absolute inset-x-0 z-0 bg-neutral-100"
          style={{ top: y(s), height: y(e) - y(s) }}
        />
      ))}
    </>
  );
}
