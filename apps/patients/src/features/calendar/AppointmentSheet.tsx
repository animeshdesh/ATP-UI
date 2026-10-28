import { useState } from 'react';
import { Check, CircleAlert, Search, TriangleAlert, UserPlus } from 'lucide-react';
import { ApiError, todayIso, useAuthedSession, useSession } from '@atp/core';
import { Avatar, Button, Sheet, useToast } from '@atp/ui';
import {
  useAllHours,
  useCalendar,
  useCreateAppointment,
  useCreatePatient,
  usePatients,
  useTimeOff,
  useUpdateAppointment,
} from '@/api/queries';
import { useBranch } from '@/app/branch';
import type { Appointment, PatientSummary } from '@/domain/types';
import { formatPhone, initialsOf, samePhone, toE164, waLink } from '@/lib/contact';
import { dateOf, dayLabel, hm, minutesOf, timeRange, toMinutes, weekdayOf } from '@/lib/time';
import { Kicker, confirmMessage, useTherapistMap, whenLabel } from './common';
import { SlotPicker, endOf, startOf, type PickerValue } from './SlotPicker';

export type NewPrefill = Partial<PickerValue> & { patientId?: string };

/** Who the user may book for: everyone with `appointments.manage` all, else just themselves. */
export function useBookableTherapists() {
  const { can } = useSession();
  const session = useAuthedSession();
  const { list } = useTherapistMap();
  return can('appointments.manage', 'all')
    ? list.map((t) => t.memberId)
    : list.filter((t) => t.memberId === session.memberId).map((t) => t.memberId);
}

/**
 * What the calendar already knows about the picked time: a clash with a confirmed appointment or
 * time off (can't book), or outside working hours (can book anyway). The API re-checks on save.
 */
export function useTimeCheck(v: PickerValue, ignoreId?: string) {
  const start = startOf(v);
  const end = endOf(v);
  const { data: cal } = useCalendar(v.date, v.date);
  const { data: off = [] } = useTimeOff();
  const { data: hours = {} } = useAllHours(v.therapistId ? [v.therapistId] : []);
  const therapists = useTherapistMap();
  if (!start || !end) return { clash: null, outside: false };
  const t = therapists.short(v.therapistId);
  const appt = cal?.appointments.find(
    (a) =>
      a.therapistId === v.therapistId &&
      a.status === 'confirmed' &&
      a.id !== ignoreId &&
      a.startsAt < end &&
      start < a.endsAt,
  );
  if (appt)
    return {
      clash: `${t} already has ${appt.patientName} at ${timeRange(appt.startsAt, appt.endsAt)}`,
      outside: false,
    };
  const o = off.find((x) => x.memberId === v.therapistId && x.from < end && start < x.to);
  if (o) {
    const sameDay = dateOf(o.from) === dateOf(o.to);
    const when = sameDay ? timeRange(o.from, o.to) : 'that day';
    return { clash: `${t} is off ${when}${o.reason ? ` (${o.reason})` : ''}`, outside: false };
  }
  const s = minutesOf(start);
  const e = s + v.duration;
  const inside = (hours[v.therapistId] ?? []).some(
    (h) =>
      h.weekday === weekdayOf(v.date) &&
      h.branchId === v.branchId &&
      toMinutes(h.start) <= s &&
      e <= toMinutes(h.end),
  );
  return { clash: null, outside: !inside };
}

