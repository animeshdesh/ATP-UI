import { useState } from 'react';
import {
  Check,
  ExternalLink,
  MessageCircle,
  MessageSquareText,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { ApiError, todayIso, useAuthedSession } from '@atp/core';
import { Button, Sheet, useToast } from '@atp/ui';
import { useConvertInquiry, usePatients } from '@/api/queries';
import { useBranch } from '@/app/branch';
import type { Appointment, Inquiry } from '@/domain/types';
import { formatPhone, samePhone, waLink } from '@/lib/contact';
import { SLOT_LABEL, dateOf, dayLabel, hm, minutesOf, relativeDay, timeRange } from '@/lib/time';
import { useBookableTherapists } from '@/features/calendar/AppointmentSheet';
import { Kicker, confirmMessage, useTherapistMap, whenLabel } from '@/features/calendar/common';
import { SlotPicker, endOf, startOf, type PickerValue } from '@/features/calendar/SlotPicker';

export const preferredLabel = (i: Inquiry) =>
  `${i.preferredDate ? relativeDay(i.preferredDate) : 'Any day'} · ${SLOT_LABEL[i.preferredSlot]}`;

/** Book from request (A-01 → A-02): find or create the patient by phone, pick a free slot. */
export function ConvertSheet({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const session = useAuthedSession();
  const toast = useToast();
  const branches = useBranch();
  const therapists = useTherapistMap();
  const bookable = useBookableTherapists();
  const convert = useConvertInquiry();
  const { data: patients = [] } = usePatients('');
  const match = patients.find((p) => samePhone(p.phone, inquiry.phone)) ?? null;
  const [done, setDone] = useState<Appointment | null>(null);
  const today = todayIso();
  const [v, setV] = useState<PickerValue>({
    branchId: inquiry.branchId ?? branches.defaultId,
    therapistId: match?.therapistId ?? '',
    date: inquiry.preferredDate && inquiry.preferredDate > today ? inquiry.preferredDate : today,
    slot: null,
    manual: '',
    duration: 45,
    visitType: /home visit/i.test(inquiry.reason ?? '') ? 'home' : 'clinic',
    homeAddress: match?.address ?? '',
  });
  const therapistId = bookable.includes(v.therapistId)
    ? v.therapistId
    : (bookable[0] ?? session.memberId);
  const value = { ...v, therapistId };
  const start = startOf(value);
  const branch = branches.byId(value.branchId);
  // Phone is unique per patient (PRD §6.3): a known number always books that patient.
  const patientName = match ? match.fullName : inquiry.fullName;

  const run = async (withAppointment: boolean) => {
    try {
      const end = endOf(value);
      const res = await convert.mutateAsync({
        id: inquiry.id,
        patientId: match?.id ?? null,
        appointment:
          withAppointment && start && end
            ? {
                therapistId,
                branchId: value.branchId,
                visitType: value.visitType,
                homeAddress: value.visitType === 'home' ? value.homeAddress || null : null,
                startsAt: start,
                endsAt: end,
              }
            : null,
      });
      if (res.appointment) setDone(res.appointment);
      else {
        toast(`Saved ${res.patient.fullName} to patients`);
        onClose();
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'slot_taken') {
        setV((x) => ({ ...x, slot: null }));
        toast('Slot just got taken: pick another time', { danger: true });
      } else toast(e instanceof Error ? e.message : 'Could not book. Try again.', { danger: true });
    }
  };

  const msg = done
    ? confirmMessage({ ...done, patientName }, branch, therapists.name(done.therapistId))
    : '';

  return (
    <Sheet
      open
      onClose={onClose}
      title={done ? 'Booked' : 'Book from request'}
      subtitle={`${inquiry.fullName} · ${preferredLabel(inquiry)} · ${branches.byId(inquiry.branchId)?.name ?? ''}`}
      footer={
        done ? (
          <Button variant="primary" size="lg" onClick={onClose}>
            Done
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              size="lg"
              className="flex-1"
              disabled={convert.isPending}
              onClick={() => run(false)}
            >
              Save patient only
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={Check}
              className="flex-[2]"
              disabled={!start || convert.isPending}
              onClick={() => run(true)}
            >
              {start
                ? `Confirm · ${dayLabel(value.date).split(' ')[0]} ${hm(minutesOf(start))}`
                : 'Confirm booking'}
            </Button>
          </div>
        )
      }
    >
      {done ? (
        <div className="flex flex-col gap-4">
          <div className="grid size-14 place-items-center border-2 border-ink bg-accent">
            <Check aria-hidden size={28} strokeWidth={3} />
          </div>
          <div>
            <div className="text-xl font-extrabold">{patientName}</div>
            <div className="font-semibold">
              {dayLabel(dateOf(done.startsAt))} · {timeRange(done.startsAt, done.endsAt)}
            </div>
            <div className="text-sm text-neutral-700">
              {therapists.name(done.therapistId)} ·{' '}
              {done.visitType === 'home' ? 'Home visit from ' : ''}
              {branch?.name}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Kicker>WhatsApp message</Kicker>
            <div className="border-2 border-ink bg-white px-3.5 py-3 text-sm leading-snug">
              {msg}
            </div>
          </div>
          <a
            href={waLink(inquiry.phone, msg)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-13 items-center justify-between border-2 border-ink bg-accent px-4 font-extrabold text-ink no-underline hover:bg-accent-400 hover:text-ink"
          >
            <span className="flex items-center gap-2.5">
              <MessageCircle aria-hidden size={19} />
              Send on WhatsApp
            </span>
            <ExternalLink aria-hidden size={16} />
          </a>
          <div className="-mt-2 text-[13px] text-neutral-700">
            Opens WhatsApp with this message filled in. You press send.
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Kicker>1 · Patient</Kicker>
            {match ? (
              <div className="border-2 border-ink bg-white">
                <div className="flex gap-2.5 px-3.5 py-3">
                  <UserCheck aria-hidden size={19} className="mt-0.5 flex-none" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-accent-800">Existing patient found</div>
                    <div className="font-extrabold">{match.fullName}</div>
                    <div className="text-xs text-neutral-700">
                      {formatPhone(match.phone)}
                      {match.lastVisit &&
                        ` · last visit ${relativeDay(dateOf(match.lastVisit)).toLowerCase()}`}
                    </div>
                    {match.nextAppointment && (
                      <div className="mt-1 text-xs font-semibold text-warn-fg">
                        Already booked: {whenLabel(match.nextAppointment.startsAt)} with{' '}
                        {therapists.short(match.nextAppointment.therapistId)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 border-2 border-ink bg-white px-3.5 py-3 text-sm">
                <UserPlus aria-hidden size={18} className="mt-0.5 flex-none" />
                <div>
                  <b>New patient.</b> {inquiry.fullName} · {formatPhone(inquiry.phone)} will be
                  added to patients.
                </div>
              </div>
            )}
            {inquiry.reason && (
              <div className="flex items-start gap-2 text-sm text-neutral-800">
                <MessageSquareText aria-hidden size={16} className="mt-0.5 flex-none" />“
                {inquiry.reason}”
              </div>
            )}
          </div>
          <Kicker>2 · Time</Kicker>
          <SlotPicker
            value={value}
            onChange={(p) => setV((x) => ({ ...x, ...p }))}
            preferred={inquiry.preferredSlot}
            therapistIds={bookable}
          />
        </>
      )}
    </Sheet>
  );
}
