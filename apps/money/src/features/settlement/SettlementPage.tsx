import { useState } from 'react';
import { ArrowRight, Check, MessageCircle, Percent, TriangleAlert, UserPlus } from 'lucide-react';
import { ApiError } from '@/api';
import {
  useAddPartner,
  usePeople,
  useSetShares,
  useSettle,
  useSettlement,
  useSettlementHistory,
  useShares,
  useUndoSettlement,
} from '@/api/queries';
import { formatAt } from '@/features/audit/describe';
import { useSession, initials, dateRange, longDate } from '@atp/core';
import {
  Avatar,
  Button,
  Dialog,
  Field,
  Input,
  Loading,
  Panel,
  SectionHeader,
  Select,
  useToast,
  cn,
} from '@atp/ui';
import type { PartyRef, SettlementPosition } from '@atp/core';
import { inr } from '@/lib/money';

const partyName = (p: PartyRef) => (p.kind === 'clinic' ? 'Clinic account' : p.name);
const shortDate = (iso: string) => longDate(iso).replace(/^\w+, /, '');

function periodLabel(pos: SettlementPosition) {
  return pos.periodFrom
    ? dateRange(pos.periodFrom, pos.periodTo)
    : `up to ${shortDate(pos.periodTo)}`;
}

export function SettlementPage() {
  const { can } = useSession();
  const manage = can('finance.settlement.manage');
  const { data: pos, isPending, isError, refetch } = useSettlement();
  const settle = useSettle();
  const toast = useToast();
  const [sharesOpen, setSharesOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  if (isPending) return <Loading />;
  if (isError || !pos)
    return <p className="text-sm text-danger-fg">Could not load the settlement.</p>;

  const nothingOpen = pos.entryCount === 0;
  const whatsappText = encodeURIComponent(
    `ATP Rehab settlement · ${periodLabel(pos)}\n` +
      pos.transfers
        .map((t) => `${partyName(t.from)} pays ${partyName(t.to)} ${inr(t.amountPaise)}`)
        .join('\n'),
  );

  const markSettled = async () => {
    try {
      const s = await settle.mutateAsync({ to: pos.periodTo, fingerprint: pos.fingerprint });
      toast(`Settlement recorded · ${s.transferCount} payments`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'settlement_changed') {
        await refetch();
        toast('Entries changed since you opened this. Review the new figures and settle again.');
      } else toast(e instanceof Error ? e.message : 'Could not settle');
    }
  };

  return (
    <>
      {pos.shares.stale && (
        <div
          role="alert"
          className="flex items-center gap-2 border-2 border-ink bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-fg"
        >
          <TriangleAlert aria-hidden size={16} className="flex-none" />
          <span className="flex-1">
            Partners changed since profit shares were saved. Equal shares are used until you save
            new ones.
          </span>
          {manage && (
            <Button size="sm" className="bg-white" onClick={() => setSharesOpen(true)}>
              Set shares
            </Button>
          )}
        </div>
      )}

      <Panel>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink px-4 py-3.5">
          <h2 className="text-lg">Settle up · {periodLabel(pos)}</h2>
          <span className="text-xs text-neutral-700">
            {nothingOpen ? 'Nothing open' : `${pos.entryCount} unsettled entries · fewest payments`}
          </span>
        </div>
        {nothingOpen ? (
          <div className="flex items-start gap-3 px-4 py-[18px]">
            <Check aria-hidden size={22} className="flex-none text-accent-700" />
            <div>
              <div className="text-[15px] font-bold">
                {pos.lastSettlement
                  ? `Settled on ${formatAt(pos.lastSettlement.settledAt)}`
                  : 'Nothing to settle yet'}
              </div>
              <div className="text-[13px] text-neutral-700">New entries will show up here.</div>
            </div>
          </div>
        ) : (
          <>
            {pos.transfers.length === 0 && (
              <div className="border-b border-rule px-4 py-3.5 text-sm">
                Everyone is even. Settling just closes these entries.
              </div>
            )}
            {pos.transfers.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_24px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-rule px-4 py-3.5"
              >
                <div className="text-sm font-semibold">{partyName(t.from)}</div>
                <ArrowRight aria-label="pays" size={18} className="text-accent-700" />
                <div className="text-sm font-semibold">{partyName(t.to)}</div>
                <div className="text-[17px] font-extrabold tabular">{inr(t.amountPaise)}</div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5 px-4 py-3.5">
              {manage && (
                <Button
                  variant="primary"
                  trailingIcon={Check}
                  className="min-h-12 min-w-[200px] flex-1 text-[15px]"
                  disabled={settle.isPending}
                  onClick={markSettled}
                >
                  Mark as settled
                </Button>
              )}
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

      <section className="flex flex-col" aria-label="Partners">
        <SectionHeader
          title="Partners"
          aside={`Partner net ${inr(pos.partnerNetPaise)} · ${pos.shares.source === 'equal' ? 'equal shares' : 'saved shares'}`}
        />
        {pos.partners.map((p) => {
          const label = p.balancePaise > 0 ? 'Owes' : p.balancePaise < 0 ? 'Is owed' : 'Balance';
          return (
            <div
              key={p.partnerId}
              className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] items-center gap-x-4 gap-y-2 border-b border-rule py-3.5"
            >
              <div className="col-span-full flex min-w-0 items-center gap-2.5">
                <Avatar initials={initials(p.name)} filled={false} size={34} />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-neutral-700">
                    Profit share {(p.shareBps / 100).toFixed(p.shareBps % 100 ? 2 : 0)}%
                  </div>
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
                    p.balancePaise > 0
                      ? 'text-danger-fg'
                      : p.balancePaise < 0
                        ? 'text-accent-700'
                        : 'text-neutral-700',
                  )}
                >
                  {inr(p.balancePaise)}
                </div>
              </div>
            </div>
          );
        })}
        {manage && (
          <div className="flex flex-wrap gap-2.5 pt-3">
            <Button icon={UserPlus} onClick={() => setPartnerOpen(true)}>
              Add partner
            </Button>
            <Button icon={Percent} onClick={() => setSharesOpen(true)}>
              Edit profit shares
            </Button>
          </div>
        )}
      </section>

      {(pos.staff.length > 0 ||
        pos.clinicAccount.receivedPaise + pos.clinicAccount.paidPaise > 0) && (
        <section className="flex flex-col" aria-label="Clinic account">
          <SectionHeader
            title="Clinic account"
            aside={`Net ${inr(pos.clinicAccount.netPaise)} · not split`}
          />
          <div className="grid grid-cols-2 gap-x-4 border-b border-rule py-3">
            <Figure label="Received into it" value={inr(pos.clinicAccount.receivedPaise)} />
            <Figure label="Paid from it" value={inr(pos.clinicAccount.paidPaise)} />
          </div>
          {pos.staff.map((s) => (
            <div
              key={s.memberId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-rule py-3"
            >
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-neutral-700">
                  Received {inr(s.receivedPaise)} · paid {inr(s.paidPaise)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] tracking-[.06em] text-neutral-700 uppercase">
                  {s.balancePaise > 0 ? 'To deposit' : s.balancePaise < 0 ? 'To reimburse' : 'Even'}
                </div>
                <div className="text-[15px] font-extrabold tabular">{inr(s.balancePaise)}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <History manage={manage} />
      <SharesDialog open={sharesOpen} onClose={() => setSharesOpen(false)} />
      <AddPartnerDialog open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}

function History({ manage }: { manage: boolean }) {
  const { data } = useSettlementHistory();
  const undo = useUndoSettlement();
  const toast = useToast();
  if (!data?.length) return null;
  return (
    <section className="flex flex-col" aria-label="Settlement history">
      <SectionHeader title="History" />
      {data.map((h, i) => (
        <div
          key={h.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-rule py-3"
        >
          <div>
            <div className="text-sm font-semibold">
              {h.periodFrom
                ? dateRange(h.periodFrom, h.periodTo)
                : `Up to ${shortDate(h.periodTo)}`}
            </div>
            <div className="text-xs text-neutral-700">
              Settled {formatAt(h.settledAt)} by {h.settledBy.name} · {h.transferCount} payments ·{' '}
              {h.entryCount} entries
            </div>
            {manage && i === 0 && (
              <Button
                variant="link"
                className="underline"
                disabled={undo.isPending}
                onClick={() =>
                  undo.mutate(h.id, {
                    onSuccess: () => toast('Settlement undone. Its entries are open again.'),
                    onError: (e) => toast(e instanceof Error ? e.message : 'Could not undo'),
                  })
                }
              >
                Undo
              </Button>
            )}
          </div>
          <div className="text-sm font-extrabold tabular">{inr(h.transferredPaise)}</div>
        </div>
      ))}
    </section>
  );
}

function SharesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useShares();
  const setShares = useSetShares();
  const toast = useToast();
  const [pct, setPct] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const partners = data?.effective.partners ?? [];
  const value = (id: string, bps: number) => pct[id] ?? String(bps / 100);
  const totalBps = partners.reduce(
    (a, p) => a + Math.round(Number(value(p.partnerId, p.shareBps) || 0) * 100),
    0,
  );
  const close = () => {
    setPct({});
    setError('');
    onClose();
  };
  const save = async () => {
    if (totalBps !== 10000)
      return setError(`Shares add up to ${(totalBps / 100).toFixed(2)}%. They must total 100%.`);
    try {
      await setShares.mutateAsync({
        shares: partners.map((p) => ({
          partnerId: p.partnerId,
          shareBps: Math.round(Number(value(p.partnerId, p.shareBps)) * 100),
        })),
      });
      toast('Profit shares saved');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save shares');
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Profit shares"
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={setShares.isPending || !data}>
            Save shares
          </Button>
        </>
      }
    >
      {partners.map((p) => (
        <Field key={p.partnerId} label={`${p.name} (%)`}>
          {(id) => (
            <Input
              id={id}
              inputMode="decimal"
              value={value(p.partnerId, p.shareBps)}
              onChange={(e) =>
                setPct((s) => ({ ...s, [p.partnerId]: e.target.value.replace(/[^\d.]/g, '') }))
              }
            />
          )}
        </Field>
      ))}
      <div
        className={cn(
          'text-[13px] font-semibold',
          totalBps === 10000 ? 'text-neutral-700' : 'text-danger-fg',
        )}
      >
        Total {(totalBps / 100).toFixed(2)}% · applies from today
      </div>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}

function AddPartnerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: people } = usePeople();
  const add = useAddPartner();
  const toast = useToast();
  const [memberId, setMemberId] = useState('');
  const candidates = (people ?? []).filter((p) => !p.isPartner && p.status === 'active');
  const close = () => {
    setMemberId('');
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add partner"
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!memberId || add.isPending}
            onClick={async () => {
              try {
                const p = await add.mutateAsync(memberId);
                toast(`${p.name} is now a partner. Review profit shares.`);
                close();
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Could not add partner');
              }
            }}
          >
            Add partner
          </Button>
        </>
      }
    >
      <Field label="Member" hint="Partners share profit. Set new shares after adding someone.">
        {(id) => (
          <Select id={id} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Pick a member</option>
            {candidates.map((p) => (
              <option key={p.memberId} value={p.memberId}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </Dialog>
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
