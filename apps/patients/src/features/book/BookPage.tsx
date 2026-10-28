import { useState, type ReactNode } from 'react';
import { CalendarDays, Check, CircleAlert, MapPin, Phone, PhoneCall } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { ApiError, addDays, todayIso } from '@atp/core';
import { Loading, cn } from '@atp/ui';
import { usePublicClinic, useSubmitInquiry } from '@/api/queries';
import type { PreferredSlot, PublicClinic } from '@/domain/types';
import { CLINIC_SLUG } from '@/app/nav';
import { formatPhone, mapLink, telLink, toE164 } from '@/lib/contact';
import { SLOT_LABEL, dayLabel } from '@/lib/time';

type Day = 'today' | 'tomorrow' | 'date';
type PublicBranch = PublicClinic['branches'][number];

interface Form {
  branchId: string;
  name: string;
  phone: string;
  email: string;
  day: Day;
  date: string;
  slot: PreferredSlot;
  reason: string;
  website: string;
}

const blank = (branchId = ''): Form => ({
  branchId,
  name: '',
  phone: '',
  email: '',
  day: 'tomorrow',
  date: '',
  slot: 'morning',
  reason: '',
  website: '',
});

const field =
  'min-h-12 w-full rounded-none border-2 border-ink bg-white px-3 text-base outline-none focus-visible:outline-2';

