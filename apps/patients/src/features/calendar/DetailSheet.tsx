import { useState } from 'react';
import {
  CalendarClock,
  Check,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  NotebookPen,
  Phone,
  User,
  UserX,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError, PAYMENT_MODE_LABEL, inr, rupeesToPaise, useSession } from '@atp/core';
import { Avatar, Button, Segmented, Sheet, cn, useToast } from '@atp/ui';
import { usePatient, useSetStatus } from '@/api/queries';
import { useBranch } from '@/app/branch';
import {
  PAYMENT_MODES_V2,
  type Appointment,
  type PaymentMode,
  type StatusReason,
} from '@/domain/types';
import { formatPhone, initialsOf, telLink, waLink } from '@/lib/contact';
import { dateOf, dayLabel, timeRange } from '@/lib/time';
import {
  Chip,
  Kicker,
  REASON_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  StatusTag,
  defaultFeePaise,
  reminderMessage,
  useTherapistMap,
} from './common';

export type DetailMode = 'view' | 'complete' | 'no_show' | 'cancelled';

/** One appointment: details, contact, and the status change (complete / no-show / cancel). */
export function DetailSheet({
  appointment,
  initialMode,
  onClose,
  onReschedule,
}: {
  appointment: Appointment;
  initialMode: DetailMode;
  onClose: () => void;
  onReschedule: (a: Appointment) => void;
}) {
  const { can } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const branches = useBranch();
  const therapists = useTherapistMap();
  const setStatus = useSetStatus();
  const [a, setA] = useState(appointment);
  const [mode, setMode] = useState<DetailMode>(initialMode);
  const [reason, setReason] = useState<StatusReason | null>(
    initialMode === 'no_show' ? 'no_response' : null,
  );
  const [note, setNote] = useState('');
  const profile = usePatient(a.patientId);
  const pkg = profile.data?.patient.activePackage ?? null;
  const [usePkg, setUsePkg] = useState(true);
  // Package visit: optional extra payment. Otherwise a fee (D-052): paid now in full, or later.
  const [pay, setPay] = useState(false);
  const [fee, setFee] = useState(String(defaultFeePaise(a) / 100));
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [amount, setAmount] = useState<string | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>('upi');
  const usingPkg = !!pkg && usePkg;

  const branch = branches.byId(a.branchId);
  const tName = therapists.name(a.therapistId);
  const canPay = can('patients.manage') && can('finance.entry.create');
  const feePaise = usingPkg ? null : rupeesToPaise(fee);
  const received = !canPay
    ? 0
    : usingPkg
      ? pay
        ? rupeesToPaise(amount ?? fee)
        : 0
      : when === 'now'
        ? (feePaise ?? 0)
        : 0;
  const pendingAfter = feePaise == null ? 0 : Math.max(feePaise - received, 0);

  const commit = async () => {
    try {
      if (mode === 'complete') {
        if (!usingPkg && !fee.trim()) return toast('Enter the visit fee', { danger: true });
        const next = await setStatus.mutateAsync({
          id: a.id,
          change: {
            status: 'completed',
            packageId: usingPkg ? pkg.id : null,
            feePaise,
            payment:
              received > 0
                ? {
                    amountPaise: received,
                    mode: payMode,
                    kind: a.visitType === 'home' ? 'home_visit' : 'session',
                  }
                : null,
          },
        });
        const parts = [
          received ? `${inr(received)} ${PAYMENT_MODE_LABEL[payMode]}` : '',
          pendingAfter ? `${inr(pendingAfter)} pending` : '',
        ].filter(Boolean);
        toast(`Completed · ${a.patientName}${parts.map((x) => ` · ${x}`).join('')}`);
        setA(next);
      } else if (mode === 'no_show' || mode === 'cancelled') {
        if (!reason) return toast('Pick a reason', { danger: true });
        const next = await setStatus.mutateAsync({
          id: a.id,
          change: { status: mode, reason, note: note.trim() || null },
        });
        toast(`${mode === 'cancelled' ? 'Cancelled' : 'Marked no-show'} · ${a.patientName}`);
        setA(next);
      }
      setMode('view');
    } catch (e) {
      toast(e instanceof ApiError || e instanceof Error ? e.message : 'Could not save.', {
        danger: true,
      });
    }
  };

  const undo = async () => {
    try {
      setA(await setStatus.mutateAsync({ id: a.id, change: { status: 'confirmed' } }));
      toast('Status reset to confirmed');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not undo.', { danger: true });
    }
  };

  const rows: Array<[string, string]> = [
    ['When', `${dayLabel(dateOf(a.startsAt))} · ${timeRange(a.startsAt, a.endsAt)}`],
    ['Therapist', tName],
    ['Branch', branch?.name ?? '—'],
    ['Location', a.visitType === 'home' ? `Home visit · ${a.homeAddress ?? ''}` : 'Clinic'],
    ['Source', SOURCE_LABEL[a.source]],
    ['Phone', formatPhone(a.patientPhone)],
  ];
  if (a.notes) rows.push(['Notes', a.notes]);
  if (a.statusReason)
    rows.push([
      'Reason',
      REASON_LABEL[a.statusReason] + (a.statusNote ? ` · ${a.statusNote}` : ''),
    ]);

  const footer =
    mode === 'view' ? (
      <Button size="lg" onClick={onClose}>
        Close
      </Button>
    ) : (
      <div className="flex gap-2">
        <Button size="lg" className="flex-1" onClick={() => setMode('view')}>
          Back
        </Button>
        {mode === 'complete' ? (
          <Button
            variant="primary"
            size="lg"
            icon={Check}
            className="flex-[2]"
            disabled={setStatus.isPending}
            onClick={commit}
          >
            Mark completed
          </Button>
        ) : (
          <button
            type="button"
            disabled={setStatus.isPending}
            onClick={commit}
            className="min-h-13 flex-[2] border-2 border-danger-fg bg-danger-bg text-base font-extrabold text-danger-fg"
          >
            {mode === 'cancelled' ? 'Cancel appointment' : 'Mark no-show'}
          </button>
        )}
      </div>
    );

  return (
    <Sheet open onClose={onClose} title="Appointment" subtitle={rows[0]![1]} footer={footer}>
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(a.patientName)} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold">{a.patientName}</span>
            <StatusTag status={a.status} />
          </div>
          {profile.data?.patient.chiefComplaint && (
            <div className="text-[13px] text-neutral-700">
              {profile.data.patient.chiefComplaint}
            </div>
          )}
        </div>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-2 border-ink bg-white px-4 py-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="self-center kicker">{k}</dt>
            <dd className="m-0 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {mode === 'view' && (
        <>
          {a.status === 'confirmed' ? (
            <div className="grid grid-cols-2 gap-2">
              <ActionButton icon={Check} primary onClick={() => setMode('complete')}>
                Completed
              </ActionButton>
              <ActionButton
                icon={UserX}
                onClick={() => {
                  setReason('no_response');
                  setMode('no_show');
                }}
              >
                No-show
              </ActionButton>
              <ActionButton
                icon={X}
                onClick={() => {
                  setReason(null);
                  setMode('cancelled');
                }}
              >
                Cancel
              </ActionButton>
              <ActionButton icon={CalendarClock} onClick={() => onReschedule(a)}>
                Reschedule
              </ActionButton>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 border-2 border-ink bg-white px-3.5 py-3 text-sm">
              <span className="flex-1">Marked {STATUS_LABEL[a.status].toLowerCase()}.</span>
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={undo}>
                Undo
              </Button>
            </div>
          )}
          <div className="flex flex-col border-2 border-ink bg-white">
            <LinkRow href={telLink(a.patientPhone)} icon={Phone}>
              Call patient
            </LinkRow>
            <LinkRow
              href={waLink(a.patientPhone, reminderMessage(a, branch, tName))}
              icon={MessageCircle}
              external
            >
              Send reminder on WhatsApp
            </LinkRow>
            <LinkRow
              icon={User}
              onClick={() => {
                onClose();
                navigate(`/patients/${a.patientId}`);
              }}
            >
              Open profile
            </LinkRow>
            {can('patients.clinical') && (
              <LinkRow
                icon={NotebookPen}
                onClick={() => {
                  onClose();
                  navigate(`/patients/${a.patientId}?tab=notes&appointment=${a.id}`);
                }}
              >
                Session notes
              </LinkRow>
            )}
          </div>
        </>
      )}

      {(mode === 'no_show' || mode === 'cancelled') && (
        <div className="flex flex-col gap-2.5">
          <Kicker>{mode === 'cancelled' ? 'Why cancel?' : 'Why no-show?'}</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(REASON_LABEL) as StatusReason[]).map((r) => (
              <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
                {REASON_LABEL[r]}
              </Chip>
            ))}
          </div>
          <Kicker>Note (optional)</Kicker>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the team should know"
            className="rounded-none border-2 border-ink bg-white px-3 py-2 text-base lg:text-[15px]"
          />
        </div>
      )}

      {mode === 'complete' && (
        <div className="flex flex-col gap-2.5">
          {pkg ? (
            <Toggle
              on={usePkg}
              onClick={() => setUsePkg(!usePkg)}
              label={`Use 1 session of ${pkg.name}`}
              sub={`${pkg.sessionsTotal - pkg.sessionsUsed} of ${pkg.sessionsTotal} left${usePkg ? ` → ${pkg.sessionsTotal - pkg.sessionsUsed - 1} after this` : ''}`}
            />
          ) : (
            <div className="text-[13px] text-neutral-700">No active package for this patient.</div>
          )}
          {usingPkg ? (
            canPay && (
              <>
                <Toggle
                  on={pay}
                  onClick={() => setPay(!pay)}
                  label="Record a payment too"
                  sub="Goes to ATP Money as income"
                />
                {pay && (
                  <>
                    <RupeeInput label="Amount" value={amount ?? fee} onChange={setAmount} />
                    <PayModes value={payMode} onChange={setPayMode} />
                  </>
                )}
              </>
            )
          ) : (
            <div className="flex flex-col gap-2.5 border-2 border-ink bg-white p-3">
              <Kicker>Visit fee</Kicker>
              <RupeeInput label="Visit fee" value={fee} onChange={setFee} />
              {canPay && (
                <Segmented
                  block
                  label="Payment"
                  value={when}
                  onChange={setWhen}
                  options={[
                    { value: 'now', label: 'Pay now' },
                    { value: 'later', label: 'Pay later' },
                  ]}
                />
              )}
              {canPay && when === 'now' && <PayModes value={payMode} onChange={setPayMode} />}
              {pendingAfter > 0 && (
                <div role="status" className="text-[13px] font-semibold text-warn-fg">
                  {inr(pendingAfter)} pending after this visit
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

function RupeeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center border-2 border-ink bg-white">
      <span className="px-3 text-lg font-extrabold">₹</span>
      <input
        aria-label={label}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
        className="min-h-12 min-w-0 flex-1 border-0 text-xl font-extrabold tabular outline-none"
      />
    </label>
  );
}

function PayModes({ value, onChange }: { value: PaymentMode; onChange: (m: PaymentMode) => void }) {
  return (
    <Segmented
      block
      label="Payment mode"
      value={value}
      onChange={onChange}
      options={PAYMENT_MODES_V2.map((m) => ({ value: m, label: PAYMENT_MODE_LABEL[m] }))}
    />
  );
}

function ActionButton({
  icon: Icon,
  primary,
  onClick,
  children,
}: {
  icon: typeof Check;
  primary?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-12 items-center justify-center gap-2 border-2 border-ink text-sm font-bold text-ink',
        primary ? 'bg-accent hover:bg-accent-400' : 'bg-white hover:bg-accent-100',
      )}
    >
      <Icon aria-hidden size={17} />
      {children}
    </button>
  );
}

function LinkRow({
  icon: Icon,
  href,
  external,
  onClick,
  children,
}: {
  icon: typeof Check;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  children: string;
}) {
  const cls =
    'flex min-h-12 items-center gap-3 border-0 border-b border-rule bg-white px-3.5 text-left text-[15px] font-semibold text-ink no-underline last:border-b-0 hover:bg-accent-100 hover:text-ink';
  const body = (
    <>
      <Icon aria-hidden size={18} />
      <span className="flex-1">{children}</span>
      {external ? (
        <ExternalLink aria-hidden size={14} />
      ) : (
        !href && <ChevronRight aria-hidden size={16} />
      )}
    </>
  );
  return href ? (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cls}
    >
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

function Toggle({
  on,
  onClick,
  label,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className="flex items-center gap-3 border-2 border-ink bg-white px-3 py-2.5 text-left text-ink hover:bg-accent-100"
    >
      <span
        className={cn(
          'grid size-6 flex-none place-items-center border-2 border-ink',
          on ? 'bg-accent' : 'bg-white',
        )}
      >
        {on && <Check aria-hidden size={15} strokeWidth={3} />}
      </span>
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-xs text-neutral-700">{sub}</span>
      </span>
    </button>
  );
}
