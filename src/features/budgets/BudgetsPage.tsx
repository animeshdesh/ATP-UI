import { useState } from 'react';
import { Archive, PiggyBank, Plus } from 'lucide-react';
import { useBudgetMutations, useBudgets, useFunds } from '@/api/queries';
import { useSession } from '@/app/session';
import {
  Button,
  Dialog,
  Field,
  Input,
  Loading,
  Note,
  SectionHeader,
  Segmented,
  Select,
  Tag,
  useToast,
} from '@/components/ui';
import type { BudgetLine, Fund, FundRule, Tone } from '@/domain/types';
import { monthYear } from '@/lib/dates';
import { inr, rupeesToPaise } from '@/lib/money';
import { cn } from '@/lib/cn';

/** PRD 5.4: warning at 80%, alert at 100% (`status` from the API). */
const STATUS: Record<
  BudgetLine['status'],
  { tone: Tone; bar: string; text: string; label: string }
> = {
  over: { tone: 'danger', bar: 'bg-danger', text: 'text-danger-fg', label: 'Over budget' },
  warning: { tone: 'warn', bar: 'bg-warn', text: 'text-warn-fg', label: 'Near limit' },
  ok: { tone: 'accent', bar: 'bg-accent', text: 'text-accent-800', label: 'On track' },
  none: { tone: 'neutral', bar: 'bg-neutral-400', text: 'text-neutral-700', label: 'No budget' },
};

/** "10% of monthly net", "₹10,000 fixed each month", "Manual top-ups". */
function ruleLabel(rule: FundRule | null): string {
  if (!rule) return '';
  if (rule.type === 'fixed') return `${inr(rule.amountPaise)} fixed each month`;
  if (rule.type === 'percent')
    return `${rule.bps / 100}% of monthly ${rule.base === 'net' ? 'net' : 'income'}`;
  return 'Manual top-ups';
}

