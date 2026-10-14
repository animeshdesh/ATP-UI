import { useRef, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Camera, Check, CircleCheck, Plus } from 'lucide-react';
import { useCategories, useCreateTransaction, useEntryDefaults, usePeople } from '@/api/queries';
import { useAuthedSession } from '@/app/session';
import { Button, Field, Input, Segmented, Select, Sheet, useToast } from '@/components/ui';
import { PAYMENT_MODES, type EntryType, type PaymentMode } from '@/domain/types';
import { cn } from '@/lib/cn';
import { secondsSince, shortWeekday, todayIso } from '@/lib/dates';
import { inr, rupeesToPaise } from '@/lib/money';
import type { QuickAddPrefill } from './QuickAddContext';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowUpRight },
  { value: 'income', label: 'Income', icon: ArrowDownLeft },
] as const;

const MODE_OPTIONS = PAYMENT_MODES.map((m) => ({
  value: m,
  label: m === 'Bank transfer' ? 'Bank' : m,
}));

interface Props {
  open: boolean;
  /** Epoch ms when the sheet opened; the save toast reports elapsed seconds (PRD goal: < 15 s). */
  openedAt: number;
  prefill?: QuickAddPrefill;
  onClose: () => void;
}

export function QuickAddSheet({ open, ...rest }: Props) {
  if (!open) return null;
  return <QuickAddForm {...rest} />;
}

