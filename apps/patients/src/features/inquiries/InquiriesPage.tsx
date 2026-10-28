import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CircleX,
  Copy,
  Ellipsis,
  Inbox,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  PhoneOutgoing,
  Plus,
  UserCheck,
  X,
} from 'lucide-react';
import { Loading, cn, useToast } from '@atp/ui';
import { useInquiries, useInquiryCounts, usePatients, useUpdateInquiry } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import { BOOKING_URL } from '@/app/nav';
import type { CloseReason, Inquiry, InquiryStatus, PatientSummary } from '@/domain/types';
import { formatPhone, samePhone, telLink, waLink } from '@/lib/contact';
import { ago, dateOf, relativeDay } from '@/lib/time';
import { useBooking } from '@/features/calendar/booking';
import { Chip, Kicker, useTherapistMap, whenLabel } from '@/features/calendar/common';
import { preferredLabel } from './ConvertSheet';

const FILTERS: Array<[InquiryStatus, string]> = [
  ['new', 'New'],
  ['contacted', 'Contacted'],
  ['booked', 'Booked'],
  ['closed', 'Closed'],
];

const CLOSE_LABEL: Record<CloseReason, string> = {
  not_interested: 'Not interested',
  duplicate: 'Duplicate',
  wrong_number: 'Wrong number',
  other: 'Other',
};

const TAG: Record<InquiryStatus, string> = {
  new: 'border-accent-100 bg-accent-100 text-accent-800',
  contacted: 'border-warn-bg bg-warn-bg text-warn-fg',
  booked: 'border-ink bg-transparent text-ink',
  closed: 'border-neutral-200 bg-neutral-200 text-neutral-800',
};

function StatusPill({ i }: { i: Inquiry }) {
  return (
    <span
      className={cn('border-2 px-2 py-px text-[11px] font-bold whitespace-nowrap', TAG[i.status])}
    >
      {i.status === 'closed' && i.closeReason
        ? `Closed · ${CLOSE_LABEL[i.closeReason]}`
        : FILTERS.find((f) => f[0] === i.status)![1]}
    </span>
  );
}

