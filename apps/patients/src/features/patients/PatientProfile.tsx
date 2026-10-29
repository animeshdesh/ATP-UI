import { useState } from 'react';
import {
  CalendarPlus,
  ChevronLeft,
  CircleCheck,
  IndianRupee,
  Link2,
  Lock,
  MessageCircle,
  Package as PackageIcon,
  Phone,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { PAYMENT_MODE_LABEL, inr, todayIso, useAuthedSession, useSession } from '@atp/core';
import { Avatar, Button, Dialog, Field, Input, Loading, cn, useToast } from '@atp/ui';
import { useCreateNote, useNotes, usePatient, useUpdatePatient } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import { MONEY_URL } from '@/app/nav';
import type { NoteKind, Package, PatientProfile as Profile, PatientVisit } from '@/domain/types';
import { formatPhone, initialsOf, telLink, waLink } from '@/lib/contact';
import { dateOf, dayLabel, dayMonth, relativeDay, timeRange } from '@/lib/time';
import { useBooking } from '@/features/calendar/booking';
import {
  Chip,
  StatusTag,
  defaultFeePaise,
  useTherapistMap,
  whenLabel,
} from '@/features/calendar/common';
import { RecordPaymentSheet, SellPackageSheet } from './MoneySheets';
import { GENDER_LABEL, REFERRAL_LABEL } from './NewPatientSheet';

type Tab = 'overview' | 'notes' | 'visits' | 'payments';
const TABS: Array<[Tab, string]> = [
  ['overview', 'Overview'],
  ['notes', 'Notes'],
  ['visits', 'Visits'],
  ['payments', 'Payments'],
];

const NOTE_LABEL: Record<NoteKind, string> = {
  diagnosis: 'Diagnosis',
  plan: 'Treatment plan',
  session: 'Session',
  general: 'General',
};
const NOTE_TAG: Record<NoteKind, string> = {
  diagnosis: 'border-accent-100 bg-accent-100 text-accent-800',
  plan: 'border-ink bg-transparent text-ink',
  session: 'border-neutral-200 bg-neutral-200 text-neutral-800',
  general: 'border-neutral-400 bg-transparent text-neutral-700',
};

/** Profile: details, clinical notes (patients.clinical), visits, payments and packages. */
export function PatientProfile() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab | null) ?? 'overview';
  const { data, isPending, error } = usePatient(id);
  const booking = useBooking();
  const p = data?.patient;

  usePageHeader({
    title: 'Patient',
    subtitle: p ? `Patients / ${p.fullName}` : 'Patients',
    mobileTitle: p?.fullName ?? 'Patient',
    mobileSubtitle: 'Patient',
    action: p
      ? {
          label: 'Book appointment',
          icon: CalendarPlus,
          onClick: () =>
            booking.openNew({
              patientId: p.id,
              homeAddress: p.address ?? '',
              ...(p.therapistId ? { therapistId: p.therapistId } : {}),
            }),
        }
      : undefined,
  });

  if (isPending) return <Loading label="Loading patient" />;
  if (error || !data || !p)
    return (
      <div className="flex flex-col items-start gap-3">
        <div className="text-sm text-neutral-700">{error?.message ?? 'Patient not found.'}</div>
        <Link to="/patients">All patients</Link>
      </div>
    );

  const meta = [
    p.age && `${p.age} y`,
    p.gender !== 'unspecified' && GENDER_LABEL[p.gender],
    formatPhone(p.phone),
  ]
    .filter(Boolean)
    .join(' · ');
  const book = () =>
    booking.openNew({
      patientId: p.id,
      homeAddress: p.address ?? '',
      ...(p.therapistId ? { therapistId: p.therapistId } : {}),
    });

  return (
    <div className="flex flex-col gap-4 lg:max-w-[880px]">
      <Link
        to="/patients"
        className="-my-3 flex items-center gap-1 self-start py-3 text-sm font-semibold no-underline lg:my-0 lg:py-0"
      >
        <ChevronLeft aria-hidden size={16} />
        All patients
      </Link>
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="mr-auto hidden items-center gap-3.5 lg:flex">
          <Avatar initials={initialsOf(p.fullName)} filled size={40} />
          <div>
            <h2 className="text-[28px]">{p.fullName}</h2>
            <div className="text-sm text-neutral-800">{meta}</div>
          </div>
        </div>
        <div className="w-full text-sm text-neutral-800 lg:hidden">{meta}</div>
        <div className="grid w-full grid-cols-3 gap-2 lg:flex lg:w-auto">
          <a
            href={telLink(p.phone)}
            className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-white px-3 text-sm font-bold text-ink no-underline hover:bg-accent-100 hover:text-ink"
          >
            <Phone aria-hidden size={16} />
            Call
          </a>
          <a
            href={waLink(p.phone, `Hi ${p.fullName.split(' ')[0]}, this is ATP Rehab.`)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-white px-3 text-sm font-bold text-ink no-underline hover:bg-accent-100 hover:text-ink"
          >
            <MessageCircle aria-hidden size={16} />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={book}
            className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-accent px-3 text-sm font-extrabold text-ink hover:bg-accent-400"
          >
            <CalendarPlus aria-hidden size={16} />
            Book
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Profile"
        className="grid grid-cols-4 border-2 border-ink bg-white lg:inline-grid lg:self-start"
      >
        {TABS.map(([v, label], i) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setParams(v === 'overview' ? {} : { tab: v }, { replace: true })}
            className={cn(
              'min-h-11 border-0 px-4 text-[13px] font-semibold text-ink',
              i > 0 && 'border-l-2 border-ink',
              tab === v ? 'bg-accent font-extrabold' : 'bg-white hover:bg-accent-100',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview data={data} onBook={book} />}
      {tab === 'notes' && <Notes data={data} appointmentId={params.get('appointment')} />}
      {tab === 'visits' && <Visits data={data} />}
      {tab === 'payments' && <Payments data={data} />}
    </div>
  );
}

const Card = ({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn('flex flex-col gap-2 border-2 border-ink bg-white p-4', className)}>
    {title && <div className="kicker">{title}</div>}
    {children}
  </section>
);

function PackageLine({ k }: { k: Package }) {
  const left = k.sessionsTotal - k.sessionsUsed;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-extrabold">{k.name}</span>
        <span className="font-bold tabular">{left} left</span>
      </div>
      <div className="h-2 border border-ink bg-white">
        <div
          className="h-full bg-accent"
          style={{ width: `${(k.sessionsUsed / k.sessionsTotal) * 100}%` }}
        />
      </div>
      <div className="text-xs text-neutral-700">
        {k.sessionsUsed} of {k.sessionsTotal} used · sold {dayMonth(k.soldOn)}
      </div>
    </div>
  );
}

/** How the visit was paid (D-052): package, or paid / part-paid / pending against its fee. */
function VisitPayment({ a }: { a: PatientVisit }) {
  if (a.status !== 'completed') return null;
  if (a.packageId) return <> · Package</>;
  if (a.feePaise == null || !a.paymentStatus) return null;
  const fee = inr(a.feePaise);
  if (a.paymentStatus === 'paid') return <> · {fee} paid</>;
  return (
    <b className="text-warn-fg">
      {' '}
      · {fee} {a.paymentStatus === 'part' ? 'part-paid' : 'pending'}
    </b>
  );
}

/** Planned course (D-053): sessions done across therapists against the plan. */
function PlanCard({ data }: { data: Profile }) {
  const { can } = useSession();
  const p = data.patient;
  const [editing, setEditing] = useState(false);
  const done = p.sessionsDone;
  const plan = p.plannedSessions;
  return (
    <Card title="Treatment plan">
      {plan ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-extrabold">
              {Math.min(done, plan)} of {plan} sessions
            </span>
            <span className="font-bold tabular">
              {done >= plan ? 'Plan complete' : `${plan - done} left`}
            </span>
          </div>
          <div className="h-2 border border-ink bg-white">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.min(done / plan, 1) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-neutral-700">
          {done} {done === 1 ? 'session' : 'sessions'} done · no plan set
        </div>
      )}
      {can('patients.manage') && (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setEditing(true)}>
          {plan ? 'Edit plan' : 'Set plan'}
        </Button>
      )}
      {editing && <PlanDialog patientId={p.id} plan={plan} onClose={() => setEditing(false)} />}
    </Card>
  );
}

