import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { useCategories, usePeople, useTransactions } from '@/api/queries';
import { useAuthedSession, useSession } from '@/app/session';
import { EmptyState, Loading, Note, Segmented, Select, Stat, StatGrid } from '@/components/ui';
import { PAYMENT_MODES, type Transaction, type TransactionFilters } from '@/domain/types';
import { daysBetween, todayIso } from '@/lib/dates';
import { inr } from '@/lib/money';
import { PendingEntries } from '@/offline/PendingEntries';
import { EntryRow } from './EntryRow';

const TYPE_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Income', label: 'Income' },
  { value: 'Expense', label: 'Expense' },
] as const;

const filterSelect = 'min-h-11 px-2 text-[13px]';

export function TransactionsPage() {
  const session = useAuthedSession();
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Required<Omit<TransactionFilters, 'search'>>>({
    type: 'All',
    category: 'All',
    mode: 'All',
    person: 'All',
  });
  const deferredSearch = useDeferredValue(search);
  const { data: rows, isPending } = useTransactions({ ...filters, search: deferredSearch });
  const { data: categories } = useCategories();
  const { data: people } = usePeople();
  const set =
    <K extends keyof typeof filters>(k: K) =>
    (v: (typeof filters)[K]) =>
      setFilters((f) => ({ ...f, [k]: v }));

  const today = todayIso();
  const canEdit = (t: Transaction) =>
    can('finance.entry.edit_any') ||
    (can('finance.entry.edit_own') &&
      t.recordedBy === session.user.key &&
      daysBetween(t.entryDate, today) <= 7);
  const total = (type: Transaction['type']) =>
    (rows ?? []).filter((t) => t.type === type).reduce((a, t) => a + t.amountPaise, 0);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <label className="flex items-center gap-2.5 border-2 border-ink bg-white px-3">
          <Search aria-hidden size={17} className="text-neutral-700" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, patient, person"
            aria-label="Search entries"
            className="min-h-[46px] w-full min-w-0 border-0 bg-transparent text-[15px] outline-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Entry type"
            options={TYPE_OPTIONS}
            value={filters.type}
            onChange={set('type')}
          />
          <Select
            inline
            aria-label="Category"
            value={filters.category}
            onChange={(e) => set('category')(e.target.value)}
            className={filterSelect}
          >
            <option value="All">All categories</option>
            {[...(categories?.expense ?? []), ...(categories?.income ?? [])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          <Select
            inline
            aria-label="Payment mode"
            value={filters.mode}
            onChange={(e) => set('mode')(e.target.value)}
            className={filterSelect}
          >
            <option value="All">All modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          {can('finance.entry.view', 'all') && (
            <Select
              inline
              aria-label="Person"
              value={filters.person}
              onChange={(e) => set('person')(e.target.value)}
              className={filterSelect}
            >
              <option value="All">Everyone</option>
              {Object.values(people ?? {}).map((p) => (
                <option key={p.key} value={p.key}>
                  {p.shortName}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <StatGrid cols={3}>
        <Stat size="sm" label="Entries" value={rows?.length ?? '–'} />
        <Stat size="sm" label="In" value={inr(total('income'))} income />
        <Stat size="sm" label="Out" value={inr(total('expense'))} />
      </StatGrid>

      <PendingEntries people={people} />

      {isPending ? (
        <Loading />
      ) : rows && rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((t) => (
            <EntryRow key={t.id} txn={t} people={people} detailed editable={canEdit(t)} />
          ))}
        </ul>
      ) : (
        <EmptyState>No entries match these filters.</EmptyState>
      )}
      <Note>
        You can edit or delete your own entries for 7 days. Owners can edit any entry. Every change
        goes to the audit log.
      </Note>
    </>
  );
}
