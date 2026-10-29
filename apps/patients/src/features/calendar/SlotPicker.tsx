import { useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { addDays, todayIso } from '@atp/core';
import { Segmented, cn } from '@atp/ui';
import { api } from '@/api';
import { qk, useAllHours, useFreeSlots, useTimeOff } from '@/api/queries';
import { useBranch } from '@/app/branch';
import type { PreferredSlot, TimeOff, VisitType, WorkingHours } from '@/domain/types';
import {
  SLOT_LABEL,
  at,
  dateOf,
  dayMonth,
  hm,
  minutesOf,
  slotOf,
  toMinutes,
  weekdayOf,
} from '@/lib/time';
import { Chip, Kicker, useTherapistMap } from './common';

export interface PickerValue {
  branchId: string;
  therapistId: string;
  date: string;
  /** Picked free slot (ISO start). */
  slot: string | null;
  /** Typed "HH:MM" instead of a chip. */
  manual: string;
  duration: number;
  visitType: VisitType;
  homeAddress: string;
}

export const startOf = (v: PickerValue): string | null =>
  v.slot ?? (/^\d{1,2}:\d{2}$/.test(v.manual) ? at(v.date, toMinutes(v.manual)) : null);

export const endOf = (v: PickerValue): string | null => {
  const s = startOf(v);
  return s ? at(dateOf(s), minutesOf(s) + v.duration) : null;
};

const rangesOn = (hours: WorkingHours[] | undefined, date: string, branchId: string) =>
  (hours ?? []).filter((h) => h.weekday === weekdayOf(date) && h.branchId === branchId);

/** Whole working day at this branch covered by time off. */
function onLeave(ranges: WorkingHours[], off: TimeOff[], memberId: string, date: string) {
  return (
    ranges.length > 0 &&
    ranges.every((r) =>
      off.some(
        (o) =>
          o.memberId === memberId &&
          o.from <= at(date, toMinutes(r.start)) &&
          o.to >= at(date, toMinutes(r.end)),
      ),
    )
  );
}

/**
 * Branch → therapist → date → free time, plus duration and clinic/home. Shared by the new /
 * reschedule sheet and "Book from request". Free times come from the API (hours − time off −
 * confirmed appointments); typed times are checked when saving.
 */
export function SlotPicker({
  value,
  onChange,
  allowManual,
  preferred,
  therapistIds,
}: {
  value: PickerValue;
  onChange: (patch: Partial<PickerValue>) => void;
  allowManual?: boolean;
  preferred?: PreferredSlot | null;
  /** Therapists the user may book for (own scope → just themselves). */
  therapistIds: string[];
}) {
  const { active: branches } = useBranch();
  const therapists = useTherapistMap();
  const { data: hours = {} } = useAllHours(therapistIds);
  const { data: off = [] } = useTimeOff();
  const [more, setMore] = useState(false);
  const [pickDate, setPickDate] = useState(false);
  const today = todayIso();
  const days = Array.from({ length: 6 }, (_, i) => addDays(today, i));

  const reset = { slot: null, manual: '' };
  const counts = useQueries({
    queries: therapistIds.map((id) => {
      const q = {
        therapistId: id,
        branchId: value.branchId,
        date: value.date,
        duration: value.duration,
      };
      return { queryKey: qk.freeSlots(q), queryFn: () => api.getFreeSlots(q), staleTime: 0 };
    }),
  });
  const { data: free = [], isPending } = useFreeSlots({
    therapistId: value.therapistId,
    branchId: value.branchId,
    date: value.date,
    duration: value.duration,
  });

  const branch = branches.find((b) => b.id === value.branchId);
  const tShort = therapists.short(value.therapistId);
  const ranges = rangesOn(hours[value.therapistId], value.date, value.branchId);
  const leave = onLeave(ranges, off, value.therapistId, value.date);
  const pref = preferred && preferred !== 'any' ? preferred : null;
  const shown = more ? free : free.slice(0, 8);

  return (
    <>
      {branches.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Kicker>Branch</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {branches.map((b) => (
              <Chip
                key={b.id}
                active={b.id === value.branchId}
                onClick={() => onChange({ branchId: b.id, ...reset })}
                className="flex items-center gap-1.5"
              >
                <MapPin aria-hidden size={14} />
                {b.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {therapistIds.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Kicker>Therapist</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {therapistIds.map((id, i) => {
              const r = rangesOn(hours[id], value.date, value.branchId);
              const lv = onLeave(r, off, id, value.date);
              const n = counts[i]?.data?.length;
              const sub = lv
                ? 'On leave'
                : !r.length
                  ? 'Not here'
                  : n === undefined
                    ? '…'
                    : n
                      ? `${n} free`
                      : 'Full';
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={id === value.therapistId}
                  onClick={() => onChange({ therapistId: id, ...reset })}
                  className={cn(
                    'flex min-h-13 flex-col items-start justify-center border-2 border-ink px-3 py-1 text-left text-ink',
                    id === value.therapistId ? 'bg-accent' : 'bg-white hover:bg-accent-100',
                  )}
                >
                  <span className="text-sm font-bold">{therapists.short(id)}</span>
                  <span
                    className={cn(
                      'text-[11px]',
                      lv ? 'font-semibold text-danger-fg' : 'text-neutral-700',
                    )}
                  >
                    {sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Kicker>Date</Kicker>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === value.date}
              onClick={() => {
                setPickDate(false);
                onChange({ date: d, ...reset });
              }}
              className={cn(
                'flex min-h-13 min-w-14 flex-none flex-col items-center justify-center border-2 border-ink px-2 text-ink',
                d === value.date ? 'bg-accent' : 'bg-white hover:bg-accent-100',
              )}
            >
              <span className="text-[11px] font-semibold">
                {d === today
                  ? 'Today'
                  : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][weekdayOf(d)]}
              </span>
              <span className="text-sm font-extrabold tabular">{dayMonth(d)}</span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={pickDate || !days.includes(value.date)}
            onClick={() => setPickDate(true)}
            className={cn(
              'flex min-h-13 flex-none items-center gap-1.5 border-2 border-ink px-3 text-sm font-semibold text-ink',
              pickDate || !days.includes(value.date) ? 'bg-accent' : 'bg-white hover:bg-accent-100',
            )}
          >
            <CalendarDays aria-hidden size={15} />
            Other
          </button>
        </div>
        {(pickDate || !days.includes(value.date)) && (
          <input
            type="date"
            aria-label="Date"
            min={today}
            value={value.date}
            onChange={(e) => e.target.value && onChange({ date: e.target.value, ...reset })}
            className="min-h-11 rounded-none border-2 border-ink bg-white px-3 text-base lg:text-[15px]"
          />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Kicker>
          Free times · {tShort} at {branch?.name ?? 'branch'}
          {pref && ` · ${SLOT_LABEL[pref]} preferred`}
        </Kicker>
        {isPending ? (
          <div className="text-[13px] text-neutral-700">Finding free times…</div>
        ) : free.length ? (
          <div className="grid grid-cols-4 gap-1.5">
            {shown.map((s) => {
              const m = minutesOf(s);
              return (
                <Chip
                  key={s}
                  active={value.slot === s}
                  muted={!!pref && slotOf(m) !== pref}
                  onClick={() => onChange({ slot: s, manual: '' })}
                  className="px-1 tabular"
                >
                  {hm(m)}
                </Chip>
              );
            })}
          </div>
        ) : (
          <div className="text-[13px] text-neutral-700">
            {leave
              ? `${tShort} is on leave that day.`
              : !ranges.length
                ? `${tShort} isn't at ${branch?.name ?? 'this branch'} that day.`
                : `No free time for ${tShort} at ${branch?.name ?? 'this branch'} that day.`}{' '}
            Try another therapist or day.
          </div>
        )}
        {free.length > 8 && !more && (
          <button
            type="button"
            onClick={() => setMore(true)}
            className="self-start border-0 bg-transparent p-0 py-1 text-sm font-semibold text-accent-700 underline"
          >
            More times ({free.length - 8})
          </button>
        )}
        {allowManual && (
          <label className="mt-1 flex items-center gap-2.5 text-[13px] text-neutral-700">
            <span>Or type a time</span>
            <input
              type="time"
              step={900}
              value={value.manual}
              onChange={(e) => onChange({ manual: e.target.value, slot: null })}
              className="min-h-11 rounded-none border-2 border-ink bg-white px-2 text-base text-ink tabular lg:text-[15px]"
            />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Kicker>Duration</Kicker>
          <Segmented
            block
            label="Duration"
            value={String(value.duration)}
            onChange={(v) => onChange({ duration: Number(v), slot: null })}
            options={[
              { value: '30', label: '30' },
              { value: '45', label: '45' },
              { value: '60', label: '60 min' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Kicker>Location</Kicker>
          <Segmented
            block
            label="Location"
            value={value.visitType}
            onChange={(v) => onChange({ visitType: v })}
            options={[
              { value: 'clinic', label: 'Clinic' },
              { value: 'home', label: 'Home' },
            ]}
          />
        </div>
      </div>
      {value.visitType === 'home' && (
        <label className="flex flex-col gap-1.5">
          <Kicker>Home address</Kicker>
          <textarea
            rows={2}
            value={value.homeAddress}
            onChange={(e) => onChange({ homeAddress: e.target.value })}
            placeholder="Flat, building, area"
            className="rounded-none border-2 border-ink bg-white px-3 py-2 text-base lg:text-[15px]"
          />
        </label>
      )}
    </>
  );
}
