import { CircleCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useRecurring } from '@/api/queries';
import { Button, Loading, Note, Stat, StatGrid, Tag } from '@/components/ui';
import { useQuickAdd } from '@/features/entry/QuickAddContext';
import { monthShort, todayIso } from '@/lib/dates';
import { inr } from '@/lib/money';
import { cn } from '@/lib/cn';
import { recurringStatus } from './status';

export function RecurringPage() {
  const { data, isPending } = useRecurring();
  const openAdd = useQuickAdd();
  if (isPending || !data) return <Loading />;
  const statuses = data.map((r) => ({ r, s: recurringStatus(r) }));
  const logged = data.filter((r) => r.logged).length;
  const overdue = statuses.filter((x) => x.s.overdue).length;
  const expected = data.reduce((a, r) => a + r.amountPaise, 0);
  const mon = monthShort(todayIso());

  return (
    <>
      <StatGrid cols={3}>
        <Stat size="sm" label="Logged" value={`${logged}/${data.length}`} />
        <Stat size="sm" label="Overdue" value={overdue} danger={overdue > 0} />
        <Stat size="sm" label="Expected" value={inr(expected)} />
      </StatGrid>
      <ul className="m-0 flex list-none flex-col p-0">
        {statuses.map(({ r, s }) => (
          <li
            key={r.key}
            className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-3"
          >
            <div className="flex size-12 flex-col items-center justify-center border-2 border-ink leading-none">
              <span className="text-lg font-extrabold tabular">
                {String(r.dayOfMonth).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-700 uppercase">{mon}</span>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{r.name}</div>
              <div className="text-xs text-neutral-700">
                {r.category} · expected {inr(r.amountPaise)}
              </div>
              <Tag tone={s.tone} className="mt-1">
                {s.label}
              </Tag>
            </div>
            {r.logged ? (
              <CircleCheck aria-label="Logged" size={22} className="mx-2.5 text-accent-700" />
            ) : (
              <Button
                size="sm"
                variant={s.overdue ? 'primary' : 'outline'}
                className={cn('min-h-11 font-bold', !s.overdue && 'bg-white')}
                onClick={() =>
                  openAdd({
                    category: r.category,
                    amountPaise: r.amountPaise,
                    description: r.name,
                    recurringKey: r.key,
                    paymentMode: 'Bank transfer',
                    partyKey: 'Clinic',
                  })
                }
              >
                Log now
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Note>
        Recurring items come from categories marked recurring, with an expected amount and day of
        month. Set them up in <Link to="/settings/categories">Categories</Link>.
      </Note>
    </>
  );
}
