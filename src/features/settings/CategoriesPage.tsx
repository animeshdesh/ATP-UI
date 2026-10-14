import { useState } from 'react';
import { Archive, GripVertical, Pencil, Repeat } from 'lucide-react';
import { useCategories, useCategoryMutations } from '@/api/queries';
import { Button, IconButton, Input, Loading, Segmented, useToast } from '@/components/ui';
import { inr } from '@/lib/money';

type Kind = 'expense' | 'income';
const TABS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

export function CategoriesPage() {
  const { data, isPending } = useCategories();
  const m = useCategoryMutations();
  const toast = useToast();
  const [tab, setTab] = useState<Kind>('expense');
  const [name, setName] = useState('');
  if (isPending || !data) return <Loading />;

  const list = data[tab];
  const archived = data.archived[tab];
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    if ([...list, ...archived].some((c) => c.toLowerCase() === n.toLowerCase()))
      return toast(`${n} already exists`);
    await m.add.mutateAsync({ type: tab, name: n });
    setName('');
    toast(`Added ${n}`);
  };

  return (
    <>
      <Segmented
        label="Category type"
        options={TABS}
        value={tab}
        onChange={setTab}
        className="self-start"
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <Input
          aria-label="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="min-h-[46px] flex-1 text-[15px]"
        />
        <Button
          type="submit"
          variant="primary"
          className="min-h-[46px] px-[18px]"
          disabled={m.add.isPending}
        >
          Add
        </Button>
      </form>

      <ul className="m-0 flex list-none flex-col border-t-2 border-divider p-0">
        {list.map((c) => {
          const rec = tab === 'expense' ? data.recurring.filter((r) => r.category === c) : [];
          return (
            <li
              key={c}
              className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-rule py-2"
            >
              <GripVertical aria-hidden size={17} className="cursor-grab text-neutral-500" />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{c}</div>
                {rec.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-accent-700">
                    <Repeat aria-hidden size={12} className="flex-none" />
                    {rec
                      .map((r) => `${r.name} ${inr(r.amountPaise)} on day ${r.dayOfMonth}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
              <div className="flex gap-0.5">
                <IconButton
                  icon={Pencil}
                  label={`Edit ${c}`}
                  onClick={() => toast('Rename arrives with backend L3')}
                />
                <IconButton
                  icon={Archive}
                  label={`Archive ${c}`}
                  onClick={() => m.archive.mutate({ type: tab, name: c })}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <section className="flex flex-col">
          <div className="border-b-2 border-divider pb-1.5 kicker">
            Archived · kept on past entries
          </div>
          {archived.map((c) => (
            <div key={c} className="flex items-center justify-between border-b border-rule py-1.5">
              <span className="text-sm text-neutral-700">{c}</span>
              <Button
                variant="link"
                className="px-2 py-3"
                onClick={() => m.restore.mutate({ type: tab, name: c })}
              >
                Restore
              </Button>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
