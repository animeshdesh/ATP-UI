import { useState } from 'react';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { addDays, todayIso, useAuthedSession, useSession } from '@atp/core';
import { Avatar, Button, Loading, Segmented, Sheet, cn, useToast } from '@atp/ui';
import {
  useAllHours,
  useCreateTimeOff,
  useDeleteTimeOff,
  useSetWorkingHours,
  useTimeOff,
} from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import type { Therapist, Weekday, WorkingHours } from '@/domain/types';
import { at, dateOf, dayLabel, hm, minutesOf, toMinutes, WEEKDAYS } from '@/lib/time';
import { Chip, Kicker, useTherapistMap } from '@/features/calendar/common';

const REASONS = ['Leave', 'Training', 'Personal', 'Lunch'] as const;

/** Working hours per branch and time off (A-03). Therapists see and edit only their own. */
export function AvailabilityPage() {
  const session = useAuthedSession();
  const { can } = useSession();
  const therapists = useTherapistMap();
  const [tab, setTab] = useState<'hours' | 'off'>('hours');
  const [adding, setAdding] = useState(false);
  const own = !can('appointments.manage', 'all');
  const [extra, setExtra] = useState<string[]>([]);
  const scope = own
    ? therapists.all.filter((t) => t.memberId === session.memberId)
    : therapists.all.filter((t) => t.takesAppointments || extra.includes(t.memberId));
  // Members with appointments.manage but no hours yet (e.g. an Owner who also treats).
  const others = own ? [] : therapists.all.filter((t) => !scope.includes(t));

  usePageHeader({
    title: 'Availability',
    subtitle: 'Working hours and time off',
    action: { label: 'Add time off', icon: Plus, onClick: () => setAdding(true) },
  });

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Availability"
        value={tab}
        onChange={setTab}
        className="self-start"
        options={[
          { value: 'hours', label: 'Working hours' },
          { value: 'off', label: 'Time off' },
        ]}
      />
      {tab === 'hours' ? (
        <>
          <Hours therapists={scope} />
          {others.length > 0 && (
            <label className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
              Set hours for another member
              <select
                aria-label="Set hours for another member"
                value=""
                onChange={(e) => e.target.value && setExtra((x) => [...x, e.target.value])}
                className="h-10 rounded-none border-2 border-ink bg-white px-2 text-base text-ink lg:text-sm"
              >
                <option value="">Choose…</option>
                {others.map((t) => (
                  <option key={t.memberId} value={t.memberId}>
                    {t.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      ) : (
        <TimeOffList memberIds={scope.map((t) => t.memberId)} onAdd={() => setAdding(true)} />
      )}
      {adding && <TimeOffSheet therapists={scope} onClose={() => setAdding(false)} />}
    </div>
  );
}

function Hours({ therapists }: { therapists: Therapist[] }) {
  const { data: hours, isPending } = useAllHours(therapists.map((t) => t.memberId));
  if (isPending || !hours) return <Loading label="Loading hours" />;
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {therapists.map((t) => (
          <HoursCard key={t.memberId} therapist={t} rows={hours[t.memberId] ?? []} />
        ))}
      </div>
      <div className="text-xs text-neutral-700">
        Free-slot chips come from these hours, minus time off and booked sessions.
      </div>
    </>
  );
}

function HoursCard({ therapist, rows }: { therapist: Therapist; rows: WorkingHours[] }) {
  const toast = useToast();
  const branch = useBranch();
  const save = useSetWorkingHours(therapist.memberId);
  const [draft, setDraft] = useState<WorkingHours[] | null>(null);
  const list = draft ?? rows;

  const commit = async (next: WorkingHours[], message: string) => {
    try {
      await save.mutateAsync(next);
      setDraft(null);
      toast(message);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', { danger: true });
    }
  };
  const edit = (i: number, patch: Partial<WorkingHours>) =>
    setDraft(list.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = (weekday: Weekday) => {
    const last = list.filter((r) => r.weekday === weekday).at(-1);
    const s = Math.min(last ? toMinutes(last.end) + 60 : 9 * 60, 19 * 60);
    setDraft([
      ...list,
      {
        weekday,
        start: hm(s),
        end: hm(Math.min(s + 120, 20 * 60)),
        branchId: branch.defaultId,
        visitType: 'clinic',
      },
    ]);
  };
  const copyMonday = () => {
    const mon = list.filter((r) => r.weekday === 0);
    const next = [
      ...list.filter((r) => r.weekday > 4 || r.weekday === 0),
      ...([1, 2, 3, 4] as Weekday[]).flatMap((d) => mon.map((r) => ({ ...r, weekday: d }))),
    ];
    void commit(next, `Copied Monday to Tue–Fri · ${therapist.shortName}`);
  };

  return (
    <section className="flex flex-col border-2 border-ink bg-white">
      <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <Avatar initials={therapist.initials} size={36} />
        <div className="flex-1 font-extrabold">{therapist.fullName}</div>
        {draft ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Check}
              disabled={save.isPending}
              onClick={() => commit(draft, `Saved hours · ${therapist.shortName}`)}
            >
              Save
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" icon={Pencil} onClick={() => setDraft(rows)}>
            Edit
          </Button>
        )}
      </div>
      {WEEKDAYS.map((name, d) => {
        const day = list.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === d);
        return (
          <div
            key={name}
            className="flex items-start gap-3 border-b border-rule px-4 py-2 last:border-b-0"
          >
            <div className="w-10 flex-none pt-1.5 text-sm font-bold">{name.slice(0, 3)}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {!day.length && <span className="pt-1.5 text-sm text-neutral-600">Not working</span>}
              {day.map(({ r, i }) =>
                draft ? (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <input
                      type="time"
                      step={900}
                      aria-label="From"
                      value={r.start}
                      onChange={(e) => edit(i, { start: e.target.value })}
                      className="h-10 rounded-none border-2 border-ink px-1.5 text-base tabular lg:text-sm"
                    />
                    <span>–</span>
                    <input
                      type="time"
                      step={900}
                      aria-label="To"
                      value={r.end}
                      onChange={(e) => edit(i, { end: e.target.value })}
                      className="h-10 rounded-none border-2 border-ink px-1.5 text-base tabular lg:text-sm"
                    />
                    <select
                      aria-label="Branch"
                      value={r.branchId}
                      onChange={(e) => edit(i, { branchId: e.target.value })}
                      className="h-10 rounded-none border-2 border-ink bg-white px-1.5 text-base lg:text-sm"
                    >
                      {branch.active.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Type"
                      value={r.visitType}
                      onChange={(e) =>
                        edit(i, { visitType: e.target.value as WorkingHours['visitType'] })
                      }
                      className="h-10 rounded-none border-2 border-ink bg-white px-1.5 text-base lg:text-sm"
                    >
                      <option value="clinic">Clinic</option>
                      <option value="home">Home visits</option>
                    </select>
                    <button
                      type="button"
                      aria-label="Remove range"
                      onClick={() => setDraft(list.filter((_, j) => j !== i))}
                      className="grid size-10 place-items-center border-2 border-ink bg-white"
                    >
                      <Trash2 aria-hidden size={15} />
                    </button>
                  </div>
                ) : (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-wrap items-center gap-2 border border-divider px-2 py-1 text-sm',
                      r.visitType === 'home' ? 'bg-accent-100' : 'bg-white',
                      !branch.matches(r.branchId) && 'opacity-35',
                    )}
                  >
                    <span className="font-bold tabular">
                      {r.start}–{r.end}
                    </span>
                    <span className="text-xs text-neutral-700">
                      {r.visitType === 'home' ? 'Home visits · ' : ''}
                      {branch.byId(r.branchId)?.name ?? ''}
                    </span>
                  </div>
                ),
              )}
            </div>
            {draft && (
              <button
                type="button"
                aria-label={`Add range on ${name}`}
                title="Add range"
                onClick={() => add(d as Weekday)}
                className="grid size-10 flex-none place-items-center border-2 border-ink bg-white"
              >
                <Plus aria-hidden size={15} />
              </button>
            )}
          </div>
        );
      })}
      {!draft && (
        <button
          type="button"
          onClick={copyMonday}
          disabled={!list.some((r) => r.weekday === 0)}
          className="flex min-h-11 items-center justify-center gap-2 border-0 border-t-2 border-ink bg-white text-sm font-semibold text-ink enabled:hover:bg-accent-100 disabled:text-neutral-500"
        >
          <Copy aria-hidden size={15} />
          Copy Monday to all weekdays
        </button>
      )}
    </section>
  );
}

function TimeOffList({ memberIds, onAdd }: { memberIds: string[]; onAdd: () => void }) {
  const toast = useToast();
  const therapists = useTherapistMap();
  const { data = [], isPending } = useTimeOff();
  const remove = useDeleteTimeOff();
  const rows = data.filter((o) => memberIds.includes(o.memberId) && o.to >= at(todayIso(), 0));
  const when = (from: string, to: string) => {
    const a = dateOf(from);
    const b = dateOf(to);
    const allDay = minutesOf(from) <= 8 * 60 && minutesOf(to) >= 19 * 60;
    if (a === b)
      return `${dayLabel(a)} · ${allDay ? 'all day' : `${hm(minutesOf(from))}–${hm(minutesOf(to))}`}`;
    return `${dayLabel(a)} – ${dayLabel(b)}${allDay ? ' · all day' : ''}`;
  };
  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" icon={Plus} className="lg:hidden" onClick={onAdd}>
        Add time off
      </Button>
      {isPending ? (
        <Loading label="Loading time off" />
      ) : !rows.length ? (
        <div className="text-sm text-neutral-700">No time off coming up.</div>
      ) : (
        <div className="flex flex-col border-2 border-ink bg-white">
          {rows.map((o) => {
            const [reason, note] = (o.reason ?? 'Time off').split(' · ');
            return (
              <div
                key={o.id}
                className="flex items-center gap-3 border-b border-rule px-3.5 py-3 last:border-b-0"
              >
                <Avatar initials={therapists.get(o.memberId)?.initials ?? '?'} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{therapists.name(o.memberId)}</span>
                    <span className="border border-neutral-400 px-1.5 text-[11px] font-bold hatch">
                      {reason}
                    </span>
                  </div>
                  <div className="text-sm">{when(o.from, o.to)}</div>
                  {note && <div className="text-xs text-neutral-700">{note}</div>}
                </div>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={async () => {
                    await remove.mutateAsync(o.id);
                    toast(`Removed time off · ${therapists.short(o.memberId)}`);
                  }}
                  className="grid size-10 place-items-center border-2 border-ink bg-white hover:bg-accent-100"
                >
                  <Trash2 aria-hidden size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-xs text-neutral-700">
        Time off shows on the calendar as hatched blocks and can't be booked.
      </div>
    </div>
  );
}

function TimeOffSheet({ therapists, onClose }: { therapists: Therapist[]; onClose: () => void }) {
  const toast = useToast();
  const create = useCreateTimeOff();
  const tomorrow = addDays(todayIso(), 1);
  const [f, setF] = useState({
    memberId: therapists[0]?.memberId ?? '',
    from: tomorrow,
    fromT: '09:00',
    to: tomorrow,
    toT: '13:00',
    reason: 'Leave' as (typeof REASONS)[number],
    note: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const start = at(f.from, toMinutes(f.fromT));
  const end = at(f.to || f.from, toMinutes(f.toT));
  const ok = !!f.memberId && end > start;
  const input = 'min-h-12 w-full rounded-none border-2 border-ink bg-white px-3 text-base tabular';

  const save = async () => {
    try {
      await create.mutateAsync({
        memberId: f.memberId,
        from: start,
        to: end,
        reason: f.note.trim() ? `${f.reason} · ${f.note.trim()}` : f.reason,
      });
      toast(
        `Time off added · ${therapists.find((t) => t.memberId === f.memberId)?.shortName ?? ''}`,
      );
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', { danger: true });
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add time off"
      subtitle="Blocks booking on the calendar"
      footer={
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          disabled={!ok || create.isPending}
          onClick={save}
        >
          Add time off
        </Button>
      }
    >
      {therapists.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Kicker>Therapist</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {therapists.map((t) => (
              <Chip
                key={t.memberId}
                active={f.memberId === t.memberId}
                onClick={() => set('memberId', t.memberId)}
              >
                {t.shortName}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">From</span>
          <input
            type="date"
            value={f.from}
            min={todayIso()}
            onChange={(e) =>
              setF((x) => ({
                ...x,
                from: e.target.value,
                to: x.to < e.target.value ? e.target.value : x.to,
              }))
            }
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Time</span>
          <input
            type="time"
            step={900}
            value={f.fromT}
            onChange={(e) => set('fromT', e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">To</span>
          <input
            type="date"
            value={f.to}
            min={f.from}
            onChange={(e) => set('to', e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Time</span>
          <input
            type="time"
            step={900}
            value={f.toT}
            onChange={(e) => set('toT', e.target.value)}
            className={input}
          />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <Kicker>Reason</Kicker>
        <Segmented
          block
          label="Reason"
          value={f.reason}
          onChange={(v) => set('reason', v)}
          options={REASONS.map((r) => ({ value: r, label: r }))}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Note (optional)</span>
        <input
          value={f.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="e.g. Conference in Mumbai"
          className={input}
        />
      </label>
      <div className="text-[13px] text-neutral-700">
        Booked sessions in this window stay; you'll see them flagged on the calendar.
      </div>
    </Sheet>
  );
}
