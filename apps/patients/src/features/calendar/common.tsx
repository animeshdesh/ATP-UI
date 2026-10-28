import { useMemo, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@atp/ui';
import { useTherapists } from '@/api/queries';
import type {
  Appointment,
  AppointmentSource,
  AppointmentStatus,
  Branch,
  StatusReason,
  Therapist,
} from '@/domain/types';
import { firstName } from '@/lib/contact';
import { dayLabel, dateOf, hm, minutesOf } from '@/lib/time';

export function useTherapistMap() {
  const { data = [] } = useTherapists();
  return useMemo(() => {
    const map = new Map(data.map((t) => [t.memberId, t]));
    return {
      /** Bookable: working hours, or a therapist-style (own-scope) role. */
      list: data.filter((t) => t.takesAppointments),
      /** Every member with appointments.manage (Availability can give them hours). */
      all: data,
      get: (id: string | null | undefined): Therapist | undefined => (id ? map.get(id) : undefined),
      name: (id: string | null | undefined) => (id && map.get(id)?.fullName) || 'Therapist',
      short: (id: string | null | undefined) => (id && map.get(id)?.shortName) || 'Therapist',
    };
  }, [data]);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled',
};

export const REASON_LABEL: Record<StatusReason, string> = {
  patient_request: 'Patient request',
  therapist_unavailable: 'Therapist unavailable',
  no_response: 'No response',
  rescheduled: 'Rescheduled',
  other: 'Other',
};

export const SOURCE_LABEL: Record<AppointmentSource, string> = {
  phone: 'Phone call',
  walk_in: 'Walk-in',
  web: 'Web request',
};

/** Default session fee for "Record payment" (PRD §9 open question: fees aren't configured yet). */
export const defaultFeePaise = (a: Pick<Appointment, 'visitType'>) =>
  a.visitType === 'home' ? 120_000 : 80_000;

/** "Tue 28 Oct, 10:00" */
export const whenLabel = (startsAt: string) =>
  `${dayLabel(dateOf(startsAt))}, ${hm(minutesOf(startsAt))}`;

/** Confirmation the staff member sends on WhatsApp themselves (V2a, D-045). */
export const confirmMessage = (a: Appointment, branch: Branch | undefined, therapist: string) =>
  `Hi ${firstName(a.patientName)}, your physiotherapy session at ATP Rehab ${branch?.name ?? ''} is confirmed for ${whenLabel(a.startsAt)} with ${therapist}.${branch?.address ? ` Address: ${branch.address}.` : ''}`;

export const reminderMessage = (a: Appointment, branch: Branch | undefined, therapist: string) =>
  `Hi ${firstName(a.patientName)}, a reminder of your physiotherapy session at ATP Rehab ${branch?.name ?? ''} on ${whenLabel(a.startsAt)} with ${therapist}.${branch?.address ? ` Address: ${branch.address}.` : ''}`;

/** Status pill used in lists, the agenda and the detail sheet. */
export function StatusTag({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border-2 px-2 py-px text-[11px] font-bold whitespace-nowrap',
        status === 'confirmed' && 'border-accent bg-accent text-ink',
        status === 'completed' && 'border-neutral-200 bg-neutral-200 text-neutral-800',
        status === 'no_show' && 'border-danger-bg bg-danger-bg text-danger-fg',
        status === 'cancelled' && 'border-neutral-400 bg-transparent text-neutral-700 line-through',
      )}
    >
      {status === 'completed' && <Check aria-hidden size={11} strokeWidth={3} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Calendar block colours per status (design BLK). */
export const BLOCK_CLASS: Record<AppointmentStatus, string> = {
  confirmed: 'bg-accent border-l-4 border-ink text-ink',
  completed: 'bg-neutral-200 border-l-4 border-neutral-500 text-neutral-800',
  no_show: 'bg-danger-bg border-l-4 border-danger text-danger-fg',
  cancelled: 'bg-neutral-100 border-l-4 border-neutral-300 text-neutral-600',
};

/** Single-choice chip (therapist, date, reason …). */
export function Chip({
  active,
  onClick,
  children,
  className,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** De-emphasised but still selectable (e.g. outside the preferred part of day). */
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 border-2 px-3 text-sm font-semibold whitespace-nowrap',
        active
          ? 'border-ink bg-accent font-extrabold text-ink'
          : muted
            ? 'border-neutral-400 bg-white text-neutral-700 hover:bg-accent-100'
            : 'border-ink bg-white text-ink hover:bg-accent-100',
        className,
      )}
    >
      {children}
    </button>
  );
}

export const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="kicker">{children}</div>
);
