import { useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Pencil, Repeat } from 'lucide-react';
import { useCategories, useCategoryMutations, useRecurring } from '@/api/queries';
import { Button, Dialog, Field, IconButton, Input, Loading, Segmented, useToast } from '@atp/ui';
import type { Category, EntryType } from '@atp/core';
import { inr } from '@atp/core';

const TABS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

export function CategoriesPage() {
  const { data, isPending, isError } = useCategories(true);
  const { data: recurring } = useRecurring();
  const m = useCategoryMutations();
  const toast = useToast();
  const [tab, setTab] = useState<EntryType>('expense');
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<Category | null>(null);
  if (isPending) return <Loading />;
  if (isError || !data) return <p className="text-sm text-danger-fg">Could not load categories.</p>;

  const ofType = data.filter((c) => c.type === tab).sort((a, b) => a.sortOrder - b.sortOrder);
  const active = ofType.filter((c) => !c.archived);
  const archived = ofType.filter((c) => c.archived);
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : 'Could not save');

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    if (ofType.some((c) => c.name.toLowerCase() === n.toLowerCase()))
      return toast(`${n} already exists`);
    try {
      await m.create.mutateAsync({ type: tab, name: n });
      setName('');
      toast(`Added ${n}`);
    } catch (e) {
      fail(e);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const ids = active.map((c) => c.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    m.reorder.mutate({ type: tab, ids }, { onError: fail });
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
          disabled={m.create.isPending}
        >
          Add
        </Button>
      </form>

      <ul
        className="m-0 flex list-none flex-col border-t-2 border-divider p-0"
        aria-label={`${tab} categories`}
      >
        {active.map((c, i) => {
          const rec = (recurring ?? []).filter((r) => r.categoryId === c.id);
          return (
            <li
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b border-rule py-1.5"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{c.name}</div>
                {rec.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-accent-700">
                    <Repeat aria-hidden size={12} className="flex-none" />
                    {rec
                      .map((r) => `${r.name} ${inr(r.expectedAmountPaise)} on day ${r.dayOfMonth}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
              <div className="flex">
                <IconButton
                  icon={ArrowUp}
                  label={`Move ${c.name} up`}
                  disabled={i === 0 || m.reorder.isPending}
                  className="disabled:opacity-30"
                  onClick={() => move(i, -1)}
                />
                <IconButton
                  icon={ArrowDown}
                  label={`Move ${c.name} down`}
                  disabled={i === active.length - 1 || m.reorder.isPending}
                  className="disabled:opacity-30"
                  onClick={() => move(i, 1)}
                />
                <IconButton
                  icon={Pencil}
                  label={`Rename ${c.name}`}
                  onClick={() => setRenaming(c)}
                />
                <IconButton
                  icon={Archive}
                  label={`Archive ${c.name}`}
                  onClick={() =>
                    m.update.mutate(
                      { id: c.id, archived: true },
                      { onSuccess: () => toast(`Archived ${c.name}`), onError: fail },
                    )
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <section className="flex flex-col" aria-label="Archived categories">
          <div className="border-b-2 border-divider pb-1.5 kicker">
            Archived · kept on past entries
          </div>
          {archived.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b border-rule py-1.5"
            >
              <span className="text-sm text-neutral-700">{c.name}</span>
              <Button
                variant="link"
                className="px-2 py-3"
                onClick={() => m.update.mutate({ id: c.id, archived: false }, { onError: fail })}
              >
                Restore
              </Button>
            </div>
          ))}
        </section>
      )}

      <RenameDialog category={renaming} onClose={() => setRenaming(null)} />
    </>
  );
}

function RenameDialog({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const { update } = useCategoryMutations();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const value = name ?? category?.name ?? '';
  const close = () => {
    setName(null);
    onClose();
  };
  return (
    <Dialog
      open={!!category}
      onClose={close}
      title="Rename category"
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!value.trim() || value.trim() === category?.name || update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ id: category!.id, name: value.trim() });
                toast(`Renamed to ${value.trim()}`);
                close();
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Could not rename');
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <Field label="Name" hint="Past entries show the new name too.">
        {(id) => <Input id={id} value={value} onChange={(e) => setName(e.target.value)} />}
      </Field>
    </Dialog>
  );
}