/** Public booking request (A-01, D-044): no sign-in, no slot picking. Staff call back. */
export function BookPage() {
  const clinic = usePublicClinic(CLINIC_SLUG);
  const submit = useSubmitInquiry(CLINIC_SLUG);
  const branches = clinic.data?.branches ?? [];
  const [form, setForm] = useState<Form>(blank());
  const [errors, setErrors] = useState<
    Partial<Record<'branchId' | 'name' | 'phone' | 'date', string>>
  >({});
  const [limited, setLimited] = useState(false);
  const [sent, setSent] = useState<Form | null>(null);

  // Branch links from Settings → Branches add `?branch=<code>`.
  const [params] = useSearchParams();
  const linked = branches.find((b) => b.code.toLowerCase() === params.get('branch')?.toLowerCase());
  const branchId = form.branchId || linked?.id || (branches.length === 1 ? branches[0]!.id : '');
  const branch = branches.find((b) => b.id === (sent?.branchId ?? branchId));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const send = async () => {
    const e: typeof errors = {};
    if (!branchId) e.branchId = 'Choose a branch.';
    if (!form.name.trim()) e.name = 'Enter your full name.';
    const phone = toE164(form.phone);
    if (!phone) e.phone = 'Enter a 10-digit mobile number.';
    if (form.day === 'date' && !form.date) e.date = 'Pick a date.';
    setErrors(e);
    if (Object.keys(e).length || !phone) return;
    const today = todayIso();
    try {
      await submit.mutateAsync({
        fullName: form.name.trim(),
        phone,
        email: form.email.trim() || null,
        preferredDate:
          form.day === 'today' ? today : form.day === 'tomorrow' ? addDays(today, 1) : form.date,
        preferredSlot: form.slot,
        reason: form.reason.trim() || null,
        branchId,
        website: form.website,
      });
      setSent({ ...form, branchId, phone });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'rate_limited') setLimited(true);
      else setErrors({ name: err instanceof Error ? err.message : 'Could not send. Try again.' });
    }
  };

  return (
    <div className="min-h-dvh bg-canvas px-[18px] pt-5 pb-8 lg:px-6 lg:py-12">
      <div className="mx-auto flex max-w-[480px] flex-col gap-5 lg:border-2 lg:border-ink lg:bg-white lg:p-8 lg:shadow-md">
        <div className="flex items-center gap-3.5 border-b-2 border-ink pb-4">
          <img src="/atp-logo.svg" alt="ATP Rehab" className="h-14" />
          <div className="min-w-0">
            <div className="text-base font-extrabold">{clinic.data?.name ?? 'ATP Rehab'}</div>
            <div className="text-[13px] leading-snug text-neutral-700">
              {branches.length ? `${branches.map((b) => b.name).join(' · ')} · Pune` : 'Pune'}
            </div>
          </div>
        </div>

        {clinic.isPending ? (
          <Loading label="Loading" />
        ) : clinic.isError ? (
          <Alert>This booking page isn't available. Please call the clinic.</Alert>
        ) : sent ? (
          <Sent
            form={sent}
            branch={branch}
            onAgain={() => {
              setSent(null);
              setForm(blank());
            }}
          />
        ) : (
          <form
            className="flex flex-col gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!limited) void send();
            }}
          >
            <h1 className="text-[32px] leading-[1.05]">Book a session</h1>
            {limited && (
              <Alert>
                Too many requests from this phone. Please try again in a few minutes or call us on{' '}
                <a
                  href={telLink(branch?.phone ?? branches[0]?.phone ?? '')}
                  className="text-danger-fg"
                >
                  {formatPhone(branch?.phone ?? branches[0]?.phone ?? '')}
                </a>
                .
              </Alert>
            )}

            {branches.length > 1 && (
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className="mb-2 p-0 text-[13px] font-semibold">Branch</legend>
                <div
                  role="radiogroup"
                  aria-label="Branch"
                  className={cn(
                    'flex flex-col border-2 bg-white',
                    errors.branchId ? 'border-danger' : 'border-ink',
                  )}
                >
                  {branches.map((b, i) => {
                    const on = b.id === branchId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set('branchId', b.id)}
                        className={cn(
                          'flex min-h-14 items-center gap-3 border-0 px-3.5 py-2.5 text-left text-ink',
                          i > 0 && 'border-t border-rule',
                          on ? 'bg-accent-100' : 'bg-white hover:bg-accent-100',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-[22px] flex-none place-items-center border-2 border-ink',
                            on ? 'bg-accent' : 'bg-white',
                          )}
                        >
                          {on && <Check aria-hidden size={14} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold">{b.name}</span>
                          <span className="block text-xs leading-tight text-neutral-700">
                            {b.address}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.branchId}</FieldError>
              </fieldset>
            )}

            <Labelled label="Full name" htmlFor="bk-name" error={errors.name}>
              <input
                id="bk-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Meera Shah"
                autoComplete="name"
                className={cn(field, errors.name && 'border-danger')}
              />
            </Labelled>

            <Labelled label="Phone" htmlFor="bk-phone" error={errors.phone}>
              <div
                className={cn(
                  'flex border-2 bg-white',
                  errors.phone ? 'border-danger' : 'border-ink',
                )}
              >
                <span className="flex items-center border-r-2 border-ink px-3 text-base font-semibold text-neutral-700">
                  +91
                </span>
                <input
                  id="bk-phone"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/[^\d ]/g, ''))}
                  type="tel"
                  inputMode="numeric"
                  placeholder="98xxx xxxxx"
                  autoComplete="tel-national"
                  className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-base tabular outline-none"
                />
              </div>
            </Labelled>

            <Labelled label="Email" optional htmlFor="bk-email">
              <input
                id="bk-email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                type="email"
                placeholder="name@email.com"
                autoComplete="email"
                className={field}
              />
            </Labelled>

            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold">Preferred day</div>
              <div className="grid grid-cols-[1fr_1fr_1.3fr] gap-1.5">
                {(
                  [
                    ['today', 'Today'],
                    ['tomorrow', 'Tomorrow'],
                    ['date', 'Pick a date'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={form.day === v}
                    onClick={() => set('day', v)}
                    className={cn(
                      'flex min-h-12 items-center justify-center gap-1.5 border-2 border-ink px-2 text-sm font-semibold text-ink',
                      form.day === v ? 'bg-accent font-extrabold' : 'bg-white hover:bg-accent-100',
                    )}
                  >
                    {v === 'date' && <CalendarDays aria-hidden size={15} />}
                    {label}
                  </button>
                ))}
              </div>
              {form.day === 'date' && (
                <input
                  type="date"
                  aria-label="Preferred date"
                  value={form.date}
                  min={todayIso()}
                  onChange={(e) => set('date', e.target.value)}
                  className={cn(field, errors.date && 'border-danger')}
                />
              )}
              <FieldError>{errors.date}</FieldError>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold">Preferred time</div>
              <div
                role="radiogroup"
                aria-label="Preferred time"
                className="grid grid-cols-4 border-2 border-ink bg-white"
              >
                {(['morning', 'afternoon', 'evening', 'any'] as const).map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={form.slot === v}
                    onClick={() => set('slot', v)}
                    className={cn(
                      'min-h-12 border-0 px-1 text-[13px] font-semibold text-ink',
                      i > 0 && 'border-l-2 border-ink',
                      form.slot === v ? 'bg-accent font-extrabold' : 'bg-white hover:bg-accent-100',
                    )}
                  >
                    {v === 'any' ? 'Any' : SLOT_LABEL[v]}
                  </button>
                ))}
              </div>
            </div>

            <Labelled label="Reason" optional htmlFor="bk-reason">
              <input
                id="bk-reason"
                value={form.reason}
                onChange={(e) => set('reason', e.target.value)}
                maxLength={120}
                placeholder="e.g. Knee pain after running"
                className={field}
              />
            </Labelled>

            {/* Honeypot: hidden from people, filled by bots. */}
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              className="absolute -left-[9999px] h-px w-px opacity-0"
            />

            <button
              type="submit"
              disabled={submit.isPending || limited}
              className={cn(
                'flex min-h-14 items-center justify-center gap-2.5 border-2 border-ink text-[17px] font-extrabold text-ink',
                limited ? 'bg-neutral-200' : 'bg-accent hover:bg-accent-400',
              )}
            >
              Request a call back
              <PhoneCall aria-hidden size={19} />
            </button>
            <div className="-mt-2 text-[13px] leading-snug text-neutral-700">
              We'll call you to confirm a time. No payment now.
            </div>
          </form>
        )}

        <div className="border-t border-rule pt-3 text-xs text-neutral-600">
          Built by Avyanta Labs for ATP Rehab
        </div>
      </div>
    </div>
  );
}

