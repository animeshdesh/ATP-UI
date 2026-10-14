import { ArrowRight, Check, CircleCheck, MessageCircle, Percent, UserPlus } from 'lucide-react';
import { useMarkSettled, useSettlement, useUndoSettlement } from '@/api/queries';
import { Avatar, Button, Loading, Panel, SectionHeader, useToast } from '@/components/ui';
import { longDate } from '@/lib/dates';
import { inr } from '@/lib/money';
import { cn } from '@/lib/cn';

export function SettlementPage() {
  const { data, isPending } = useSettlement();
  const settle = useMarkSettled();
  const undo = useUndoSettlement();
  const toast = useToast();
  if (isPending || !data) return <Loading />;

  const whatsappText = encodeURIComponent(
    `ATP Rehab settlement · ${data.period}\n` +
      data.transfers.map((t) => `${t.from} pays ${t.to} ${inr(t.amountPaise)}`).join('\n'),
  );

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink px-4 py-3.5">
          <h2 className="text-lg">Settle up · {data.period}</h2>
          <span className="text-xs text-neutral-700">Fewest payments to clear all balances</span>
        </div>
        {data.settledOn ? (
          <div className="flex items-start gap-3 px-4 py-[18px]">
            <CircleCheck aria-hidden size={22} className="flex-none text-accent-700" />
            <div>
              <div className="text-[15px] font-bold">Settled on {longDate(data.settledOn)}</div>
              <div className="text-[13px] text-neutral-700">
                Settlement transactions recorded. Running balances reset to ₹0.
              </div>
              <Button variant="link" className="mt-2 underline" onClick={() => undo.mutate()}>
                Undo
              </Button>
            </div>
          </div>
        ) : (
          <>
            {data.transfers.map((t) => (
              <div
                key={t.from + t.to}
                className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-rule px-4 py-3.5"
              >
                <div className="text-sm font-semibold">{t.from}</div>
                <ArrowRight aria-label="pays" size={18} className="text-accent-700" />
                <div className="text-sm font-semibold">{t.to}</div>
                <div className="text-[17px] font-extrabold tabular">{inr(t.amountPaise)}</div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5 px-4 py-3.5">
              <Button
                variant="primary"
                trailingIcon={Check}
                className="min-h-12 min-w-[200px] flex-1 text-[15px]"
                disabled={settle.isPending}
                onClick={async () => {
                  const r = await settle.mutateAsync();
                  toast(`Settlement recorded · ${r.payments} payments`);
                }}
              >
                Mark as settled
              </Button>
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 min-w-[200px] flex-1 items-center gap-2 border-2 border-ink px-4 text-sm font-semibold text-ink no-underline hover:bg-accent-100 hover:text-ink"
              >
                <MessageCircle aria-hidden size={17} />
                Share on WhatsApp
              </a>
            </div>
          </>
        )}
      </Panel>

      <section className="flex flex-col">
        <SectionHeader
          title="Partners"
          aside={`Clinic net ${inr(data.clinicNetPaise)} · equal shares`}
        />
        {data.partners.map((p) => {
          const label = data.settledOn ? 'Balance' : p.balancePaise > 0 ? 'Owes' : 'Is owed';
          return (
            <div
              key={p.person.key}
              className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] items-center gap-x-4 gap-y-2 border-b border-rule py-3.5"
            >
              <div className="col-span-full flex min-w-0 items-center gap-2.5">
                <Avatar initials={p.person.initials} filled={false} size={34} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{p.person.fullName}</div>
                  <div className="text-xs text-neutral-700">Profit share {p.sharePct}%</div>
                </div>
              </div>
              <Figure label="Paid out" value={inr(p.paidPaise)} />
              <Figure label="Received" value={inr(p.receivedPaise)} />
              <div>
                <div className="text-[11px] tracking-[.06em] text-neutral-700 uppercase">
                  {label}
                </div>
                <div
                  className={cn(
                    'text-[15px] font-extrabold tabular',
                    data.settledOn
                      ? 'text-neutral-700'
                      : p.balancePaise > 0
                        ? 'text-danger-fg'
                        : 'text-accent-700',
                  )}
                >
                  {inr(p.balancePaise)}
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2.5 pt-3">
          <Button
            icon={UserPlus}
            onClick={() => toast('Partner management arrives with backend L3')}
          >
            Add partner
          </Button>
          <Button icon={Percent} onClick={() => toast('Profit shares arrive with backend L3')}>
            Edit profit shares
          </Button>
        </div>
      </section>

      <section className="flex flex-col">
        <SectionHeader title="History" />
        {data.history.map((h) => (
          <div
            key={h.period}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-rule py-3"
          >
            <div>
              <div className="text-sm font-semibold">{h.period}</div>
              <div className="text-xs text-neutral-700">{h.meta}</div>
            </div>
            <div className="text-sm font-extrabold tabular">{inr(h.amountPaise)}</div>
          </div>
        ))}
      </section>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] tracking-[.06em] text-neutral-700 uppercase">{label}</div>
      <div className="text-sm font-semibold tabular">{value}</div>
    </div>
  );
}