export function BudgetsPage() {
  const { can } = useSession();
  const manage = can('finance.budget.manage');
  const budgets = useBudgets();
  const funds = useFunds();
  const [editing, setEditing] = useState(false);
  const [newFund, setNewFund] = useState(false);
  const [topUp, setTopUp] = useState<Fund | null>(null);
  const m = useBudgetMutations();
  const toast = useToast();

  if (budgets.isPending) return <Loading />;
  if (budgets.isError || !budgets.data)
    return <p className="text-sm text-danger-fg">Could not load budgets.</p>;
  const data = budgets.data;
  const withBudget = data.categories.filter((c) => c.budgetPaise !== null);
  const without = data.categories.filter((c) => c.budgetPaise === null && c.spentPaise > 0);

  return (
    <>
      <section className="flex flex-col" aria-label="Budgets">
        <SectionHeader
          title={`Monthly budgets · ${monthYear(`${data.month}-01`).split(' ')[0]}`}
          aside={
            manage ? (
              <Button variant="link" onClick={() => setEditing(true)}>
                Edit budgets
              </Button>
            ) : (
              'Warning at 80%, alert at 100%'
            )
          }
        />
        {[...withBudget, ...without].map((c) => {
          const t = STATUS[c.status];
          const pct = c.usedBps === null ? null : c.usedBps / 100;
          return (
            <div
              key={c.categoryId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-rule py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{c.name}</span>
                <Tag tone={t.tone}>{t.label}</Tag>
              </div>
              <div className="text-right text-sm whitespace-nowrap tabular">
                <b>{inr(c.spentPaise)}</b>
                {c.budgetPaise !== null && (
                  <span className="text-neutral-700"> / {inr(c.budgetPaise)}</span>
                )}
              </div>
              <div
                className="relative h-2.5 bg-neutral-200"
                role="meter"
                aria-label={`${c.name} budget used`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct === null ? 0 : Math.round(pct)}
              >
                <div
                  className={cn('h-2.5', t.bar)}
                  style={{ width: `${Math.min(100, pct ?? 0).toFixed(1)}%` }}
                />
                <div
                  className="absolute -top-[3px] -bottom-[3px] left-[80%] w-0.5 bg-neutral-500"
                  aria-hidden
                />
              </div>
              <div className={cn('text-right text-xs font-semibold tabular', t.text)}>
                {pct === null ? '—' : `${Math.round(pct)}%`}
              </div>
            </div>
          );
        })}
        <div className="flex justify-between pt-2 text-[13px] tabular">
          <span className="text-neutral-700">Total</span>
          <span>
            <b>{inr(data.totals.spentPaise)}</b>
            <span className="text-neutral-700"> / {inr(data.totals.budgetPaise)}</span>
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="Funds">
        <SectionHeader
          title="Funds"
          aside={
            manage && (
              <Button variant="link" icon={Plus} onClick={() => setNewFund(true)}>
                New fund
              </Button>
            )
          }
        />
        {funds.isPending ? (
          <Loading />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-0.5 border-2 border-ink bg-ink">
            {(funds.data ?? []).map((f) => (
              <div key={f.id} className="flex flex-col gap-1.5 bg-white px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <PiggyBank aria-hidden size={17} className="text-accent-700" />
                  <span className="text-[15px] font-bold">{f.name}</span>
                </div>
                <div className="text-xs text-neutral-700">{ruleLabel(f.rule)}</div>
                <div className="text-2xl font-extrabold tabular">{inr(f.balancePaise)}</div>
                <div className="text-xs text-neutral-700 tabular">
                  This month: +{inr(f.allocatedPaise + f.toppedUpPaise)} · drawn {inr(f.drawnPaise)}
                </div>
                {manage && (
                  <div className="mt-1 flex gap-3">
                    <Button variant="link" onClick={() => setTopUp(f)}>
                      Top up
                    </Button>
                    <Button
                      variant="link"
                      icon={Archive}
                      className="text-neutral-700"
                      onClick={() =>
                        m.updateFund.mutate(
                          { id: f.id, patch: { archived: true } },
                          {
                            onSuccess: () => toast(`Archived ${f.name}`),
                            onError: (e) =>
                              toast(e instanceof Error ? e.message : 'Could not archive'),
                          },
                        )
                      }
                    >
                      Archive
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Note>Expenses can be drawn against a fund from the entry form.</Note>
      </section>

      {editing && <EditBudgets lines={data.categories} onClose={() => setEditing(false)} />}
      {newFund && <NewFundDialog onClose={() => setNewFund(false)} />}
      {topUp && <TopUpDialog fund={topUp} onClose={() => setTopUp(null)} />}
    </>
  );
}

function EditBudgets({ lines, onClose }: { lines: BudgetLine[]; onClose: () => void }) {
  const { setBudgets } = useBudgetMutations();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      lines.map((l) => [l.categoryId, l.budgetPaise === null ? '' : String(l.budgetPaise / 100)]),
    ),
  );
  const save = async () => {
    const changed = lines
      .map((l) => {
        const v = values[l.categoryId] ?? '';
        const paise = v ? rupeesToPaise(v) : null;
        return paise === l.budgetPaise
          ? null
          : { categoryId: l.categoryId, amountPaise: paise || null };
      })
      .filter((x) => x !== null);
    if (changed.length === 0) return onClose();
    try {
      await setBudgets.mutateAsync({ budgets: changed });
      toast('Budgets saved');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save budgets');
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="Monthly budgets"
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={setBudgets.isPending}>
            Save budgets
          </Button>
        </>
      }
    >
      <div className="text-xs text-neutral-700">
        In rupees, from this month on. Leave empty for no budget.
      </div>
      <div className="flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto">
        {lines.map((l) => (
          <Field key={l.categoryId} label={l.name}>
            {(id) => (
              <Input
                id={id}
                inputMode="numeric"
                value={values[l.categoryId] ?? ''}
                onChange={(e) =>
                  setValues((s) => ({ ...s, [l.categoryId]: e.target.value.replace(/[^\d]/g, '') }))
                }
                className="min-h-11"
              />
            )}
          </Field>
        ))}
      </div>
    </Dialog>
  );
}

const RULE_OPTIONS = [
  { value: 'percent', label: '% of month' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'manual', label: 'Manual' },
] as const;

function NewFundDialog({ onClose }: { onClose: () => void }) {
  const { createFund } = useBudgetMutations();
  const toast = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<FundRule['type']>('percent');
  const [pct, setPct] = useState('10');
  const [base, setBase] = useState<'income' | 'net'>('net');
  const [amount, setAmount] = useState('');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim()) return setError('Add a name.');
    let rule: FundRule;
    if (type === 'percent') {
      const bps = Math.round(Number(pct) * 100);
      if (!(bps >= 1 && bps <= 10000)) return setError('Percent must be between 0.01 and 100.');
      rule = { type, bps, base };
    } else if (type === 'fixed') {
      const p = rupeesToPaise(amount);
      if (!p) return setError('Enter the monthly amount.');
      rule = { type, amountPaise: p };
    } else rule = { type };
    try {
      await createFund.mutateAsync({
        name: name.trim(),
        rule,
        openingBalancePaise: rupeesToPaise(opening),
      });
      toast(`Added ${name.trim()}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the fund.');
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="New fund"
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={createFund.isPending}>
            Add fund
          </Button>
        </>
      }
    >
      <Field label="Name">
        {(id) => (
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Equipment fund"
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] font-semibold">Monthly allocation</div>
        <Segmented
          label="Allocation rule"
          block
          options={RULE_OPTIONS}
          value={type}
          onChange={setType}
        />
      </div>
      {type === 'percent' && (
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Percent">
            {(id) => (
              <Input
                id={id}
                inputMode="decimal"
                value={pct}
                onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))}
              />
            )}
          </Field>
          <Field label="Of the month's">
            {(id) => (
              <Select
                id={id}
                value={base}
                onChange={(e) => setBase(e.target.value as 'income' | 'net')}
              >
                <option value="net">Net</option>
                <option value="income">Income</option>
              </Select>
            )}
          </Field>
        </div>
      )}
      {type === 'fixed' && (
        <Field label="Each month (₹)">
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            />
          )}
        </Field>
      )}
      <Field label="Opening balance (₹, optional)">
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            value={opening}
            onChange={(e) => setOpening(e.target.value.replace(/[^\d]/g, ''))}
          />
        )}
      </Field>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}

function TopUpDialog({ fund, onClose }: { fund: Fund; onClose: () => void }) {
  const { topUp } = useBudgetMutations();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const save = async () => {
    const p = rupeesToPaise(amount);
    if (!p) return setError('Enter an amount.');
    try {
      await topUp.mutateAsync({ id: fund.id, topUp: { amountPaise: p, note: note.trim() } });
      toast(`Topped up ${fund.name} by ${inr(p)}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not top up.');
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Top up ${fund.name}`}
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={topUp.isPending}>
            Top up
          </Button>
        </>
      }
    >
      <Field label="Amount (₹)">
        {(id) => (
          <Input
            id={id}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          />
        )}
      </Field>
      <Field label="Note (optional)">
        {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}
