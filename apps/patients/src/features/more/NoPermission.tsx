import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useSession } from '@atp/core';
import { Button } from '@atp/ui';
import { usePageHeader } from '@/app/header';
import { NAV, allowed } from '@/app/nav';

/** Shown in place of a screen the user's role doesn't include. */
export function NoPermission() {
  const navigate = useNavigate();
  const { can } = useSession();
  usePageHeader({ title: 'Patients', subtitle: 'ATP Patients' });
  return (
    <div className="flex flex-col items-center gap-3 border-2 border-ink bg-white px-6 py-10 text-center lg:mx-auto lg:max-w-[480px]">
      <div className="grid size-14 place-items-center border-2 border-ink bg-canvas">
        <Lock aria-hidden size={26} />
      </div>
      <h3 className="text-xl">You don't have access</h3>
      <div className="text-sm text-neutral-800">Ask an owner for access to Patients.</div>
      <div className="text-[13px] text-neutral-700">
        Owners can change roles under Settings → Users &amp; roles.
      </div>
      {allowed(NAV.calendar, can) && (
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Today
        </Button>
      )}
    </div>
  );
}
