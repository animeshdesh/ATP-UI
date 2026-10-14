import { Check, Lock, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDashboard, usePeople } from '@/api/queries';
import { useSession } from '@/app/session';
import { recurringStatus } from '@/features/recurring/status';
import { Button, Loading, SectionHeader, Stat, StatGrid, Tag } from '@/components/ui';
import type { Dashboard, RecurringItem } from '@/domain/types';
import { useQuickAdd } from '@/features/entry/QuickAddContext';
import { EntryRow } from '@/features/transactions/EntryRow';
import { inr } from '@/lib/money';
import { cn } from '@/lib/cn';
import { PeriodSwitch, usePeriod } from './PeriodSwitch';

export function DashboardPage() {
  const [period] = usePeriod();
  const { can } = useSession();
  const { data, isPending } = useDashboard(period);
  const { data: people } = usePeople();
  const navigate = useNavigate();
  const clinicView = can('finance.report.view', 'all');

  if (isPending || !data) return <Loading />;
  return (
    <>
      {clinicView && (
        <div className="lg:hidden">
          <PeriodSwitch block />
        </div>
      )}
      <StatGrid>
        {data.tiles.map((t) => (
          <Stat
            key={t.label}
            label={t.label}
            value={t.valuePaise !== undefined ? inr(t.valuePaise) : t.value}
            sub={t.sub}
            income={t.emphasis === 'income'}
          />
        ))}
      </StatGrid>

      {data.scope === 'clinic' ? (
        <ClinicSections data={data} />
      ) : (
        <p className="m-0 flex items-center gap-2 text-[13px] text-neutral-700">
          <Lock aria-hidden size={14} className="flex-none" />
          You see entries you recorded. Clinic totals, budgets and settlement are visible to Owners.
        </p>
      )}

      <section className="flex flex-col">
        <SectionHeader
          title={clinicView ? 'Latest entries' : 'Your latest entries'}
          aside={
            <Button variant="link" onClick={() => navigate('/transactions')}>
              View all →
            </Button>
          }
        />
        <ul className="m-0 list-none p-0">
          {data.recent.map((t) => (
            <EntryRow key={t.id} txn={t} people={people} />
          ))}
        </ul>
      </section>
    </>
  );
}

function ClinicSections({ data }: { data: Dashboard }) {
  const navigate = useNavigate();
  const openAdd = useQuickAdd();
  const maxSpent = Math.max(...data.breakdown.map((b) => b.spentPaise), 1);
  const pending = data.recurring.filter((r) => !r.logged);
  const logged = data.recurring.length - pending.length;

  const logRecurring = (r: RecurringItem | undefined) =>
    r &&
    openAdd({
      category: r.category,
      amountPaise: r.amountPaise,
      description: r.name,
      recurringKey: r.key,
      paymentMode: 'Bank transfer',
      partyKey: 'Clinic',
    });

  return (
    <>
      {data.attention.length > 0 && (
        <section
          className="flex flex-col border-2 border-ink bg-white"
          aria-label="Needs attention"
        >
          <div className="flex items-center gap-2 border-b-2 border-ink px-4 py-2.5 text-[11px] font-extrabold tracking-[.08em] uppercase">
            <TriangleAlert aria-hidden size={15} />
            Needs attention
          </div>
          {data.attention.map((a) => (
            <div
              key={a.text}
              className="flex items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0"
            >
              <div
                className={cn(
                  'w-1.5 flex-none self-stretch',
                  a.tone === 'danger' ? 'bg-danger' : 'bg-warn',
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{a.text}</div>
                <div className="text-xs text-neutral-700">{a.sub}</div>
              </div>
              <Button
                size="sm"
                className="min-h-11"
                onClick={() =>
                  a.action.kind === 'budgets'
                    ? navigate('/budgets')
                    : logRecurring(
                        data.recurring.find(
                          (r) =>
                            a.action.kind === 'log-recurring' && r.key === a.action.recurringKey,
                        ),
                      )
                }
              >
                {a.action.label}
              </Button>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-5 lg:gap-7">
        <section className="flex flex-col">
          <SectionHeader title="Expense by category" aside="vs last month" />
          {data.breakdown.map((b) => {
            const mom = b.lastMonthPaise
              ? Math.round(((b.spentPaise - b.lastMonthPaise) / b.lastMonthPaise) * 100)
              : null;
            return (
              <div
                key={b.name}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-rule py-2.5"
              >
                <div className="text-sm">{b.name}</div>
                <div className="text-right text-sm font-extrabold tabular">{inr(b.spentPaise)}</div>
                <div className="h-2 self-center bg-accent-100">
                  <div
                    className="h-2 bg-accent"
                    style={{ width: `${((b.spentPaise / maxSpent) * 100).toFixed(1)}%` }}
                  />
                </div>
                <div
                  className={cn(
                    'text-right text-xs tabular',
                    mom !== null && mom > 20 ? 'text-danger-fg' : 'text-neutral-700',
                  )}
                >
                  {mom === null ? 'new' : `${mom > 0 ? '+' : ''}${mom}%`}
                </div>
              </div>
            );
          })}
        </section>

        <div className="flex flex-col gap-5 lg:gap-7">
          <section className="flex flex-col">
            <SectionHeader
              title="Partner balance"
              aside={
                <Button variant="link" onClick={() => navigate('/settlement')}>
                  Settle up →
                </Button>
              }
            />
            {data.settledOn ? (
              <div className="flex items-center gap-2 py-3 text-sm">
                <Check aria-hidden size={16} className="text-accent-700" />
                All partners settled.
              </div>
            ) : (
              data.transfers.map((t) => (
                <div
                  key={t.from + t.to}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-2.5"
                >
                  <div className="text-sm">
                    {t.from} <span className="text-neutral-600">pays</span> {t.to}
                  </div>
                  <div className="font-extrabold tabular">{inr(t.amountPaise)}</div>
                </div>
              ))
            )}
          </section>

          <section className="flex flex-col">
            <SectionHeader
              title="Recurring this month"
              aside={
                <Button variant="link" onClick={() => navigate('/recurring')}>
                  {logged} of {data.recurring.length} logged →
                </Button>
              }
            />
            {pending.slice(0, 3).map((r) => {
              const st = recurringStatus(r);
              return (
                <div
                  key={r.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-2.5"
                >
                  <div>
                    <div className="text-sm">{r.name}</div>
                    <div className="text-xs text-neutral-700">
                      {inr(r.amountPaise)} · day {r.dayOfMonth}
                    </div>
                  </div>
                  <Tag tone={st.tone} className="text-xs">
                    {st.short}
                  </Tag>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