function QuickAddForm({ prefill, openedAt, onClose }: Omit<Props, 'open'>) {
  const session = useAuthedSession();
  const toast = useToast();
  const { data: defaults } = useEntryDefaults();
  const { data: categories } = useCategories();
  const { data: people } = usePeople();
  const create = useCreateTransaction();

  const today = todayIso();
  const [type, setType] = useState<EntryType>(prefill?.type ?? 'expense');
  const [amount, setAmount] = useState(
    prefill?.amountPaise ? String(prefill.amountPaise / 100) : '',
  );
  const [category, setCategory] = useState<string | null>(prefill?.category ?? null);
  const [mode, setMode] = useState<PaymentMode | null>(prefill?.paymentMode ?? null);
  const [party, setParty] = useState<string | null>(prefill?.partyKey ?? null);
  const [date, setDate] = useState(today);
  const [patient, setPatient] = useState('');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [more, setMore] = useState(!!prefill?.description);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState('');

  const effectiveMode = mode ?? defaults?.paymentMode ?? 'Cash';
  const effectiveParty = party ?? defaults?.me ?? session.user.key;
  const amountPaise = rupeesToPaise(amount);
  const isIncome = type === 'income';
  const catList = (isIncome ? categories?.income : categories?.expense) ?? [];
  const valid = amountPaise > 0 && !!category;

  const save = async () => {
    if (!amountPaise) return setError('Enter an amount.');
    if (!category) return setError('Pick a category.');
    try {
      await create.mutateAsync({
        type,
        amountPaise,
        category,
        entryDate: date,
        paymentMode: effectiveMode,
        partyKey: effectiveParty,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(isIncome && patient.trim() ? { patientName: patient.trim() } : {}),
        ...(receipt ? { receiptFileName: receipt.name } : {}),
        ...(prefill?.recurringKey ? { recurringKey: prefill.recurringKey } : {}),
      });
      const secs = secondsSince(openedAt);
      onClose();
      toast(`Saved ${inr(amountPaise)} · ${category} · ${secs}s`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="New entry"
      subtitle={`Recorded by ${session.user.shortName} · ${shortWeekday(today)}`}
      footer={
        <>
          {error && (
            <div role="alert" className="text-xs font-semibold text-danger-fg">
              {error}
            </div>
          )}
          <Button
            variant="primary"
            size="lg"
            trailingIcon={Check}
            onClick={save}
            disabled={create.isPending}
            className={cn('min-h-14', !valid && 'bg-neutral-200 hover:bg-neutral-200')}
          >
            {amountPaise ? `Save ${inr(amountPaise)}${category ? ` · ${category}` : ''}` : 'Save'}
          </Button>
        </>
      }
    >
      <Segmented
        label="Entry type"
        block
        size="lg"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(t) => {
          setType(t);
          setCategory(null);
          setError('');
        }}
      />

      <div className="flex items-baseline gap-1.5 border-b-4 border-accent pb-1">
        <span className="text-[34px] font-extrabold text-neutral-600">₹</span>
        <input
          data-autofocus
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^\d]/g, ''));
            setError('');
          }}
          inputMode="numeric"
          placeholder="0"
          aria-label="Amount"
          className="w-full min-w-0 border-0 bg-transparent p-0 text-[44px] font-extrabold tracking-tight text-ink tabular outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="kicker" id="cat-label">
          {isIncome ? 'Income type' : 'Category'}
        </div>
        <div role="group" aria-labelledby="cat-label" className="grid grid-cols-3 gap-1.5">
          {catList.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                setError('');
              }}
              className={cn(
                'min-h-[46px] border-2 p-2 text-left text-[13px] leading-tight font-semibold text-ink',
                category === c
                  ? 'border-ink bg-accent'
                  : 'border-neutral-300 bg-white hover:border-ink',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="kicker">Payment mode</div>
        <Segmented
          label="Payment mode"
          block
          options={MODE_OPTIONS}
          value={effectiveMode}
          onChange={setMode}
        />
        <div className="text-xs text-neutral-700">Defaults to your last-used mode.</div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Date" kicker>
          {(id) => (
            <Input
              id={id}
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value || today)}
              className="min-h-[46px] text-sm font-semibold"
            />
          )}
        </Field>
        <Field label={isIncome ? 'Received by' : 'Paid by'} kicker>
          {(id) => (
            <Select
              id={id}
              value={effectiveParty}
              onChange={(e) => setParty(e.target.value)}
              className="min-h-[46px]"
            >
              {(defaults?.partyOptions ?? [effectiveParty]).map((k) => (
                <option key={k} value={k}>
                  {(people?.[k]?.shortName ?? k) + (k === defaults?.me ? ' (me)' : '')}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {isIncome && (
        <Field label="Patient name" kicker>
          {(id) => (
            <Input
              id={id}
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              placeholder="e.g. Atharva Kale"
              className="min-h-[46px] text-[15px]"
            />
          )}
        </Field>
      )}

      {!more ? (
        <Button
          variant="link"
          icon={Plus}
          className="self-start py-2 text-sm"
          onClick={() => setMore(true)}
        >
          Description, receipt photo
        </Button>
      ) : (
        <>
          <Field label="Description (optional)" kicker>
            {(id) => (
              <Input
                id={id}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
                className="min-h-[46px] text-[15px]"
              />
            )}
          </Field>
          <ReceiptPicker file={receipt} onChange={setReceipt} />
        </>
      )}
    </Sheet>
  );
}

/** F-04: receipt photo from camera or gallery, ≤ 5 MB. Upload happens with the entry once L3 lands. */
function ReceiptPicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const Icon = file ? CircleCheck : Camera;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => (file ? onChange(null) : input.current?.click())}
        className={cn(
          'flex min-h-14 items-center gap-3 border-2 border-dashed px-3.5 py-3 text-left text-ink',
          file ? 'border-accent-700 bg-accent-100' : 'border-neutral-500 bg-white',
        )}
      >
        <Icon aria-hidden size={20} />
        <span className="flex-1">
          <span className="block text-sm font-semibold">
            {file ? `${file.name} attached` : 'Add receipt photo'}
          </span>
          <span className="block text-xs text-neutral-700">
            {file ? 'Tap to remove' : 'Camera or gallery'}
          </span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (f && f.size > 5 * 1024 * 1024) return setError('Photo is over 5 MB.');
          setError('');
          onChange(f);
        }}
      />
      {error && <div className="text-xs font-semibold text-danger-fg">{error}</div>}
    </div>
  );
}
