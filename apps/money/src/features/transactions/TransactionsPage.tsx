import { useDeferredValue, useState } from 'react';
import { Search } from 'lucide-react';
import { useCategories, usePeople, useTransactions } from '@/api/queries';
import {
  useSession,
  PAYMENT_MODES,
  PAYMENT_MODE_LABEL,
  type TransactionQuery,
  inr,
} from '@atp/core';
import { Button, EmptyState, Loading, Note, Segmented, Select, Stat, StatGrid } from '@atp/ui';
import { useEditEntry } from '@/features/entry/QuickAddContext';
import { PendingEntries } from '@/offline/PendingEntries';
import { EntryRow } from './EntryRow';

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
] as const;

const filterSelect = 'min-h-11 px-2 text-base lg:text-[13px]';

/** Person filter value for the clinic account (`party=clinic`). */
const CLINIC = 'clinic';

export function TransactionsPage() {
  const { can } = useSession();
  const edit = useEditEntry();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | 'income' | 'expense'>('');
  const [categoryId, setCategoryId] = useState('');
  const [mode, setMode] = useState('');
  const [person, setPerson] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const { data: categories } = useCategories(true);
  const seesAll = can('finance.entry.view', 'all');
  const { data: people } = usePeople();

  const query: TransactionQuery = {
    ...(deferredSearch ? { search: deferredSearch } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(mode ? { paymentMode: mode as TransactionQuery['paymentMode'] } : {}),
    ...(person === CLINIC ? { party: 'clinic' as const } : person ? { memberId: person } : {}),
  };
  const list = useTransactions(query);
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const totals = list.data?.pages[0]?.totals;

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
            className="min-h-[46px] w-full min-w-0 border-0 bg-transparent text-base outline-none lg:text-[15px]"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Segmented label="Entry type" options={TYPE_OPTIONS} value={type} onChange={setType} />
          <Select
            inline
            aria-label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={filterSelect}
          >
            <option value="">All categories</option>
            {(['expense', 'income'] as const).map((t) => (
              <optgroup key={t} label={t === 'expense' ? 'Expense' : 'Income'}>
                {(categories ?? [])
                  .filter((c) => c.type === t)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.archived ? ' (archived)' : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
          <Select
            inline
            aria-label="Payment mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={filterSelect}
          >
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_MODE_LABEL[m]}
              </option>
            ))}
          </Select>
          {seesAll && (
            <Select
              inline
              aria-label="Person"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              className={filterSelect}
            >
              <option value="">Everyone</option>
              {(people ?? []).map((p) => (
                <option key={p.memberId} value={p.memberId}>
                  {p.name}
                </option>
              ))}
              <option value={CLINIC}>Clinic account</option>
            </Select>
          )}
        </div>
      </div>

      <StatGrid cols={3}>
        <Stat size="sm" label="Entries" value={totals?.count ?? '–'} />
        <Stat size="sm" label="In" value={totals ? inr(totals.incomePaise) : '–'} income />
        <Stat size="sm" label="Out" value={totals ? inr(totals.expensePaise) : '–'} />
      </StatGrid>

      <PendingEntries />

      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <p className="text-sm text-danger-fg">Could not load entries.</p>
      ) : rows.length > 0 ? (
        <ul className="m-0 flex list-none flex-col p-0" aria-label="Entries">
          {rows.map((t) => (
            <EntryRow key={t.id} txn={t} detailed onOpen={() => edit(t)} />
          ))}
        </ul>
      ) : (
        <EmptyState>No entries match these filters.</EmptyState>
      )}
      {list.hasNextPage && (
        <Button
          className="self-start"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
      <Note>
        You can edit or delete your own entries for 7 days. Owners can edit any entry. Every change
        goes to the audit log.
      </Note>
    </>
  );
}
