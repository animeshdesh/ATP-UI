/**
 * D-028 settlement maths, mirroring backend L4 for the mock. Integer paise throughout.
 * balance > 0: holds more than their share and pays. balance < 0: is owed.
 */
export interface PartnerRow {
  id: string;
  received: number;
  paid: number;
  shareBps: number;
}

/** Splits `net` by basis points exactly to the paisa (remainder to the largest shares first). */
export function allocate(
  net: number,
  rows: Array<{ id: string; shareBps: number }>,
): Map<string, number> {
  const total = rows.reduce((a, r) => a + r.shareBps, 0) || 1;
  const exact = rows.map((r) => ({ id: r.id, v: (net * r.shareBps) / total }));
  const out = new Map(exact.map((e) => [e.id, Math.trunc(e.v)]));
  let rest = net - [...out.values()].reduce((a, v) => a + v, 0);
  const order = [...exact].sort((a, b) => Math.abs(b.v % 1) - Math.abs(a.v % 1));
  for (let i = 0; rest !== 0 && order.length; i++) {
    const e = order[i % order.length]!;
    const step = Math.sign(rest);
    out.set(e.id, out.get(e.id)! + step);
    rest -= step;
  }
  return out;
}

export function computeSettlement(rows: PartnerRow[]) {
  const net = rows.reduce((a, p) => a + p.received - p.paid, 0);
  const alloc = allocate(net, rows);
  const balances = rows.map((p) => ({
    id: p.id,
    allocation: alloc.get(p.id)!,
    balance: p.received - p.paid - alloc.get(p.id)!,
  }));
  const debtors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ id: b.id, v: b.balance }))
    .sort((a, b) => b.v - a.v);
  const creditors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ id: b.id, v: -b.balance }))
    .sort((a, b) => b.v - a.v);
  const transfers: Array<{ from: string; to: string; amountPaise: number }> = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const v = Math.min(d.v, c.v);
    transfers.push({ from: d.id, to: c.id, amountPaise: v });
    d.v -= v;
    c.v -= v;
    if (d.v === 0) i++;
    if (c.v === 0) j++;
  }
  return { net, balances, transfers };
}