function Sent({
  form,
  branch,
  onAgain,
}: {
  form: Form;
  branch?: PublicBranch;
  onAgain: () => void;
}) {
  const day =
    form.day === 'today'
      ? 'Today'
      : form.day === 'tomorrow'
        ? 'Tomorrow'
        : form.date
          ? dayLabel(form.date)
          : '';
  const d = form.phone.replace(/\D/g, '').slice(-10);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid size-14 place-items-center border-2 border-ink bg-accent">
        <Check aria-hidden size={28} strokeWidth={3} />
      </div>
      <h1 className="text-[32px]">Request sent</h1>
      <div className="text-[17px] leading-snug">
        We'll call you on{' '}
        <b className="whitespace-nowrap tabular">{`+91 ${d.slice(0, 2)}xxx xxx${d.slice(8)}`}</b>{' '}
        soon to confirm your session.
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-2 border-ink bg-white px-4 py-3.5 text-sm">
        <dt className="self-center kicker">Branch</dt>
        <dd className="m-0 font-semibold">{branch?.name ?? '—'}</dd>
        <dt className="self-center kicker">Preferred</dt>
        <dd className="m-0 font-semibold">
          {day} · {form.slot === 'any' ? 'Any' : SLOT_LABEL[form.slot]}
        </dd>
        <dt className="self-center kicker">Reason</dt>
        <dd className="m-0">{form.reason || '—'}</dd>
      </dl>
      {branch && (
        <div className="flex flex-col gap-2.5">
          {branch.phone && (
            <a
              href={telLink(branch.phone)}
              className="flex min-h-13 items-center gap-3 border-2 border-ink bg-white px-4 font-bold text-ink no-underline hover:bg-accent-100"
            >
              <Phone aria-hidden size={19} />
              <span className="flex-1">Call {formatPhone(branch.phone)}</span>
            </a>
          )}
          {branch.address && (
            <a
              href={mapLink(`ATP Rehab ${branch.address}`)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 border-2 border-ink bg-white px-4 py-3 text-ink no-underline hover:bg-accent-100"
            >
              <MapPin aria-hidden size={19} className="flex-none" />
              <span className="flex-1 text-sm leading-snug">
                <b>ATP Rehab {branch.name}</b>
                <br />
                {branch.address}
              </span>
              <span className="text-[13px] font-bold whitespace-nowrap text-accent-700">Map →</span>
            </a>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onAgain}
        className="min-h-12 border-2 border-ink bg-transparent text-[15px] font-semibold text-ink hover:bg-accent-100"
      >
        Send another request
      </button>
    </div>
  );
}

function Labelled({
  label,
  htmlFor,
  optional,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold">
        {label} {optional && <span className="font-normal text-neutral-700">(optional)</span>}
      </label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}

const FieldError = ({ children }: { children?: ReactNode }) =>
  children ? (
    <div
      role="alert"
      className="flex items-center gap-1.5 text-[13px] font-semibold text-danger-fg"
    >
      <CircleAlert aria-hidden size={14} />
      {children}
    </div>
  ) : null;

const Alert = ({ children }: { children: ReactNode }) => (
  <div
    role="alert"
    className="flex gap-2.5 border-2 border-danger-fg bg-danger-bg px-3.5 py-3 text-sm text-danger-fg"
  >
    <CircleAlert aria-hidden size={18} className="mt-px flex-none" />
    <span>{children}</span>
  </div>
);
