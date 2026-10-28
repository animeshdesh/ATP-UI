import { Check, Lock, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDashboard, useRecurring, useSettlement, useTransactionPage } from '@/api/queries';
import { useSession, inr } from '@atp/core';
import { Button, Loading, SectionHeader, Stat, StatGrid, Tag, cn } from '@atp/ui';
import type { AttentionItem, DashboardData, PartyRef, RecurringItem } from '@atp/core';
import { useEditEntry, useQuickAdd } from '@/features/entry/QuickAddContext';
import { logPrefill, recurringStatus } from '@/features/recurring/status';
import { EntryRow } from '@/features/transactions/EntryRow';
import { PeriodSwitch, usePeriod } from './PeriodSwitch';
import { change, periodRanges } from './periods';

export function DashboardPage() {
  const { can } = useSession();
  const clinicView = can('finance.report.view', 'all');
  const edit = useEditEntry();
  const navigate = useNavigate();
  const recent = useTransactionPage({ limit: 5 });

  return (
    <>
      {clinicView && (
        <div className="lg:hidden">
          <PeriodSwitch block />
        </div>
      )}
      {clinicView ? <ClinicTiles /> : <OwnTiles />}

      {clinicView ? (
        <ClinicSections />
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
        {recent.isPending ? (
          <Loading />
        ) : (
          <ul className="m-0 list-none p-0">
            {(recent.data?.items ?? []).map((t) => (
              <EntryRow key={t.id} txn={t} onOpen={() => edit(t)} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const signed = (paise: number) => (paise < 0 ? '−' : '') + inr(paise);

/** `GET /v1/dashboard` for the selected period and the same span before it (L5). */
function useDashboardFor(clinic: boolean) {
  const [period] = usePeriod();
  const { current, previous, vsLabel } = periodRanges(clinic ? period : 'month');
  const q = useDashboard({ ...current, compareFrom: previous.from, compareTo: previous.to });
  return { data: q.data, vsLabel };
}

function ClinicTiles() {
  const { data, vsLabel } = useDashboardFor(true);
  if (!data) return <Loading />;
  const { totals: now, previousTotals: before } = data;
  const vs = (a: number, b: number) => change(a, b, vsLabel) ?? undefined;
  return (
    <StatGrid>
      <Stat
        label="Income"
        value={inr(now.incomePaise)}
        sub={vs(now.incomePaise, before.incomePaise)}
        income
      />
      <Stat
        label="Expense"
        value={inr(now.expensePaise)}
        sub={vs(now.expensePaise, before.expensePaise)}
      />
      <Stat label="Net" value={signed(now.netPaise)} sub={vs(now.netPaise, before.netPaise)} />
      <Stat
        label="Cash in hand"
        value={signed(now.cashInHandPaise)}
        sub={`Cash in ${inr(now.cashInPaise)} − out ${inr(now.cashOutPaise)}`}
      />
    </StatGrid>
  );
}

/** Therapist / front desk: the API scopes every figure to entries they recorded or hold. */
function OwnTiles() {
  const { session } = useSession();
  const { data } = useDashboardFor(false);
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <StatGrid>
      <Stat label="Entries logged" value={t.count} sub="This month" />
      <Stat label="Income logged" value={inr(t.incomePaise)} sub="Patient payments" income />
      <Stat label="Expense logged" value={inr(t.expensePaise)} sub="Paid for the clinic" />
      <Stat
        label="Cash you hold"
        value={signed(t.cashInHandPaise)}
        sub={session?.role === 'frontdesk' ? 'Collected at desk' : 'Net cash on you'}
      />
    </StatGrid>
  );
}

/** Expense categories with a monthly budget (L6 fills `budgetPaise` on the dashboard). */
function budgetRows(data: DashboardData | undefined) {
  return (data?.expenseByCategory ?? []).flatMap((c) =>
    c.budgetPaise ? [{ name: c.name, budgetPaise: c.budgetPaise, spentPaise: c.amountPaise }] : [],
  );
}

function attentionItems(
  recurring: RecurringItem[],
  budgets: ReturnType<typeof budgetRows>,
): AttentionItem[] {
  return [
    ...recurring
      .filter((r) => recurringStatus(r).overdue)
      .map<AttentionItem>((r) => ({
        tone: 'danger',
        text: `${r.name} not logged`,
        sub: `Recurring · ${inr(r.expectedAmountPaise)} ${recurringStatus(r).label.replace('Overdue · due', 'was due')}`,
        action: { label: 'Log now', kind: 'log-recurring', item: r },
      })),
    ...budgets
      .filter((c) => c.budgetPaise > 0 && c.spentPaise / c.budgetPaise >= 0.8)
      .map<AttentionItem>((c) => {
        const p = c.spentPaise / c.budgetPaise;
        return {
          tone: p >= 1 ? 'danger' : 'warn',
          text: `${c.name} at ${Math.round(p * 100)}% of budget`,
          sub: `${inr(c.spentPaise)} of ${inr(c.budgetPaise)}`,
          action: { label: 'Budgets', kind: 'budgets' },
        };
      }),
  ];
}

function ClinicSections() {
  const navigate = useNavigate();
  const openAdd = useQuickAdd();
  const { can } = useSession();
  const { data } = useDashboardFor(true);
  const canSeeSettlement = can('finance.settlement.manage') || can('finance.report.view', 'all');
  const settlement = useSettlement(canSeeSettlement).data;
  const recurring = useRecurring().data ?? [];
  const attention = attentionItems(recurring, budgetRows(data));
  const breakdown = data?.expenseByCategory ?? [];
  const maxSpent = Math.max(...breakdown.map((b) => b.amountPaise), 1);
  const partyName = (p: PartyRef) => (p.kind === 'clinic' ? 'Clinic account' : p.name);
  const pending = recurring.filter((r) => !r.logged);
  const logged = recurring.length - pending.length;
  const allowed = (a: AttentionItem['action']) =>
    a.kind === 'budgets' ? can('finance.budget.manage') : can('finance.entry.create');

  return (
    <>
      {attention.length > 0 && (
        <section
          className="flex flex-col border-2 border-ink bg-white"
          aria-label="Needs attention"
        >
          <div className="flex items-center gap-2 border-b-2 border-ink px-4 py-2.5 text-[11px] font-extrabold tracking-[.08em] uppercase">
            <TriangleAlert aria-hidden size={15} />
            Needs attention
          </div>
          {attention.map((a) => (
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
              {allowed(a.action) && (
                <Button
                  size="sm"
                  className="min-h-11"
                  onClick={() =>
                    a.action.kind === 'budgets'
                      ? navigate('/budgets')
                      : openAdd(logPrefill(a.action.item))
                  }
                >
                  {a.action.label}
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-5 lg:gap-7">
        <section className="flex flex-col">
          <SectionHeader title="Expense by category" aside="vs previous period" />
          {breakdown.length === 0 && (
            <div className="py-3 text-sm text-neutral-700">No expenses in this period.</div>
          )}
          {breakdown.map((b) => {
            const mom = b.previousPaise
              ? Math.round(((b.amountPaise - b.previousPaise) / b.previousPaise) * 100)
              : null;
            return (
              <div
                key={b.categoryId}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-rule py-2.5"
              >
                <div className="text-sm">{b.name}</div>
                <div className="text-right text-sm font-extrabold tabular">
                  {inr(b.amountPaise)}
                </div>
                <div className="h-2 self-center bg-accent-100">
                  <div
                    className="h-2 bg-accent"
                    style={{ width: `${((b.amountPaise / maxSpent) * 100).toFixed(1)}%` }}
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
                can('finance.settlement.manage') && (
                  <Button variant="link" onClick={() => navigate('/settlement')}>
                    Settle up →
                  </Button>
                )
              }
            />
            {settlement && settlement.transfers.length === 0 ? (
              <div className="flex items-center gap-2 py-3 text-sm">
                <Check aria-hidden size={16} className="text-accent-700" />
                {settlement.entryCount === 0 ? 'All partners settled.' : 'Everyone is even.'}
              </div>
            ) : (
              (settlement?.transfers ?? []).map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-2.5"
                >
                  <div className="text-sm">
                    {partyName(t.from)} <span className="text-neutral-600">pays</span>{' '}
                    {partyName(t.to)}
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
                  {logged} of {recurring.length} logged →
                </Button>
              }
            />
            {pending.slice(0, 3).map((r) => {
              const st = recurringStatus(r);
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-2.5"
                >
                  <div>
                    <div className="text-sm">{r.name}</div>
                    <div className="text-xs text-neutral-700">
                      {inr(r.expectedAmountPaise)} · day {r.dayOfMonth}
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