/** New appointment (any screen's add button) or reschedule. */
export function AppointmentSheet({
  prefill,
  editing,
  onClose,
}: {
  prefill: NewPrefill;
  editing: Appointment | null;
  onClose: () => void;
}) {
  const session = useAuthedSession();
  const toast = useToast();
  const branches = useBranch();
  const therapists = useTherapistMap();
  const bookable = useBookableTherapists();
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const createPatient = useCreatePatient();

  const [v, setV] = useState<PickerValue>(() =>
    editing
      ? {
          branchId: editing.branchId,
          therapistId: editing.therapistId,
          date: dateOf(editing.startsAt) < todayIso() ? todayIso() : dateOf(editing.startsAt),
          slot: null,
          manual: hm(minutesOf(editing.startsAt)),
          duration: minutesOf(editing.endsAt) - minutesOf(editing.startsAt),
          visitType: editing.visitType,
          homeAddress: editing.homeAddress ?? '',
        }
      : {
          branchId: prefill.branchId ?? branches.defaultId,
          therapistId: prefill.therapistId ?? session.memberId,
          date: prefill.date ?? todayIso(),
          slot: prefill.slot ?? null,
          manual: prefill.manual ?? '',
          duration: prefill.duration ?? 45,
          visitType: prefill.visitType ?? 'clinic',
          homeAddress: prefill.homeAddress ?? '',
        },
  );
  const therapistId = bookable.includes(v.therapistId) ? v.therapistId : (bookable[0] ?? '');
  const value = { ...v, therapistId };
  const patch = (p: Partial<PickerValue>) => {
    setV((x) => ({ ...x, ...p }));
    if ('slot' in p || 'manual' in p || 'therapistId' in p || 'date' in p) setOverride(false);
  };

  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [patientId] = useState(prefill.patientId ?? editing?.patientId ?? null);
  const [q, setQ] = useState('');
  const [newP, setNewP] = useState<{ name: string; phone: string } | null>(null);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [override, setOverride] = useState(false);
  const { data: results = [] } = usePatients(q.trim());
  const { data: allPatients = [] } = usePatients('');
  const preset = patientId ? allPatients.find((p) => p.id === patientId) : null;
  const chosen = patient ?? preset ?? null;
  const dup =
    newP && toE164(newP.phone) ? allPatients.find((p) => samePhone(p.phone, newP.phone)) : null;

  const start = startOf(value);
  const end = endOf(value);
  const check = useTimeCheck(value, editing?.id);
  const patientOk = !!chosen || (!!newP && !!newP.name.trim() && !!toE164(newP.phone) && !dup);
  const ok = patientOk && !!start && !!therapistId && !check.clash && (!check.outside || override);
  const busy = create.isPending || update.isPending || createPatient.isPending;

  const choose = (p: PatientSummary) => {
    setPatient(p);
    setQ('');
    setNewP(null);
    patch({
      therapistId: p.therapistId && bookable.includes(p.therapistId) ? p.therapistId : therapistId,
      homeAddress: p.address ?? v.homeAddress,
    });
  };

  const save = async () => {
    if (!ok || !start || !end) return;
    const branch = branches.byId(value.branchId);
    const tName = therapists.name(therapistId);
    const body = {
      therapistId,
      branchId: value.branchId,
      visitType: value.visitType,
      homeAddress: value.visitType === 'home' ? value.homeAddress || null : null,
      startsAt: start,
      endsAt: end,
      notes: notes.trim() || null,
      force: check.outside && override,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: body });
        toast(
          `Moved ${editing.patientName} · ${whenLabel(start)} with ${tName} at ${branch?.name ?? ''}`,
        );
      } else {
        const pid =
          chosen?.id ??
          (
            await createPatient.mutateAsync({
              fullName: newP!.name.trim(),
              phone: toE164(newP!.phone)!,
              email: null,
              dateOfBirth: null,
              age: null,
              gender: 'unspecified',
              address: value.visitType === 'home' ? value.homeAddress || null : null,
              referralSource: null,
              referralNote: null,
              chiefComplaint: null,
              branchId: value.branchId,
            })
          ).id;
        const a = await create.mutateAsync({ ...body, patientId: pid, source: 'phone' });
        toast(`Booked ${a.patientName} · ${whenLabel(a.startsAt)} with ${tName}`, {
          action: {
            label: 'WhatsApp',
            onClick: () =>
              window.open(waLink(a.patientPhone, confirmMessage(a, branch, tName)), '_blank'),
          },
        });
      }
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'slot_taken') {
        patch({ slot: null, manual: '' });
        toast('Slot just got taken: pick another time', { danger: true });
      } else if (e instanceof ApiError && e.code === 'outside_hours') {
        setOverride(false);
        toast('Outside working hours. Check the time or book anyway.', { danger: true });
      } else toast(e instanceof Error ? e.message : 'Could not save. Try again.', { danger: true });
    }
  };

  const saveLabel = editing
    ? 'Save new time'
    : `Save${start && ok ? ` · ${dayLabel(value.date).split(' ')[0]} ${hm(minutesOf(start))}` : ''}`;

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? 'Reschedule' : 'New appointment'}
      subtitle={
        editing
          ? `${editing.patientName} · now ${whenLabel(editing.startsAt)}`
          : `Booked by ${session.user.shortName} · ${dayLabel(todayIso())}`
      }
      footer={
        <Button variant="primary" size="lg" icon={Check} disabled={!ok || busy} onClick={save}>
          {saveLabel}
        </Button>
      }
    >
      {!editing && (
        <div className="flex flex-col gap-2">
          <Kicker>Patient</Kicker>
          {chosen ? (
            <div className="flex items-center gap-3 border-2 border-ink bg-white px-3 py-2.5">
              <Avatar initials={initialsOf(chosen.fullName)} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{chosen.fullName}</span>
                <span className="block truncate text-xs text-neutral-700">
                  {formatPhone(chosen.phone)}
                  {chosen.chiefComplaint && ` · ${chosen.chiefComplaint}`}
                </span>
              </span>
              <Button
                size="sm"
                variant="link"
                onClick={() => {
                  setPatient(null);
                  setQ('');
                }}
              >
                Change
              </Button>
            </div>
          ) : newP ? (
            <div className="flex flex-col gap-2 border-2 border-ink bg-white p-3">
              <input
                aria-label="Full name"
                value={newP.name}
                onChange={(e) => setNewP({ ...newP, name: e.target.value })}
                placeholder="Full name"
                className="min-h-11 rounded-none border-2 border-ink px-3 text-[15px]"
              />
              <div className="flex border-2 border-ink">
                <span className="flex items-center border-r-2 border-ink px-2.5 text-sm font-semibold text-neutral-700">
                  +91
                </span>
                <input
                  aria-label="Phone"
                  value={newP.phone}
                  onChange={(e) =>
                    setNewP({ ...newP, phone: e.target.value.replace(/[^\d ]/g, '') })
                  }
                  inputMode="numeric"
                  placeholder="Phone"
                  className="min-h-10 min-w-0 flex-1 border-0 px-3 text-[15px] tabular outline-none"
                />
              </div>
              {dup && (
                <div className="flex items-center gap-2 border-2 border-warn-fg bg-warn-bg px-3 py-2 text-[13px] text-warn-fg">
                  <span className="flex-1">
                    {formatPhone(dup.phone)} already belongs to {dup.fullName}.
                  </span>
                  <Button size="sm" variant="outline" onClick={() => choose(dup)}>
                    Use
                  </Button>
                </div>
              )}
              <Button size="sm" variant="link" className="self-start" onClick={() => setNewP(null)}>
                Search instead
              </Button>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2.5 border-2 border-ink bg-white px-3">
                <Search aria-hidden size={17} />
                <input
                  aria-label="Find patient"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name or phone"
                  className="min-h-11 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
                />
              </label>
              {q.trim() &&
                (results.length ? (
                  <div className="flex flex-col border-2 border-ink bg-white">
                    {results.slice(0, 5).map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => choose(p)}
                        className={`flex items-center gap-3 border-0 bg-white px-3 py-2 text-left text-ink hover:bg-accent-100 ${i > 0 ? 'border-t border-rule' : ''}`}
                      >
                        <Avatar initials={initialsOf(p.fullName)} size={34} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{p.fullName}</span>
                          <span className="block text-xs text-neutral-700">
                            {formatPhone(p.phone)}
                            {p.lastVisit && ` · last visit ${dayLabel(dateOf(p.lastVisit))}`}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[13px] text-neutral-700">No patient found.</div>
                ))}
              <Button
                variant="outline"
                icon={UserPlus}
                className="self-start"
                onClick={() =>
                  setNewP(/\d/.test(q) ? { name: '', phone: q } : { name: q, phone: '' })
                }
              >
                New patient
              </Button>
            </>
          )}
        </div>
      )}

      <SlotPicker value={value} onChange={patch} allowManual therapistIds={bookable} />

      {check.clash && (
        <div
          role="alert"
          className="flex gap-2.5 border-2 border-danger-fg bg-danger-bg px-3.5 py-3 text-sm text-danger-fg"
        >
          <CircleAlert aria-hidden size={18} className="flex-none" />
          <span>{check.clash}. Pick another time.</span>
        </div>
      )}
      {check.outside && !override && (
        <div className="flex items-center gap-2.5 border-2 border-warn-fg bg-warn-bg py-2.5 pr-3 pl-3.5 text-sm text-warn-fg">
          <TriangleAlert aria-hidden size={18} className="flex-none" />
          <span className="flex-1">
            Outside {therapists.short(therapistId)}'s working hours at{' '}
            {branches.byId(value.branchId)?.name ?? 'this branch'}
          </span>
          <Button size="sm" variant="outline" onClick={() => setOverride(true)}>
            Book anyway
          </Button>
        </div>
      )}
      {check.outside && override && (
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-warn-fg">
          <TriangleAlert aria-hidden size={14} />
          Booking outside working hours.
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <Kicker>Notes (optional)</Kicker>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Bring MRI report"
          className="min-h-11 rounded-none border-2 border-ink bg-white px-3 text-[15px]"
        />
      </label>
    </Sheet>
  );
}