/** Booking requests from patient.atprehab.si/book (A-01). */
export function InquiriesPage() {
  const [status, setStatus] = useState<InquiryStatus>('new');
  const [selected, setSelected] = useState<string | null>(null);
  const branch = useBranch();
  const booking = useBooking();
  const { data: counts } = useInquiryCounts();
  const { data = [], isPending } = useInquiries(status);
  const { data: patients = [] } = usePatients('');
  const rows = data.filter((i) => branch.matches(i.branchId));
  const sel = rows.find((i) => i.id === selected) ?? null;

  usePageHeader({
    title: 'Inquiries',
    subtitle: `${counts?.new ?? 0} new · ${counts?.contacted ?? 0} contacted`,
    action: { label: 'New appointment', icon: Plus, onClick: () => booking.openNew() },
  });

  const known = (i: Inquiry) => patients.find((p) => samePhone(p.phone, i.phone)) ?? null;

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <div
          role="tablist"
          aria-label="Status"
          className="grid grid-cols-4 border-2 border-ink bg-white lg:inline-grid lg:self-start"
        >
          {FILTERS.map(([v, label], i) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={status === v}
              onClick={() => {
                setStatus(v);
                setSelected(null);
              }}
              className={cn(
                'min-h-11 border-0 px-3 text-[13px] font-semibold whitespace-nowrap text-ink',
                i > 0 && 'border-l-2 border-ink',
                status === v ? 'bg-accent font-extrabold' : 'bg-white hover:bg-accent-100',
              )}
            >
              {label}
              {counts && v !== 'closed' && counts[v] > 0 && (
                <span className="ml-1 tabular">{counts[v]}</span>
              )}
            </button>
          ))}
        </div>

        {isPending ? (
          <Loading label="Loading requests" />
        ) : !rows.length ? (
          status === 'new' ? (
            <EmptyNew />
          ) : (
            <div className="py-6 text-center text-sm text-neutral-700">Nothing here.</div>
          )
        ) : (
          <>
            <div className="flex flex-col gap-2.5 lg:hidden">
              {rows.map((i) => (
                <InquiryCard key={i.id} i={i} known={known(i)} />
              ))}
            </div>
            <InquiryTable rows={rows} known={known} selected={selected} onSelect={setSelected} />
          </>
        )}
      </div>
      {sel && <InquiryPanel i={sel} known={known(sel)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmptyNew() {
  const toast = useToast();
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-ink bg-white px-5 py-8 text-center">
      <div className="grid size-14 place-items-center border-2 border-ink bg-accent-100">
        <Inbox aria-hidden size={26} />
      </div>
      <h3 className="text-xl">No new requests</h3>
      <div className="max-w-[340px] text-sm text-neutral-700">
        Share the booking link so patients can ask for a session from their phone.
      </div>
      <div className="flex w-full max-w-[360px] items-center gap-2 border-2 border-ink bg-canvas px-3 py-2">
        <LinkIcon aria-hidden size={15} />
        <span className="flex-1 truncate text-left text-sm font-semibold">
          {BOOKING_URL.replace('https://', '')}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(BOOKING_URL);
            toast('Booking link copied');
          }}
          className="flex items-center gap-1 border-0 bg-transparent text-sm font-bold text-accent-700"
        >
          <Copy aria-hidden size={14} />
          Copy
        </button>
      </div>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`Book a physiotherapy session at ATP Rehab: ${BOOKING_URL}`)}`}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-11 items-center gap-2 border-2 border-ink bg-accent px-4 font-bold text-ink no-underline hover:bg-accent-400 hover:text-ink"
      >
        <MessageCircle aria-hidden size={17} />
        Share on WhatsApp
      </a>
    </div>
  );
}

const open = (i: Inquiry) => i.status === 'new' || i.status === 'contacted';

function useInquiryActions(i: Inquiry) {
  const update = useUpdateInquiry();
  const toast = useToast();
  return {
    pending: update.isPending,
    contacted: async () => {
      await update.mutateAsync({ id: i.id, status: 'contacted' });
      toast(`Marked contacted · ${i.fullName}`, {
        action: { label: 'Undo', onClick: () => update.mutate({ id: i.id, status: 'new' }) },
      });
    },
    close: async (reason: CloseReason) => {
      const prev = i.status === 'contacted' ? 'contacted' : 'new';
      await update.mutateAsync({ id: i.id, status: 'closed', closeReason: reason });
      toast(`Closed · ${i.fullName}`, {
        action: { label: 'Undo', onClick: () => update.mutate({ id: i.id, status: prev }) },
      });
    },
  };
}

function CloseReasons({ onPick }: { onPick: (r: CloseReason) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Kicker>Why close it?</Kicker>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CLOSE_LABEL) as CloseReason[]).map((r) => (
          <Chip key={r} active={false} onClick={() => onPick(r)}>
            {CLOSE_LABEL[r]}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Meta({ i, known }: { i: Inquiry; known: PatientSummary | null }) {
  const branch = useBranch();
  return (
    <div className="grid grid-cols-[16px_1fr] items-center gap-x-2 gap-y-1 text-[13px] text-neutral-800">
      <MapPin aria-hidden size={14} />
      <span>{branch.byId(i.branchId)?.name ?? '—'}</span>
      <CalendarDays aria-hidden size={14} />
      <span>{preferredLabel(i)}</span>
      {i.reason && (
        <>
          <MessageSquareText aria-hidden size={14} />
          <span>{i.reason}</span>
        </>
      )}
      <Phone aria-hidden size={14} />
      <a href={telLink(i.phone)} className="tabular">
        {formatPhone(i.phone)}
      </a>
      {known && (
        <>
          <UserCheck aria-hidden size={14} />
          <span className="font-semibold text-accent-800">Known patient · {known.fullName}</span>
        </>
      )}
    </div>
  );
}

function InquiryCard({ i, known }: { i: Inquiry; known: PatientSummary | null }) {
  const booking = useBooking();
  const actions = useInquiryActions(i);
  const [menu, setMenu] = useState<'closed' | 'menu' | 'reasons'>('closed');
  return (
    <div className="flex flex-col gap-2.5 border-2 border-ink bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-base font-extrabold">{i.fullName}</span>
        <StatusPill i={i} />
        <span className="text-xs whitespace-nowrap text-neutral-700">{ago(i.createdAt)}</span>
      </div>
      <Meta i={i} known={known} />
      {open(i) && (
        <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <a
            href={telLink(i.phone)}
            className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-white text-sm font-bold text-ink no-underline hover:bg-accent-100 hover:text-ink"
          >
            <Phone aria-hidden size={16} />
            Call
          </a>
          <button
            type="button"
            onClick={() => booking.openConvert(i)}
            className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink bg-accent text-sm font-extrabold text-ink hover:bg-accent-400"
          >
            <CalendarPlus aria-hidden size={16} />
            Book
          </button>
          <button
            type="button"
            aria-label="More actions"
            aria-expanded={menu !== 'closed'}
            onClick={() => setMenu(menu === 'closed' ? 'menu' : 'closed')}
            className="grid min-h-11 w-11 place-items-center border-2 border-ink bg-white text-ink hover:bg-accent-100"
          >
            <Ellipsis aria-hidden size={18} />
          </button>
        </div>
      )}
      {menu === 'menu' && (
        <div className="flex flex-col border-2 border-ink">
          {i.status === 'new' && (
            <MenuButton
              icon={PhoneOutgoing}
              onClick={() => void actions.contacted().then(() => setMenu('closed'))}
            >
              Mark contacted
            </MenuButton>
          )}
          <MenuButton icon={CircleX} onClick={() => setMenu('reasons')}>
            Close with a reason…
          </MenuButton>
        </div>
      )}
      {menu === 'reasons' && (
        <CloseReasons onPick={(r) => void actions.close(r).then(() => setMenu('closed'))} />
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: typeof Phone;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-2.5 border-0 border-b border-rule bg-white px-3 text-left text-sm font-semibold text-ink last:border-b-0 hover:bg-accent-100"
    >
      <Icon aria-hidden size={16} />
      {children}
    </button>
  );
}

function InquiryTable({
  rows,
  known,
  selected,
  onSelect,
}: {
  rows: Inquiry[];
  known: (i: Inquiry) => PatientSummary | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const branch = useBranch();
  const booking = useBooking();
  return (
    <table className="hidden w-full border-collapse border-2 border-ink bg-white text-sm lg:table">
      <thead>
        <tr className="border-b-2 border-ink text-left">
          {['Received', 'Name', 'Phone', 'Preferred', 'Reason', 'Status', ''].map((h) => (
            <th key={h} className="px-3 py-2.5 kicker font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((i) => {
          const k = known(i);
          return (
            <tr
              key={i.id}
              onClick={() => onSelect(i.id)}
              aria-selected={selected === i.id}
              className={cn(
                'cursor-pointer border-b border-rule last:border-b-0',
                selected === i.id ? 'bg-accent-100' : 'hover:bg-canvas',
              )}
            >
              <td className="px-3 py-2.5 whitespace-nowrap text-neutral-700">{ago(i.createdAt)}</td>
              <td className="px-3 py-2.5">
                <div className="font-bold">{i.fullName}</div>
                {k && <div className="text-xs font-semibold text-accent-800">Known patient</div>}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap tabular">
                <a href={telLink(i.phone)} onClick={(e) => e.stopPropagation()}>
                  {formatPhone(i.phone)}
                </a>
              </td>
              <td className="px-3 py-2.5">
                <div className="font-semibold">{preferredLabel(i)}</div>
                <div className="flex items-center gap-1 text-xs text-neutral-700">
                  <MapPin aria-hidden size={12} />
                  {branch.byId(i.branchId)?.name ?? '—'}
                </div>
              </td>
              <td className="max-w-[220px] truncate px-3 py-2.5 text-neutral-800">
                {i.reason ?? '—'}
              </td>
              <td className="px-3 py-2.5">
                <StatusPill i={i} />
              </td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                {open(i) && (
                  <span className="inline-flex items-center gap-1.5">
                    <a
                      href={telLink(i.phone)}
                      title="Call"
                      aria-label={`Call ${i.fullName}`}
                      onClick={(e) => e.stopPropagation()}
                      className="grid size-9 place-items-center border-2 border-ink bg-white text-ink hover:bg-accent-100"
                    >
                      <Phone aria-hidden size={15} />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        booking.openConvert(i);
                      }}
                      className="min-h-9 border-2 border-ink bg-accent px-3 text-[13px] font-extrabold text-ink hover:bg-accent-400"
                    >
                      Book
                    </button>
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function InquiryPanel({
  i,
  known,
  onClose,
}: {
  i: Inquiry;
  known: PatientSummary | null;
  onClose: () => void;
}) {
  const branch = useBranch();
  const booking = useBooking();
  const therapists = useTherapistMap();
  const actions = useInquiryActions(i);
  const [closing, setClosing] = useState(false);
  const rows: Array<[string, React.ReactNode]> = [
    [
      'Phone',
      <a key="p" href={telLink(i.phone)} className="tabular">
        {formatPhone(i.phone)}
      </a>,
    ],
    ['Email', i.email ?? '—'],
    ['Branch', branch.byId(i.branchId)?.name ?? '—'],
    ['Preferred', preferredLabel(i)],
    ['Reason', i.reason ?? '—'],
    ['Source', 'patient.atprehab.si/book'],
  ];
  return (
    <aside className="hidden w-[360px] flex-none flex-col self-start border-2 border-ink bg-white lg:flex">
      <div className="flex items-start gap-3 border-b-2 border-ink px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold">{i.fullName}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-neutral-700">
            <StatusPill i={i} />
            {relativeDay(dateOf(i.createdAt))}, {ago(i.createdAt)}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="grid size-9 place-items-center border-2 border-ink bg-white"
        >
          <X aria-hidden size={16} />
        </button>
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 px-4 py-3.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="self-center kicker">{k}</dt>
            <dd className="m-0 font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mx-4 mb-3.5 flex flex-col gap-1 border-2 border-ink bg-canvas px-3 py-2.5 text-[13px]">
        <span className="flex items-center gap-2 font-semibold">
          <UserCheck aria-hidden size={15} />
          {known ? `Known patient · ${known.fullName}` : 'New to the clinic'}
        </span>
        {known?.nextAppointment && (
          <span className="text-warn-fg">
            Already booked: {whenLabel(known.nextAppointment.startsAt)} with{' '}
            {therapists.short(known.nextAppointment.therapistId)}
          </span>
        )}
      </div>
      {open(i) && (
        <div className="flex flex-col gap-2.5 border-t-2 border-ink px-4 py-3.5">
          <button
            type="button"
            onClick={() => booking.openConvert(i)}
            className="flex min-h-12 items-center justify-center gap-2 border-2 border-ink bg-accent font-extrabold text-ink hover:bg-accent-400"
          >
            Book a session
            <ArrowRight aria-hidden size={17} />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={telLink(i.phone)}
              className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink font-bold text-ink no-underline hover:bg-accent-100 hover:text-ink"
            >
              <Phone aria-hidden size={15} />
              Call
            </a>
            <a
              href={waLink(
                i.phone,
                `Hi ${i.fullName.split(' ')[0]}, this is ATP Rehab about your booking request.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-1.5 border-2 border-ink font-bold text-ink no-underline hover:bg-accent-100 hover:text-ink"
            >
              <MessageCircle aria-hidden size={15} />
              WhatsApp
            </a>
          </div>
          {closing ? (
            <CloseReasons onPick={(r) => void actions.close(r).then(onClose)} />
          ) : (
            <div className="flex gap-4">
              {i.status === 'new' && (
                <button
                  type="button"
                  onClick={() => void actions.contacted()}
                  className="border-0 bg-transparent p-0 text-sm font-semibold text-accent-700 underline"
                >
                  Mark contacted
                </button>
              )}
              <button
                type="button"
                onClick={() => setClosing(true)}
                className="border-0 bg-transparent p-0 text-sm font-semibold text-accent-700 underline"
              >
                Close…
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
