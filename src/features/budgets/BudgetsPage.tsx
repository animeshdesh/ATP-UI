import { PiggyBank } from 'lucide-react';
import { useBudgets } from '@/api/queries';
import { Button, Loading, Note, SectionHeader, Tag, useToast } from '@/components/ui';
import type { Tone } from '@/domain/types';
import { inr } from '@/lib/money';
import { cn } from '@/lib/cn';

/** PRD 5.4: warning at 80%, alert at 100%. */
function budgetTone(ratio: number): { tone: Tone; bar: string; text: string; label: string } {
  if (ratio >= 1)
    return { tone: 'danger', bar: 'bg-danger', text: 'text-danger-fg', label: 'Over budget' };
  if (ratio >= 0.8)
    return { tone: 'warn', bar: 'bg-warn', text: 'text-warn-fg', label: 'Near limit' };
  return { tone: 'accent', bar: 'bg-accent', text: 'text-accent-800', label: 'On track' };
}

export function BudgetsPage() {
  const { data, isPending } = useBudgets();
  const toast = useToast();
  if (isPending || !data) return <Loading />;
  return (
    <>
      <section className="flex flex-col">
        <SectionHeader
          title={`Monthly budgets · ${data.month.split(' ')[0]}`}
          aside="Warning at 80%, alert at 100%"
        />
        {data.categories.map((c) => {
          const ratio = c.spentPaise / c.budgetPaise;
          const t = budgetTone(ratio);
          return (
            <div
              key={c.name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-rule py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{c.name}</span>
                <Tag tone={t.tone}>{t.label}</Tag>
              </div>
              <div className="text-right text-sm whitespace-nowrap tabular">
                <b>{inr(c.spentPaise)}</b>{' '}
                <span className="text-neutral-700">/ {inr(c.budgetPaise)}</span>
              </div>
              <div
                className="relative h-2.5 bg-neutral-200"
                role="meter"
                aria-label={`${c.name} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(ratio * 100)}
              >
                <div
                  className={cn('h-2.5', t.bar)}
                  style={{ width: `${Math.min(100, ratio * 100).toFixed(1)}%` }}
                />
                <div
                  className="absolute -top-[3px] -bottom-[3px] left-[80%] w-0.5 bg-neutral-500"
                  aria-hidden
                />
              </div>
              <div className={cn('text-right text-xs font-semibold tabular', t.text)}>
                {Math.round(ratio * 100)}%
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Funds"
          aside={
            <Button variant="link" onClick={() => toast('Funds arrive with backend L6')}>
              + New fund
            </Button>
          }
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-0.5 border-2 border-ink bg-ink">
          {data.funds.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5 bg-white px-4 py-3.5">
              <div className="flex items-center gap-2">
                <PiggyBank aria-hidden size={17} className="text-accent-700" />
                <span className="text-[15px] font-bold">{f.name}</span>
              </div>
              <div className="text-xs text-neutral-700">{f.rule}</div>
              <div className="text-2xl font-extrabold tabular">{inr(f.balancePaise)}</div>
              <div className="text-xs text-neutral-700 tabular">
                This month: +{inr(f.allocatedPaise)} · drawn {inr(f.drawnPaise)}
              </div>
            </div>
          ))}
        </div>
        <Note>Expenses can be drawn against a fund from the entry form.</Note>
      </section>
    </>
  );
}
