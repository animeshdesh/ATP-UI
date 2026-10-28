import { useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Check,
  CircleCheck,
  ExternalLink,
  Plus,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { ApiError, api } from '@/api';
import {
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useEntryDefaults,
  useFunds,
  useReceiptMutations,
  useUpdateTransaction,
} from '@/api/queries';
import {
  useAuthedSession,
  PAYMENT_MODES,
  PAYMENT_MODE_LABEL,
  type EntryType,
  type PaymentMode,
  type Transaction,
  secondsSince,
  shortWeekday,
  todayIso,
} from '@atp/core';
import { Button, Field, Input, Segmented, Select, Sheet, useToast, cn } from '@atp/ui';
import { tooLarge } from '@/lib/image';
import { inr, rupeesToPaise } from '@/lib/money';
import { useOnline } from '@/offline/hooks';
import type { QuickAddPrefill } from './QuickAddContext';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Expense', icon: ArrowUpRight },
  { value: 'income', label: 'Income', icon: ArrowDownLeft },
] as const;

const MODE_OPTIONS = PAYMENT_MODES.map((m) => ({
  value: m,
  label: m === 'bank_transfer' ? 'Bank' : PAYMENT_MODE_LABEL[m],
}));

/** Select value for the clinic account (API: `partyMemberId: null`). */
const CLINIC = 'clinic';

type Props = { onClose: () => void } & (
  | { mode: 'create'; prefill?: QuickAddPrefill; openedAt: number; entryKey: string }
  | { mode: 'edit'; txn: Transaction }
);

