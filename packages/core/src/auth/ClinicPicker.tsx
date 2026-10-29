import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@atp/ui';
import { useSession } from '../session';
import type { ClinicPick } from '../types';
import { AuthLayout } from './AuthLayout';

/** Shown when `/v1/me` has no active clinic (member of several clinics). */
export function ClinicPicker({ pick }: { pick: ClinicPick }) {
  const { chooseClinic, signOut } = useSession();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <AuthLayout
      mobileLogo={<img src="/atp-logo.svg" alt="ATP Rehab" className="mb-8 h-24 self-start" />}
      panel={
        <div className="max-w-[460px] text-[44px] leading-[1.05] font-extrabold">
          Pick a clinic.
        </div>
      }
    >
      <h1 className="mb-1.5 text-[34px]">Choose clinic</h1>
      <div className="mb-6 text-sm text-neutral-700">Signed in as {pick.userName}</div>
      <div className="flex flex-col gap-2.5">
        {pick.pickClinic.map((c) => (
          <Button
            key={c.id}
            size="lg"
            trailingIcon={ArrowRight}
            disabled={!!busy}
            onClick={async () => {
              setBusy(c.id);
              try {
                await chooseClinic(c.id);
              } finally {
                setBusy(null);
              }
            }}
          >
            {c.name}
          </Button>
        ))}
        <Button variant="link" className="self-start" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </AuthLayout>
  );
}
