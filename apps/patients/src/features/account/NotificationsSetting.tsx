import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { InstallSteps, useSession } from '@atp/core';
import { Button, Panel, SectionHeader, useToast } from '@atp/ui';
import { brand } from '@/app/brand';
import { NAV, allowed } from '@/app/nav';
import { usePush } from '@/app/push';

const STATUS: Record<string, string> = {
  loading: 'Checking this phone…',
  on: 'On for this phone.',
  off: 'Off for this phone.',
  blocked: 'Blocked. Allow notifications for this site in the browser or phone settings.',
  unsupported: "This browser can't show notifications.",
  'needs-install': 'On iPhone, notifications work only in the installed app.',
};

/** New booking request alerts (D-054), for whoever handles the request queue. */
export function NotificationsSetting() {
  const { can } = useSession();
  const push = usePush();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!allowed(NAV.inquiries, can)) return null;

  const run = async (on: boolean) => {
    setBusy(true);
    try {
      if (on) await push.enable();
      else await push.disable();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change notifications.', { danger: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Notifications" className="flex flex-col gap-3">
      <SectionHeader title="Notifications" />
      <Panel className="gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <BellRing aria-hidden size={20} className="flex-none" />
          <div className="min-w-0 flex-[1_1_180px]">
            <div className="font-semibold">New booking requests</div>
            <div className="text-xs text-neutral-700">{STATUS[push.state]}</div>
          </div>
          {push.state === 'off' && (
            <Button variant="primary" disabled={busy} onClick={() => run(true)}>
              Turn on
            </Button>
          )}
          {push.state === 'on' && (
            <Button disabled={busy} onClick={() => run(false)}>
              Turn off
            </Button>
          )}
        </div>
        {push.state === 'needs-install' && (
          <div className="text-[13px] font-semibold text-accent-900">
            <InstallSteps appName={brand.appName} />. Then open it from the home screen and turn
            this on.
          </div>
        )}
      </Panel>
    </section>
  );
}

const CARD_DISMISSED = 'atp.pushCard.dismissed';

/** One-time nudge on the request queue while alerts are off on this phone. */
export function PushNudge() {
  const push = usePush();
  const toast = useToast();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(CARD_DISMISSED) === '1';
    } catch {
      return false;
    }
  });
  if (hidden || push.state !== 'off') return null;
  const hide = () => {
    try {
      localStorage.setItem(CARD_DISMISSED, '1');
    } catch {
      /* storage unavailable: hidden for this visit */
    }
    setHidden(true);
  };
  return (
    <div
      role="note"
      aria-label="Phone alerts"
      className="flex flex-wrap items-center gap-3 border-2 border-ink bg-accent-100 px-3.5 py-3"
    >
      <BellRing aria-hidden size={18} className="flex-none" />
      <span className="min-w-0 flex-[1_1_200px] text-sm font-semibold">
        Get a phone alert when a new request comes in.
      </span>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            push
              .enable()
              .then(() => toast('Alerts on for this phone'))
              .catch((e: unknown) =>
                toast(e instanceof Error ? e.message : 'Could not turn alerts on.', {
                  danger: true,
                }),
              )
          }
        >
          Turn on
        </Button>
        <Button size="sm" onClick={hide}>
          Not now
        </Button>
      </div>
    </div>
  );
}