export function EntrySheet(props: Props) {
  const { onClose } = props;
  const editing = props.mode === 'edit' ? props.txn : null;
  const prefill = props.mode === 'create' ? props.prefill : undefined;
  const session = useAuthedSession();
  const toast = useToast();
  const online = useOnline();
  const { data: defaults } = useEntryDefaults();
  const { data: categories } = useCategories();
  // Active funds an expense can be drawn from (names are enough; amounts may be hidden).
  const funds = (useFunds().data ?? []).filter((f) => !f.archived || f.id === editing?.fund?.id);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const remove = useDeleteTransaction();
  const receipts = useReceiptMutations();

  const today = defaults?.entryDate ?? todayIso();
  const [type, setType] = useState<EntryType>(editing?.type ?? prefill?.type ?? 'expense');
  const [amount, setAmount] = useState(() => {
    const p = editing?.amountPaise ?? prefill?.amountPaise;
    return p ? String(p / 100) : '';
  });
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? prefill?.categoryId ?? null,
  );
  const [mode, setMode] = useState<PaymentMode | null>(
    editing?.paymentMode ?? prefill?.paymentMode ?? null,
  );
  const [party, setParty] = useState<string | null>(() => {
    if (editing) return editing.party?.memberId ?? CLINIC;
    if (prefill?.partyMemberId === null) return CLINIC;
    return prefill?.partyMemberId ?? null;
  });
  const [date, setDate] = useState<string | null>(editing?.entryDate ?? null);
  const [patient, setPatient] = useState(editing?.patientName ?? '');
  const [fundId, setFundId] = useState<string>(editing?.fund?.id ?? '');
  const [description, setDescription] = useState(
    editing?.description ?? prefill?.description ?? '',
  );
  const [more, setMore] = useState(
    !!(editing?.description || editing?.hasReceipt || prefill?.description),
  );
  const [receipt, setReceipt] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const effectiveMode = mode ?? defaults?.paymentMode ?? 'cash';
  const effectiveParty = party ?? defaults?.myMemberId ?? CLINIC;
  const effectiveDate = date ?? today;
  const amountPaise = rupeesToPaise(amount);
  const isIncome = type === 'income';
  const catList = (categories ?? []).filter(
    (c) => c.type === type && (!c.archived || c.id === categoryId),
  );
  const category = catList.find((c) => c.id === categoryId);
  const valid = amountPaise > 0 && !!category;
  const readOnly = !!editing && !editing.canEdit;

  // People the caller may pick; keep an existing entry's party even if it isn't selectable now.
  const partyOptions = [
    ...(defaults?.parties ?? []).map((p) => ({
      value: p.memberId,
      label: p.isMe ? `${p.name} (me)` : p.name,
    })),
    ...(editing?.party && !defaults?.parties.some((p) => p.memberId === editing.party!.memberId)
      ? [{ value: editing.party.memberId, label: editing.party.name }]
      : []),
    { value: CLINIC, label: 'Clinic account' },
  ];
  const partyName =
    partyOptions.find((o) => o.value === effectiveParty)?.label.replace(' (me)', '') ?? null;

  const fail = (e: unknown) =>
    setError(
      e instanceof ApiError && e.code === 'edit_window_closed'
        ? 'Entries can be changed for 7 days after you record them. Ask an Owner.'
        : e instanceof ApiError && e.code === 'entry_settled'
          ? 'This entry is part of a settlement and is locked. Undo the settlement to change it.'
          : e instanceof Error
            ? e.message
            : 'Could not save. Try again.',
    );

  const fields = () => ({
    type,
    amountPaise,
    categoryId: categoryId!,
    entryDate: effectiveDate,
    paymentMode: effectiveMode,
    partyMemberId: effectiveParty === CLINIC ? null : effectiveParty,
    description: description.trim(),
  });

  const saveNew = async () => {
    if (props.mode !== 'create') return;
    const result = await create.mutateAsync({
      userKey: session.user.key,
      display: {
        categoryName: category!.name,
        partyName: effectiveParty === CLINIC ? null : partyName,
        recordedByName: session.user.fullName,
      },
      ...(receipt ? { receipt } : {}),
      input: {
        ...fields(),
        idempotencyKey: props.entryKey,
        ...(isIncome && patient.trim() ? { patientName: patient.trim() } : {}),
        ...(prefill?.recurringItemId ? { recurringItemId: prefill.recurringItemId } : {}),
        ...(!isIncome && fundId ? { fundId } : {}),
      },
    });
    onClose();
    if (result.status === 'queued')
      toast(`Saved offline · ${inr(amountPaise)} · ${category!.name} · syncs when online`);
    else if (result.receiptFailed)
      toast(`Saved ${inr(amountPaise)} · receipt upload failed, add it from the entry`);
    else toast(`Saved ${inr(amountPaise)} · ${category!.name} · ${secondsSince(props.openedAt)}s`);
  };

  const saveEdit = async (txn: Transaction) => {
    await update.mutateAsync({
      id: txn.id,
      patch: {
        ...fields(),
        patientName: isIncome ? patient.trim() || null : null,
        fundId: !isIncome && fundId ? fundId : null,
      },
    });
    if (receipt) await receipts.upload.mutateAsync({ id: txn.id, file: receipt });
    else if (removeReceipt) await receipts.remove.mutateAsync(txn.id);
    onClose();
    toast(`Updated ${inr(amountPaise)} · ${category!.name}`);
  };

  const save = async () => {
    if (!amountPaise) return setError('Enter an amount.');
    if (!category) return setError(isIncome ? 'Pick an income type.' : 'Pick a category.');
    try {
      await (editing ? saveEdit(editing) : saveNew());
    } catch (e) {
      fail(e);
    }
  };

  const del = async () => {
    if (!editing) return;
    try {
      await remove.mutateAsync(editing.id);
      onClose();
      toast(`Deleted ${inr(editing.amountPaise)} · ${editing.categoryName}`);
    } catch (e) {
      setConfirmDelete(false);
      fail(e);
    }
  };

  const busy =
    create.isPending || update.isPending || remove.isPending || receipts.upload.isPending;

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? (readOnly ? 'Entry' : 'Edit entry') : 'New entry'}
      subtitle={
        editing
          ? `Recorded by ${editing.recordedBy.name} · ${shortWeekday(editing.entryDate)}`
          : `Recorded by ${session.user.shortName} · ${shortWeekday(today)}`
      }
      footer={
        readOnly ? (
          <div className="text-xs text-neutral-700">
            {editing?.settled
              ? 'Locked: this entry is part of a settlement.'
              : 'Locked: entries can be changed for 7 days by whoever recorded them, or by an Owner.'}
          </div>
        ) : (
          <>
            {!online && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warn-fg">
                <WifiOff aria-hidden size={14} />
                {editing
                  ? 'Offline · changes need a connection'
                  : 'Offline · this entry is kept on your device and syncs later'}
              </div>
            )}
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
              disabled={busy || (!!editing && !online)}
              className={cn('min-h-14', !valid && 'bg-neutral-200 hover:bg-neutral-200')}
            >
              {editing
                ? 'Save changes'
                : amountPaise
                  ? `Save ${inr(amountPaise)}${category ? ` · ${category.name}` : ''}`
                  : 'Save'}
            </Button>
            {editing &&
              (confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[13px] font-semibold">
                    Delete this entry? It stays in the audit log.
                  </span>
                  <Button size="sm" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                  <Button
                    size="sm"
                    className="border-danger-fg text-danger-fg"
                    disabled={busy || !online}
                    onClick={del}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <Button
                  variant="link"
                  icon={Trash2}
                  className="self-start text-danger-fg hover:text-danger-fg"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete entry
                </Button>
              ))}
          </>
        )
      }
    >
      <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <Segmented
          label="Entry type"
          block
          size="lg"
          options={TYPE_OPTIONS}
          value={type}
          onChange={(t) => {
            setType(t);
            setCategoryId(null);
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
                key={c.id}
                type="button"
                aria-pressed={categoryId === c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  setError('');
                }}
                className={cn(
                  'min-h-[46px] border-2 p-2 text-left text-[13px] leading-tight font-semibold text-ink',
                  categoryId === c.id
                    ? 'border-ink bg-accent'
                    : 'border-neutral-300 bg-white hover:border-ink',
                )}
              >
                {c.name}
              </button>
            ))}
            {!categories && (
              <span className="col-span-3 text-[13px] text-neutral-700">Loading categories…</span>
            )}
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
          {!editing && (
            <div className="text-xs text-neutral-700">Defaults to your last-used mode.</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Date" kicker>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={effectiveDate}
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
                {partyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {!isIncome && funds.length > 0 && (
          <Field label="Draw from fund (optional)" kicker>
            {(id) => (
              <Select
                id={id}
                value={fundId}
                onChange={(e) => setFundId(e.target.value)}
                className="min-h-[46px]"
              >
                <option value="">Not from a fund</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

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
            {editing?.hasReceipt && !receipt && !removeReceipt ? (
              <ExistingReceipt
                txnId={editing.id}
                onRemove={readOnly ? undefined : () => setRemoveReceipt(true)}
              />
            ) : (
              !readOnly && <ReceiptPicker file={receipt} onChange={setReceipt} />
            )}
          </>
        )}
      </fieldset>
    </Sheet>
  );
}

/** Receipt already on the server: a 5-minute signed link (F-04). */
function ExistingReceipt({ txnId, onRemove }: { txnId: string; onRemove?: () => void }) {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  return (
    <div className="flex min-h-14 items-center gap-3 border-2 border-accent-700 bg-accent-100 px-3.5 py-2">
      <CircleCheck aria-hidden size={20} />
      <span className="flex-1 text-sm font-semibold">Receipt attached</span>
      <Button
        size="sm"
        icon={ExternalLink}
        disabled={opening}
        onClick={async () => {
          // Open synchronously so popup blockers allow it, then point it at the signed URL.
          const win = window.open('', '_blank');
          setOpening(true);
          try {
            const { url } = await api.getReceiptUrl(txnId);
            if (win) win.location.href = url;
            else window.location.href = url;
          } catch {
            win?.close();
            toast('Could not open the receipt');
          } finally {
            setOpening(false);
          }
        }}
      >
        View
      </Button>
      {onRemove && (
        <Button size="sm" variant="link" onClick={onRemove}>
          Remove
        </Button>
      )}
    </div>
  );
}

/** F-04: receipt photo from camera or gallery. Compressed on upload; 5 MB limit after that. */
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
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = '';
          // Large camera photos are compressed before upload; refuse only what can't be shrunk.
          if (f && tooLarge(f) && f.type === 'image/heic') return setError('Photo is over 5 MB.');
          setError('');
          onChange(f);
        }}
      />
      {error && <div className="text-xs font-semibold text-danger-fg">{error}</div>}
    </div>
  );
}
