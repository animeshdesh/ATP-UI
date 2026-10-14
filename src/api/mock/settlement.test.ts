import { describe, expect, it } from 'vitest';
import { PARTNER_LEDGER } from './fixtures';
import { computeSettlement } from './settlement';

describe('computeSettlement', () => {
  it('clears balances with the fewest transfers', () => {
    const { net, balances, transfers } = computeSettlement(PARTNER_LEDGER);
    expect(net).toBe(15455000);
    expect(balances.reduce((a, b) => a + b.balance, 0)).toBe(0);
    expect(transfers).toEqual([
      { from: 'RY', to: 'RP', amountPaise: 2773750 },
      { from: 'RY', to: 'Sameer', amountPaise: 397500 },
      { from: 'Santosh', to: 'Sameer', amountPaise: 1076250 },
    ]);
  });

  it('returns no transfers when everyone is at their share', () => {
    const rows = ['A', 'B'].map((key) => ({ key, paid: 0, received: 1000, sharePct: 50 }));
    expect(computeSettlement(rows).transfers).toEqual([]);
  });
});
