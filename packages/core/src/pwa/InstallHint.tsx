import { useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';
import { cn } from '@atp/ui';
import { isIosSafari, isStandalone } from '../lib/pwa';

const DISMISSED = 'atp.installHint.dismissed';

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

/** The two Safari steps, also used where push needs the installed app. */
export function InstallSteps({ appName }: { appName: string }) {
  return (
    <span>
      Install {appName}: tap <Share aria-label="Share" size={15} className="inline align-[-2px]" />{' '}
      Share, then <b>Add to Home Screen</b>{' '}
      <SquarePlus aria-hidden size={15} className="inline align-[-2px]" />
    </span>
  );
}

/** iPhone Safari only, until installed or dismissed. */
export function InstallHint({ appName, className }: { appName: string; className?: string }) {
  const [hidden, setHidden] = useState(() => dismissed() || !isIosSafari() || isStandalone());
  if (hidden) return null;
  return (
    <div
      role="note"
      aria-label="Install the app"
      className={cn(
        'flex flex-none items-center gap-2 border-b-2 border-ink bg-accent-100 py-1 pl-4 text-[13px] font-semibold text-accent-900 lg:pl-8',
        className,
      )}
    >
      <span className="flex-1 py-1.5">
        <InstallSteps appName={appName} />
      </span>
      <button
        type="button"
        aria-label="Hide install tip"
        onClick={() => {
          try {
            localStorage.setItem(DISMISSED, '1');
          } catch {
            /* storage unavailable: hidden for this visit only */
          }
          setHidden(true);
        }}
        className="grid size-11 flex-none place-items-center border-0 bg-transparent text-accent-900"
      >
        <X aria-hidden size={17} />
      </button>
    </div>
  );
}
