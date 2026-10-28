import { useState } from 'react';
import {
  Check,
  Clock,
  Info,
  Link as LinkIcon,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError } from '@atp/core';
import { Button, Sheet, cn, useToast } from '@atp/ui';
import { useAllHours, useSaveBranch } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { usePageHeader } from '@/app/header';
import { BOOKING_URL } from '@/app/nav';
import type { Branch } from '@/domain/types';
import { formatPhone, telLink, toE164 } from '@/lib/contact';
import { WEEKDAYS } from '@/lib/time';
import { useTherapistMap } from '@/features/calendar/common';

/** Clinic sites (D-047). Owners only (`settings.branches.manage`). */
export function BranchesPage() {
  const { branches } = useBranch();
  const [editing, setEditing] = useState<Branch | 'new' | null>(null);
  usePageHeader({
    title: 'Branches',
    subtitle: `${branches.filter((b) => !b.archivedAt).length} branches · Owner only`,
    action: { label: 'Add branch', icon: Plus, onClick: () => setEditing('new') },
  });
  return (
    <div className="flex flex-col gap-4">
      <Button variant="outline" icon={Plus} className="lg:hidden" onClick={() => setEditing('new')}>
        Add branch
      </Button>
      <div className="grid gap-4 xl:grid-cols-2">
        {branches
          .filter((b) => !b.archivedAt)
          .map((b) => (
            <BranchCard key={b.id} b={b} onEdit={() => setEditing(b)} />
          ))}
      </div>
      <div className="text-xs text-neutral-700">
        New branches appear in the branch switcher, list filters, booking sheets and, when shown, on{' '}
        patient.atprehab.si/book. Add therapist hours there to open free slots.
      </div>
      {editing && (
        <BranchSheet branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function BranchCard({ b, onEdit }: { b: Branch; onEdit: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const save = useSaveBranch();
  const therapists = useTherapistMap();
  const { data: hours = {} } = useAllHours(therapists.list.map((t) => t.memberId));
  const here = therapists.list.filter((t) =>
    (hours[t.memberId] ?? []).some((h) => h.branchId === b.id),
  );
  const days = new Set(
    Object.values(hours)
      .flat()
      .filter((h) => h.branchId === b.id)
      .map((h) => h.weekday),
  );
  const week = days.size
    ? WEEKDAYS.filter((_, i) => days.has(i as never))
        .map((d) => d.slice(0, 3))
        .join(' · ')
    : 'No hours yet';
  const link = `${BOOKING_URL}?branch=${b.code.toLowerCase()}`;

  return (
    <section className="flex flex-col border-2 border-ink bg-white">
      <div className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <span className="border-2 border-ink bg-accent px-1.5 text-sm font-extrabold">
          {b.code}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold">{b.name}</div>
          <div className="text-xs text-neutral-700">{week}</div>
        </div>
        <button
          type="button"
          title="Edit"
          aria-label={`Edit ${b.name}`}
          onClick={onEdit}
          className="grid size-10 place-items-center border-2 border-ink bg-white hover:bg-accent-100"
        >
          <Pencil aria-hidden size={16} />
        </button>
      </div>
      <div className="grid grid-cols-[16px_1fr] items-start gap-x-2.5 gap-y-2 px-4 py-3 text-sm">
        <MapPin aria-hidden size={15} className="mt-0.5" />
        <span>{b.address ?? '—'}</span>
        <Phone aria-hidden size={15} className="mt-0.5" />
        {b.phone ? (
          <a href={telLink(b.phone)} className="tabular">
            {formatPhone(b.phone)}
          </a>
        ) : (
          <span>—</span>
        )}
        <Users aria-hidden size={15} className="mt-0.5" />
        <span>
          {here.length ? (
            here.map((t) => t.shortName).join(', ')
          ) : (
            <span className="text-neutral-600">No working hours yet</span>
          )}
        </span>
        <LinkIcon aria-hidden size={15} className="mt-0.5" />
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-neutral-800">
            {link.replace('https://', '')}
          </span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(link);
              toast('Booking link copied');
            }}
            className="border-0 bg-transparent p-0 text-sm font-bold text-accent-700"
          >
            Copy
          </button>
        </span>
      </div>
      <div className="flex items-center gap-3 border-t border-rule px-4 py-2.5">
        <span className="flex-1 text-sm font-semibold">
          {b.isPublic ? 'Shown on booking page' : 'Hidden from booking page'}
        </span>
        <Switch
          on={b.isPublic}
          label="Show on booking page"
          onClick={async () => {
            await save.mutateAsync({ id: b.id, isPublic: !b.isPublic });
            toast(`${b.name} ${b.isPublic ? 'hidden from' : 'shown on'} the booking page`);
          }}
        />
      </div>
      <button
        type="button"
        onClick={() => navigate('/availability')}
        className="flex min-h-11 items-center gap-2 border-0 border-t-2 border-ink bg-white px-4 text-left text-sm font-semibold text-ink hover:bg-accent-100"
      >
        <Clock aria-hidden size={15} />
        Working hours at this branch →
      </button>
    </section>
  );
}

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'relative h-7 w-12 flex-none border-2 border-ink',
        on ? 'bg-accent' : 'bg-neutral-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-5 border-2 border-ink bg-white transition-[left]',
          on ? 'left-[22px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

const slug = (name: string) =>
  name
    .replace(/[^a-z]/gi, '')
    .slice(0, 3)
    .toUpperCase();

function BranchSheet({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveBranch();
  const [f, setF] = useState({
    name: branch?.name ?? '',
    code: branch?.code ?? '',
    phone: branch?.phone ? formatPhone(branch.phone) : '',
    address: branch?.address ?? '',
    isPublic: branch?.isPublic ?? true,
  });
  const [codeTouched, setCodeTouched] = useState(!!branch);
  const code = (codeTouched ? f.code : slug(f.name)).toUpperCase();
  const phone = f.phone.trim() ? toE164(f.phone) : null;
  const ok =
    !!f.name.trim() &&
    !!f.address.trim() &&
    /^[A-Z]{2,4}$/.test(code) &&
    (!f.phone.trim() || !!phone);
  const input = 'min-h-12 w-full rounded-none border-2 border-ink bg-white px-3 text-base';

  const submit = async () => {
    try {
      await save.mutateAsync({
        id: branch?.id,
        name: f.name.trim(),
        code,
        phone,
        address: f.address.trim(),
        isPublic: f.isPublic,
      });
      toast(
        branch
          ? `Saved ${f.name.trim()}`
          : `Added branch · ${f.name.trim()}. Set therapists’ hours next.`,
      );
      onClose();
    } catch (e) {
      toast(
        e instanceof ApiError && e.code === 'code_in_use'
          ? 'Another branch uses this code.'
          : e instanceof Error
            ? e.message
            : 'Could not save.',
        { danger: true },
      );
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={branch ? 'Edit branch' : 'Add branch'}
      subtitle="Owners only"
      footer={
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          disabled={!ok || save.isPending}
          onClick={submit}
        >
          {branch ? 'Save branch' : 'Add branch'}
        </Button>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Branch name</span>
        <input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Baner"
          className={input}
        />
      </label>
      <div className="grid grid-cols-[1fr_1.6fr] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Short code</span>
          <input
            value={code}
            maxLength={4}
            onChange={(e) => {
              setCodeTouched(true);
              setF({ ...f, code: e.target.value.replace(/[^a-z]/gi, '').toUpperCase() });
            }}
            placeholder="BNR"
            className={cn(input, 'font-extrabold uppercase')}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Phone</span>
          <input
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            inputMode="tel"
            placeholder="+91 98xxx xxxxx"
            className={cn(input, 'tabular')}
          />
        </label>
      </div>
      <div className="-mt-2 text-xs text-neutral-700">
        The code shows on calendar blocks, e.g. KVN.
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Address</span>
        <textarea
          rows={3}
          value={f.address}
          onChange={(e) => setF({ ...f, address: e.target.value })}
          placeholder="Shop, building, road, area, city"
          className="rounded-none border-2 border-ink bg-white px-3 py-2 text-base"
        />
      </label>
      <span className="text-xs text-neutral-700">
        Used in WhatsApp confirmations and the map link.
      </span>
      <div className="flex items-center gap-3 border-2 border-ink bg-white px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Show on booking page</div>
          <div className="truncate text-xs text-neutral-700">
            {BOOKING_URL.replace('https://', '')}
          </div>
        </div>
        <Switch
          on={f.isPublic}
          label="Show on booking page"
          onClick={() => setF({ ...f, isPublic: !f.isPublic })}
        />
      </div>
      {!branch && (
        <div className="flex gap-2.5 border-2 border-ink bg-accent-100 px-3.5 py-3 text-sm">
          <Info aria-hidden size={17} className="mt-0.5 flex-none" />
          <span>
            After saving, add therapists’ hours at this branch in Availability. Until then it has no
            free slots.
          </span>
        </div>
      )}
    </Sheet>
  );
}
