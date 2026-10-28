import { useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError } from '@atp/core';
import { Button, Segmented, Sheet, useToast } from '@atp/ui';
import { useCreatePatient, usePatients } from '@/api/queries';
import { useBranch } from '@/app/branch';
import type { Gender, ReferralSource } from '@/domain/types';
import { formatPhone, samePhone, toE164 } from '@/lib/contact';
import { Chip, Kicker } from '@/features/calendar/common';

export const REFERRAL_LABEL: Record<ReferralSource, string> = {
  doctor: 'Doctor',
  friend: 'Friend',
  google: 'Google',
  walk_in: 'Walk-in',
  other: 'Other',
};

export const GENDER_LABEL: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  unspecified: 'Not said',
};

const input = 'min-h-12 w-full rounded-none border-2 border-ink bg-white px-3 text-base';

/** "34" → age; "1991-04-12" or "12/04/1991" → date of birth. */
function parseAge(v: string): { age: number | null; dateOfBirth: string | null } {
  const t = v.trim();
  if (/^\d{1,3}$/.test(t)) return { age: Number(t), dateOfBirth: null };
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return { age: null, dateOfBirth: t };
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (dmy)
    return {
      age: null,
      dateOfBirth: `${dmy[3]}-${dmy[2]!.padStart(2, '0')}-${dmy[1]!.padStart(2, '0')}`,
    };
  return { age: null, dateOfBirth: null };
}

/** Intake form (PRD §6.3): phone is the de-dup key. */
export function NewPatientSheet({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const branch = useBranch();
  const create = useCreatePatient();
  const { data: all = [] } = usePatients('');
  const [f, setF] = useState({
    name: '',
    phone: '',
    age: '',
    email: '',
    gender: 'unspecified' as Gender,
    address: '',
    referral: null as ReferralSource | null,
    complaint: '',
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const phone = toE164(f.phone);
  const dup = phone ? all.find((p) => samePhone(p.phone, phone)) : null;
  const ok = !!f.name.trim() && !!phone && !dup;

  const save = async () => {
    if (!ok) return;
    try {
      const p = await create.mutateAsync({
        fullName: f.name.trim(),
        phone: phone!,
        email: f.email.trim() || null,
        ...parseAge(f.age),
        gender: f.gender,
        address: f.address.trim() || null,
        referralSource: f.referral,
        referralNote: null,
        chiefComplaint: f.complaint.trim() || null,
        branchId: branch.defaultId || null,
      });
      toast(`Added ${p.fullName}`);
      onSaved(p.id);
    } catch (e) {
      toast(
        e instanceof ApiError && e.code === 'phone_in_use'
          ? 'Another patient already has this phone.'
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
      title="New patient"
      subtitle="Phone is unique per patient"
      footer={
        <Button
          variant="primary"
          size="lg"
          icon={Check}
          disabled={!ok || create.isPending}
          onClick={save}
        >
          Save patient
        </Button>
      }
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Full name</span>
        <input
          value={f.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="As the patient says it"
          className={input}
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="np-phone" className="text-[13px] font-semibold">
          Phone <span className="font-normal text-neutral-700">(required)</span>
        </label>
        <div className="flex border-2 border-ink bg-white">
          <span className="flex items-center border-r-2 border-ink px-3 font-semibold text-neutral-700">
            +91
          </span>
          <input
            id="np-phone"
            value={f.phone}
            onChange={(e) => set('phone', e.target.value.replace(/[^\d ]/g, ''))}
            inputMode="numeric"
            placeholder="98xxx xxxxx"
            className="min-h-11 min-w-0 flex-1 border-0 px-3 text-base tabular outline-none"
          />
        </div>
        {dup && (
          <div className="flex items-center gap-2 border-2 border-warn-fg bg-warn-bg px-3 py-2 text-[13px] text-warn-fg">
            <TriangleAlert aria-hidden size={16} className="flex-none" />
            <span className="flex-1">
              {formatPhone(dup.phone)} already belongs to {dup.fullName}.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onClose();
                navigate(`/patients/${dup.id}`);
              }}
            >
              Open profile
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Age or date of birth</span>
          <input
            value={f.age}
            onChange={(e) => set('age', e.target.value)}
            placeholder="e.g. 34"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">Email</span>
          <input
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            type="email"
            placeholder="Optional"
            className={input}
          />
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <Kicker>Gender</Kicker>
        <Segmented
          block
          label="Gender"
          value={f.gender}
          onChange={(v) => set('gender', v)}
          options={(Object.keys(GENDER_LABEL) as Gender[]).map((g) => ({
            value: g,
            label: GENDER_LABEL[g],
          }))}
        />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Address</span>
        <textarea
          rows={2}
          value={f.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Needed for home visits"
          className="rounded-none border-2 border-ink bg-white px-3 py-2 text-base"
        />
      </label>
      <div className="flex flex-col gap-1.5">
        <Kicker>Referral source</Kicker>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(REFERRAL_LABEL) as ReferralSource[]).map((r) => (
            <Chip
              key={r}
              active={f.referral === r}
              onClick={() => set('referral', f.referral === r ? null : r)}
            >
              {REFERRAL_LABEL[r]}
            </Chip>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold">Chief complaint</span>
        <input
          value={f.complaint}
          onChange={(e) => set('complaint', e.target.value)}
          placeholder="e.g. Lower back pain"
          className={input}
        />
      </label>
    </Sheet>
  );
}
