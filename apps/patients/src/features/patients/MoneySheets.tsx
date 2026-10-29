import { useState } from 'react';
import { Check } from 'lucide-react';
import { PAYMENT_MODE_LABEL, inr, rupeesToPaise } from '@atp/core';
import { Button, Segmented, Sheet, useToast } from '@atp/ui';
import { useRecordPayment, useSellPackage } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { PAYMENT_MODES_V2, type PaymentKind, type PaymentMode } from '@/domain/types';
import { Chip, Kicker } from '@/features/calendar/common';

const input = 'min-h-12 w-full rounded-none border-2 border-ink bg-white px-3 text-base tabular';

function ModeAndBranch({
  mode,
  setMode,
  branchId,
  setBranchId,
}: {
  mode: PaymentMode;
  setMode: (m: PaymentMode) => void;
  branchId: string;
  setBranchId: (b: string) => void;
}) {
  const { active } = useBranch();
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Kicker>Payment mode</Kicker>
        <Segmented
          block
          label="Payment mode"
          value={mode}
          onChange={setMode}
          options={PAYMENT_MODES_V2.map((m) => ({ value: m, label: PAYMENT_MODE_LABEL[m] }))}
        />
      </div>
      {active.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Kicker>Branch</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {active.map((b) => (
              <Chip key={b.id} active={b.id === branchId} onClick={() => setBranchId(b.id)}>
                {b.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/** Prepaid sessions; the price goes to ATP Money as Package income (L12). */
export function SellPackageSheet({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const branch = useBranch();
  const sell = useSellPackage(patientId);
  const [sessions, setSessions] = useState('10');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('6000');
  const [mode, setMode] = useState<PaymentMode>('upi');
  const [branchId, setBranchId] = useState(branch.defaultId);
  const n = Number(sessions) || 0;
  const paise = rupeesToPaise(price);

  const save = async () => {
    try {
      await sell.mutateAsync({
        name: name.trim() || `${n} sessions`,
        sessionsTotal: n,
        pricePaise: paise,
        mode,
        branchId,
      });
      toast(`Package sold · ${patientName}`);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', { danger: true });
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Sell package"
      subtitle={patientName}
      footer={
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          disabled={n < 1 || paise < 1 || !branchId || sell.isPending}
          onClick={save}
        >
          Sell package · {inr(paise)}
        </Button>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Package name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${n || 10} sessions`}
          className={input}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Sessions</span>
          <input
            value={sessions}
            onChange={(e) => setSessions(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Price ₹</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            className={input}
          />
        </label>
      </div>
      <ModeAndBranch mode={mode} setMode={setMode} branchId={branchId} setBranchId={setBranchId} />
      <div className="text-[13px] text-neutral-700">
        Recorded in ATP Money as Package income, tagged with this branch.
      </div>
    </Sheet>
  );
}

/**
 * Manual payment (A-05): an income row in ATP Money with this patient. `dues` collects exactly
 * what is pending (D-052: no part payments), so the amount can't be edited.
 */
export function RecordPaymentSheet({
  patientId,
  patientName,
  defaultPaise,
  defaultKind = 'session',
  dues,
  onClose,
}: {
  patientId: string;
  patientName: string;
  defaultPaise: number;
  defaultKind?: PaymentKind;
  dues?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const branch = useBranch();
  const record = useRecordPayment(patientId);
  const [amount, setAmount] = useState(String(defaultPaise / 100));
  const [mode, setMode] = useState<PaymentMode>('upi');
  const [what, setWhat] = useState<PaymentKind>(defaultKind);
  const [branchId, setBranchId] = useState(branch.defaultId);
  const paise = rupeesToPaise(amount);

  const save = async () => {
    try {
      await record.mutateAsync({ amountPaise: paise, mode, kind: what, branchId });
      toast(`${dues ? 'Collected' : 'Payment recorded'} · ${inr(paise)} · ${patientName}`);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', { danger: true });
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={dues ? 'Collect pending' : 'Record payment'}
      subtitle={patientName}
      footer={
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          disabled={paise < 1 || !branchId || record.isPending}
          onClick={save}
        >
          {dues ? 'Collect' : 'Record'} {inr(paise)}
        </Button>
      }
    >
      {dues ? (
        <div className="flex flex-col gap-0.5 border-2 border-ink bg-white px-3 py-2.5">
          <span className="kicker">Pending for completed visits</span>
          <span className="text-[28px] font-extrabold tabular">{inr(paise)}</span>
        </div>
      ) : (
        <label className="flex items-center border-2 border-ink bg-white">
          <span className="px-3 text-2xl font-extrabold">₹</span>
          <input
            aria-label="Amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            className="min-h-14 min-w-0 flex-1 border-0 text-[28px] font-extrabold tabular outline-none"
          />
        </label>
      )}
      {!dues && (
        <div className="flex flex-col gap-1.5">
          <Kicker>For</Kicker>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['session', 'Session'],
                ['home_visit', 'Home visit'],
                ['assessment', 'Assessment'],
                ['other', 'Other'],
              ] as const
            ).map(([k, label]) => (
              <Chip key={k} active={what === k} onClick={() => setWhat(k)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <ModeAndBranch mode={mode} setMode={setMode} branchId={branchId} setBranchId={setBranchId} />
      <div className="text-[13px] text-neutral-700">
        Recorded in ATP Money as Clinic session income, tagged with this branch.
      </div>
    </Sheet>
  );
}
