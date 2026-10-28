import { useState } from 'react';
import { CircleCheck, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { useCategories, useRecurring, useRecurringMutations } from '@/api/queries';
import { useSession, monthShort } from '@atp/core';
import {
  Button,
  Dialog,
  Field,
  Input,
  Loading,
  Note,
  Select,
  Stat,
  StatGrid,
  Tag,
  useToast,
  cn,
} from '@atp/ui';
import { useQuickAdd } from '@/features/entry/QuickAddContext';
import { inr, rupeesToPaise } from '@/lib/money';
import { logPrefill, recurringStatus } from './status';

export function RecurringPage() {
  const { data, isPending, isError } = useRecurring();
  const { can } = useSession();
  const openAdd = useQuickAdd();
  const [adding, setAdding] = useState(false);
  if (isPending) return <Loading />;
  if (isError || !data)
    return <p className="text-sm text-danger-fg">Could not load recurring items.</p>;
  const statuses = data.map((r) => ({ r, s: recurringStatus(r) }));
  const logged = data.filter((r) => r.logged).length;
  const overdue = statuses.filter((x) => x.s.overdue).length;
  const expected = data.reduce((a, r) => a + r.expectedAmountPaise, 0);
  const canLog = can('finance.entry.create');

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
            key={r.id}
            className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-3"
          >
            <div className="flex size-12 flex-col items-center justify-center border-2 border-ink leading-none">
              <span className="text-lg font-extrabold tabular">{r.dueDate.slice(8, 10)}</span>
              <span className="text-[10px] text-neutral-700 uppercase">
                {monthShort(r.dueDate)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{r.name}</div>
              <div className="text-xs text-neutral-700">
                {r.categoryName} · expected {inr(r.expectedAmountPaise)}
                {r.logged &&
                  r.logged.amountPaise !== r.expectedAmountPaise &&
                  ` · logged ${inr(r.logged.amountPaise)}`}
              </div>
              <Tag tone={s.tone} className="mt-1">
                {s.label}
              </Tag>
            </div>
            {r.logged ? (
              <CircleCheck aria-label="Logged" size={22} className="mx-2.5 text-accent-700" />
            ) : (
              canLog && (
                <Button
                  size="sm"
                  variant={s.overdue ? 'primary' : 'outline'}
                  className={cn('min-h-11 font-bold', !s.overdue && 'bg-white')}
                  onClick={() => openAdd(logPrefill(r))}
                >
                  Log now
                </Button>
              )
            )}
          </li>
        ))}
      </ul>
      {can('settings.categories.manage') && (
        <Button icon={Plus} className="self-start" onClick={() => setAdding(true)}>
          Add recurring item
        </Button>
      )}
      <Note>
        Recurring items are expected monthly expenses with an amount and day of month. Their
        categories are set up in <Link to="/settings/categories">Categories</Link>.
      </Note>
      <AddRecurringDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function AddRecurringDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: categories } = useCategories();
  const { create } = useRecurringMutations();
  const toast = useToast();
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState('1');
  const [error, setError] = useState('');
  const close = () => {
    setName('');
    setCategoryId('');
    setAmount('');
    setDay('1');
    setError('');
    onClose();
  };
  const save = async () => {
    const paise = rupeesToPaise(amount);
    const d = Number(day);
    if (!name.trim()) return setError('Add a name.');
    if (!categoryId) return setError('Pick a category.');
    if (!paise) return setError('Enter the expected amount.');
    if (!(d >= 1 && d <= 31)) return setError('Day must be 1 to 31.');
    try {
      await create.mutateAsync({
        name: name.trim(),
        categoryId,
        expectedAmountPaise: paise,
        dayOfMonth: d,
      });
      toast(`Added ${name.trim()}`);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add it.');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add recurring item"
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={create.isPending}>
            Add
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
            placeholder="e.g. Internet"
          />
        )}
      </Field>
      <Field label="Category">
        {(id) => (
          <Select id={id} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Pick a category</option>
            {(categories ?? [])
              .filter((c) => c.type === 'expense')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Expected (₹)">
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            />
          )}
        </Field>
        <Field label="Day of month">
          {(id) => (
            <Input
              id={id}
              inputMode="numeric"
              value={day}
              onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, ''))}
            />
          )}
        </Field>
      </div>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}
