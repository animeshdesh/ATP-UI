import type { Transfer } from '@/domain/types';

export interface LedgerRow {
  key: string;
  paid: number;
  received: number;
  sharePct: number;
}

/**
 * Partner balances and the fewest transfers that clear them (PRD 5.3).
 * Reference implementation for the mock; backend L4 owns the real engine.
 * balance > 0: partner holds more than their share of clinic net and owes the others.
 */
export function computeSettlement(rows: LedgerRow[]) {
  const net = rows.reduce((a, p) => a + p.received - p.paid, 0);
  const balances = rows.map((p) => ({
    key: p.key,
    balance: Math.round(p.received - p.paid - (net * p.sharePct) / 100),
  }));
  const debtors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ key: b.key, v: b.balance }))
    .sort((a, b) => b.v - a.v);
  const creditors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ key: b.key, v: -b.balance }))
    .sort((a, b) => b.v - a.v);

  const transfers: Array<Omit<Transfer, 'amountPaise'> & { amountPaise: number }> = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const v = Math.min(d.v, c.v);
    transfers.push({ from: d.key, to: c.key, amountPaise: v });
    d.v -= v;
    c.v -= v;
    if (d.v < 100) i++;
    if (c.v < 100) j++;
  }
  return { net, balances, transfers };
}
