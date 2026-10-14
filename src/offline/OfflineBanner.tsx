import { CloudUpload, TriangleAlert, WifiOff } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { useOnline, useOutbox } from './hooks';

const plural = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;

/** Connection and outbox state, shown under the page header. Hidden when online and empty. */
export function OfflineBanner() {
  const online = useOnline();
  const items = useOutbox();
  const failed = items.filter((i) => i.error).length;
  const waiting = items.length - failed;

  let tone: 'warn' | 'danger' | 'accent';
  let Icon = WifiOff;
  let text: string;
  if (!online) {
    tone = 'warn';
    text = `Offline. New entries are saved on this device${waiting ? ` · ${plural(waiting)} waiting to sync` : ''}.`;
  } else if (failed) {
    tone = 'danger';
    Icon = TriangleAlert;
    text = `${plural(failed)} couldn't sync.`;
  } else if (waiting) {
    tone = 'accent';
    Icon = CloudUpload;
    text = `Syncing ${plural(waiting)}…`;
  } else {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        'flex flex-none items-center gap-2 border-b-2 border-ink px-4 py-2 text-[13px] font-semibold lg:px-8',
        tone === 'warn' && 'bg-warn-bg text-warn-fg',
        tone === 'danger' && 'bg-danger-bg text-danger-fg',
        tone === 'accent' && 'bg-accent-100 text-accent-900',
      )}
    >
      <Icon aria-hidden size={16} className="flex-none" />
      <span className="flex-1">{text}</span>
      {failed > 0 && (
        <Link to="/transactions" className="text-inherit underline">
          Review
        </Link>
      )}
    </div>
  );
}
