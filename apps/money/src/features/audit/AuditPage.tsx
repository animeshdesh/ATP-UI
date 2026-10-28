import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useAuditLog } from '@/api/queries';
import { Button, EmptyState, Loading, Note, Select, Tag } from '@atp/ui';
import { AUDIT_TABLES, describeAudit } from './describe';

export function AuditPage() {
  const [table, setTable] = useState('');
  const log = useAuditLog(table);
  const rows = log.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <>
      <Select
        inline
        aria-label="Show changes to"
        value={table}
        onChange={(e) => setTable(e.target.value)}
        className="min-h-11 self-start text-[13px]"
      >
        {AUDIT_TABLES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      {log.isPending ? (
        <Loading />
      ) : log.isError ? (
        <p className="text-sm text-danger-fg">Could not load the audit log.</p>
      ) : rows.length === 0 ? (
        <EmptyState>No changes recorded yet.</EmptyState>
      ) : (
        <ul className="m-0 flex list-none flex-col border-t-2 border-divider p-0">
          {rows.map((row) => {
            const a = describeAudit(row);
            return (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-b border-rule py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={a.tone} className="font-extrabold tracking-[.04em] uppercase">
                    {a.action}
                  </Tag>
                  <span className="text-sm font-semibold">{a.entity}</span>
                </div>
                <div className="text-right text-xs whitespace-nowrap text-neutral-700 tabular">
                  {a.at}
                </div>
                {a.changes.map((c, i) => (
                  <div
                    key={i}
                    className="col-span-full flex flex-wrap items-center gap-1.5 text-[13px]"
                  >
                    {c.field && <span className="text-neutral-700">{c.field}:</span>}
                    {c.before !== undefined && (
                      <>
                        <span className="text-neutral-600 line-through">{c.before}</span>
                        <ArrowRight
                          aria-label="changed to"
                          size={13}
                          className="text-neutral-600"
                        />
                      </>
                    )}
                    <span className="font-semibold">{c.after}</span>
                  </div>
                ))}
                <div className="col-span-full text-xs text-neutral-700">by {a.by}</div>
              </li>
            );
          })}
        </ul>
      )}
      {log.hasNextPage && (
        <Button
          className="self-start"
          disabled={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          {log.isFetchingNextPage ? 'Loading…' : 'Load older'}
        </Button>
      )}
      <Note>Financial entries are soft-deleted and stay in this log with their last values.</Note>
    </>
  );
}
