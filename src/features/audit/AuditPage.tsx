import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAudit } from '@/api/queries';
import { Loading, Note, Segmented } from '@/components/ui';
import type { AuditAction } from '@/domain/types';
import { cn } from '@/lib/cn';

const FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'Entries', label: 'Entries' },
  { value: 'Settings', label: 'Settings' },
] as const;

const ACTION_STYLE: Record<AuditAction, string> = {
  Created: 'bg-accent-100 text-accent-800',
  Edited: 'bg-warn-bg text-warn-fg',
  Deleted: 'bg-danger-bg text-danger-fg',
  Settings: 'bg-neutral-200 text-neutral-800',
  Settled: 'bg-accent text-ink',
};

export function AuditPage() {
  const [kind, setKind] = useState<(typeof FILTERS)[number]['value']>('All');
  const { data, isPending } = useAudit(kind);
  return (
    <>
      <Segmented
        label="Filter"
        options={FILTERS}
        value={kind}
        onChange={setKind}
        className="self-start"
      />
      {isPending || !data ? (
        <Loading />
      ) : (
        <ul className="m-0 flex list-none flex-col border-t-2 border-divider p-0">
          {data.map((a, i) => (
            <li
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-b border-rule py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-[7px] py-0.5 text-[11px] font-extrabold tracking-[.04em] uppercase',
                    ACTION_STYLE[a.action],
                  )}
                >
                  {a.action}
                </span>
                <span className="text-sm font-semibold">{a.entity}</span>
              </div>
              <div className="text-right text-xs whitespace-nowrap text-neutral-700 tabular">
                {a.at}
              </div>
              <div className="col-span-full flex flex-wrap items-center gap-1.5 text-[13px]">
                {a.before && (
                  <>
                    <span className="text-neutral-600 line-through">{a.before}</span>
                    <ArrowRight aria-label="changed to" size={13} className="text-neutral-600" />
                  </>
                )}
                <span className="font-semibold">{a.after}</span>
              </div>
              <div className="col-span-full text-xs text-neutral-700">by {a.user}</div>
            </li>
          ))}
        </ul>
      )}
      <Note>Financial entries are soft-deleted and stay in this log with their last values.</Note>
    </>
  );
}