function PlanDialog({
  patientId,
  plan,
  onClose,
}: {
  patientId: string;
  plan: number | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const update = useUpdatePatient();
  const [value, setValue] = useState(plan ? String(plan) : '');
  const [error, setError] = useState('');
  const save = async (next: number | null) => {
    if (next !== null && !(next >= 1 && next <= 200)) return setError('Enter 1 to 200 sessions.');
    try {
      await update.mutateAsync({ id: patientId, patch: { plannedSessions: next } });
      toast(next ? `Plan set to ${next} sessions` : 'Plan removed');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Treatment plan"
      actions={
        <>
          {plan && (
            <Button onClick={() => save(null)} disabled={update.isPending}>
              Remove
            </Button>
          )}
          <Button variant="primary" onClick={() => save(Number(value))} disabled={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Planned sessions" hint="Total sessions the treatment needs.">
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, ''));
              setError('');
            }}
          />
        )}
      </Field>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}

function Overview({ data, onBook }: { data: Profile; onBook: () => void }) {
  const { can } = useSession();
  const therapists = useTherapistMap();
  const booking = useBooking();
  const p = data.patient;
  const [selling, setSelling] = useState(false);
  // Pending / advance only for Owner and Front desk (null otherwise; D-052).
  const balance: Array<[string, string, boolean]> =
    p.pendingPaise == null
      ? [['Since', dayMonth(dateOf(p.createdAt)), false]]
      : p.advancePaise
        ? [['Advance', inr(p.advancePaise), false]]
        : [['Pending', inr(p.pendingPaise), p.pendingPaise > 0]];
  const stats: Array<[string, string, boolean]> = [
    ['Visits', String(p.visits), false],
    ['Paid', inr(data.payments.reduce((s, x) => s + x.amountPaise, 0)), false],
    ...balance,
    ['No-shows', String(p.noShows), false],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-4 border-2 border-ink bg-white lg:col-span-2">
        {stats.map(([l, v, warn], i) => (
          <div
            key={l}
            className={cn('px-3 py-2.5', i > 0 && 'border-l border-rule', warn && 'bg-warn-bg')}
          >
            <div className={cn('kicker', warn && 'text-warn-fg')}>{l}</div>
            <div className={cn('text-lg font-extrabold tabular', warn && 'text-warn-fg')}>{v}</div>
          </div>
        ))}
      </div>
      <Card>
        <div className="kicker">Chief complaint</div>
        <div className="font-semibold">{p.chiefComplaint ?? '—'}</div>
        <div className="mt-1 kicker">Address</div>
        <div>{p.address ?? '—'}</div>
        <div className="mt-1 kicker">Phone · Email</div>
        <div className="tabular">
          {formatPhone(p.phone)}
          {p.email && ` · ${p.email}`}
        </div>
        {p.referralSource && (
          <>
            <div className="mt-1 kicker">Referral</div>
            <div>
              {REFERRAL_LABEL[p.referralSource]}
              {p.referralNote && ` · ${p.referralNote}`}
            </div>
          </>
        )}
      </Card>
      <div className="flex flex-col gap-4">
        <Card title="Next appointment">
          {p.nextAppointment ? (
            <button
              type="button"
              onClick={() => booking.openDetail(p.nextAppointment!)}
              className="flex flex-col items-start gap-0.5 border-0 bg-transparent p-0 text-left text-ink"
            >
              <span className="text-lg font-extrabold">
                {whenLabel(p.nextAppointment.startsAt)}
              </span>
              <span className="text-sm text-neutral-700">
                {therapists.name(p.nextAppointment.therapistId)}
              </span>
            </button>
          ) : (
            <div className="text-sm text-neutral-700">Nothing booked.</div>
          )}
          <Button variant="outline" icon={CalendarPlus} className="self-start" onClick={onBook}>
            Book again
          </Button>
        </Card>
        <PlanCard data={data} />
        <Card title="Active package">
          {p.activePackage ? (
            <PackageLine k={p.activePackage} />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-700">No active package</span>
              {can('patients.manage') && can('finance.entry.create') && (
                <Button size="sm" variant="outline" onClick={() => setSelling(true)}>
                  Sell package
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
      {selling && (
        <SellPackageSheet
          patientId={p.id}
          patientName={p.fullName}
          onClose={() => setSelling(false)}
        />
      )}
    </div>
  );
}

function Notes({ data, appointmentId }: { data: Profile; appointmentId: string | null }) {
  const { can } = useSession();
  const session = useAuthedSession();
  const toast = useToast();
  const allowed = can('patients.clinical');
  const p = data.patient;
  const notes = useNotes(p.id, allowed);
  const create = useCreateNote(p.id);
  const [kind, setKind] = useState<NoteKind>('session');
  const [body, setBody] = useState('');
  const today = todayIso();
  const linked: PatientVisit | undefined =
    data.appointments.find((a) => a.id === appointmentId) ??
    data.appointments.find((a) => dateOf(a.startsAt) === today && a.status !== 'cancelled');

  if (!allowed)
    return (
      <div className="flex flex-col items-center gap-2 border-2 border-ink bg-white px-5 py-8 text-center">
        <Lock aria-hidden size={26} />
        <div className="font-extrabold">Clinical notes are visible to therapists and owners.</div>
        <div className="text-sm text-neutral-700">
          You can still see visits, payments and contact details for {p.fullName}.
        </div>
      </div>
    );

  const save = async () => {
    try {
      await create.mutateAsync({ kind, body, appointmentId: linked?.id ?? null });
      setBody('');
      toast(`Note saved · ${p.fullName}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', { danger: true });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={`New note${linked ? ` · linked to ${relativeDay(dateOf(linked.startsAt)).toLowerCase()}'s session` : ''}`}
      >
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(NOTE_LABEL) as NoteKind[]).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {NOTE_LABEL[k]}
            </Chip>
          ))}
        </div>
        <textarea
          aria-label="Note"
          rows={3}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What did you see and do today?"
          className="rounded-none border-2 border-ink bg-white px-3 py-2 text-base lg:text-[15px]"
        />
        <Button
          variant="primary"
          icon={CircleCheck}
          className="self-start"
          disabled={!body.trim() || create.isPending}
          onClick={save}
        >
          Save note
        </Button>
        <div className="text-xs text-neutral-600">Signed as {session.user.fullName}.</div>
      </Card>
      {notes.isPending ? (
        <Loading label="Loading notes" />
      ) : !notes.data?.length ? (
        <div className="text-sm text-neutral-700">No notes yet.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.data.map((n) => {
            const a = data.appointments.find((x) => x.id === n.appointmentId);
            return (
              <article
                key={n.id}
                className="flex flex-col gap-1.5 border-2 border-ink bg-white px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                  <span
                    className={cn('border-2 px-2 py-px text-[11px] font-bold', NOTE_TAG[n.kind])}
                  >
                    {NOTE_LABEL[n.kind]}
                  </span>
                  <span className="font-semibold text-ink">{n.authorName}</span>
                  <span>{relativeDay(dateOf(n.createdAt))}</span>
                </div>
                <p className="m-0 text-[15px] leading-snug whitespace-pre-wrap">{n.body}</p>
                {a && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <Link2 aria-hidden size={12} />
                    {whenLabel(a.startsAt)}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Visits({ data }: { data: Profile }) {
  const therapists = useTherapistMap();
  const booking = useBooking();
  const now = new Date().toISOString();
  const upcoming = data.appointments
    .filter((a) => a.status === 'confirmed' && a.endsAt >= now)
    .reverse();
  const past = data.appointments.filter((a) => !(a.status === 'confirmed' && a.endsAt >= now));
  const plan = data.patient.plannedSessions;
  const row = (a: PatientVisit, clickable: boolean) => (
    <button
      key={a.id}
      type="button"
      disabled={!clickable}
      onClick={() => booking.openDetail(a)}
      className="flex items-center gap-3 border-0 border-b border-rule bg-white px-3.5 py-2.5 text-left text-ink last:border-b-0 enabled:hover:bg-accent-100"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          {dayLabel(dateOf(a.startsAt))} · {timeRange(a.startsAt, a.endsAt)}
        </span>
        <span className="block text-xs text-neutral-700">
          {a.sessionNo && (
            <b className="text-ink">
              Session {a.sessionNo}
              {plan && ` of ${plan}`} ·{' '}
            </b>
          )}
          {therapists.short(a.therapistId)}
          {a.visitType === 'home' && ' · Home visit'}
          <VisitPayment a={a} />
        </span>
      </span>
      <StatusTag status={a.status} />
    </button>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 border-2 border-ink bg-white">
        {(
          [
            ['Completed', data.appointments.filter((a) => a.status === 'completed').length],
            ['No-shows', data.patient.noShows],
            ['Cancelled', data.appointments.filter((a) => a.status === 'cancelled').length],
          ] as const
        ).map(([l, v], i) => (
          <div key={l} className={cn('px-3 py-2.5', i > 0 && 'border-l border-rule')}>
            <div className="kicker">{l}</div>
            <div className="text-lg font-extrabold tabular">{v}</div>
          </div>
        ))}
      </div>
      <h4 className="text-base">Upcoming</h4>
      {upcoming.length ? (
        <div className="flex flex-col border-2 border-ink bg-white">
          {upcoming.map((a) => row(a, true))}
        </div>
      ) : (
        <div className="text-sm text-neutral-700">Nothing booked.</div>
      )}
      <h4 className="text-base">Past</h4>
      {past.length ? (
        <div className="flex flex-col border-2 border-ink bg-white">
          {past.map((a) => row(a, true))}
        </div>
      ) : (
        <div className="text-sm text-neutral-700">No visits yet.</div>
      )}
    </div>
  );
}

function Payments({ data }: { data: Profile }) {
  const { can } = useSession();
  const branch = useBranch();
  const [sheet, setSheet] = useState<'pay' | 'dues' | 'sell' | null>(null);
  const p = data.patient;
  const canMoney = can('patients.manage') && can('finance.entry.create');
  const last = data.appointments.find((a) => a.status !== 'cancelled');
  const pending = p.pendingPaise ?? 0;
  return (
    <div className="flex flex-col gap-4">
      {pending > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 border-2 border-warn-fg bg-warn-bg px-3.5 py-3 text-warn-fg"
        >
          <span className="flex-1 font-semibold">
            <b className="text-lg tabular">{inr(pending)}</b> pending for completed visits
          </span>
          {canMoney && (
            <Button size="sm" variant="outline" onClick={() => setSheet('dues')}>
              Collect {inr(pending)}
            </Button>
          )}
        </div>
      )}
      {!!p.advancePaise && (
        <div className="text-sm font-semibold text-accent-800">
          {inr(p.advancePaise)} paid ahead: the next visit fees come out of it.
        </div>
      )}
      {canMoney && (
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <Button variant="primary" icon={IndianRupee} onClick={() => setSheet('pay')}>
            Record payment
          </Button>
          <Button variant="outline" icon={PackageIcon} onClick={() => setSheet('sell')}>
            Sell package
          </Button>
        </div>
      )}
      {data.packages.length > 0 && (
        <section aria-label="Packages" className="flex flex-col gap-2">
          <h4 className="text-base">Packages</h4>
          {data.packages.map((k) => (
            <Card key={k.id}>
              <span
                className={cn(
                  'self-start px-1.5 py-0.5 text-[11px] font-bold',
                  k.sessionsUsed < k.sessionsTotal
                    ? 'bg-accent-100 text-accent-800'
                    : 'bg-neutral-200 text-neutral-800',
                )}
              >
                {k.sessionsUsed < k.sessionsTotal ? 'Active' : 'Used up'}
              </span>
              <PackageLine k={k} />
            </Card>
          ))}
        </section>
      )}
      <div className="flex items-baseline justify-between">
        <h4 className="text-base">Payments</h4>
        <a
          href={`${MONEY_URL}/transactions`}
          target="_blank"
          rel="noreferrer"
          className="-my-3 py-3 text-sm font-semibold lg:my-0 lg:py-0"
        >
          Open in ATP Money →
        </a>
      </div>
      {data.payments.length ? (
        <div className="flex flex-col border-2 border-ink bg-white">
          {data.payments.map((x) => (
            <div
              key={x.id}
              className="flex items-center gap-3 border-b border-rule px-3.5 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {dayMonth(x.occurredOn)} · {x.description}
                </span>
                <span className="flex items-center gap-1 text-xs text-neutral-700">
                  {PAYMENT_MODE_LABEL[x.mode]} ·
                  <CircleCheck aria-hidden size={12} className="text-accent-700" />
                  Recorded in ATP Money{x.branchId && ` · ${branch.byId(x.branchId)?.name ?? ''}`}
                </span>
              </span>
              <span className="font-extrabold tabular">{inr(x.amountPaise)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-neutral-700">No payments yet.</div>
      )}
      {(sheet === 'pay' || sheet === 'dues') && (
        <RecordPaymentSheet
          patientId={p.id}
          patientName={p.fullName}
          defaultPaise={
            sheet === 'dues' || pending > 0 ? pending : last ? defaultFeePaise(last) : 80_000
          }
          defaultKind={last?.visitType === 'home' ? 'home_visit' : 'session'}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'sell' && (
        <SellPackageSheet
          patientId={p.id}
          patientName={p.fullName}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
