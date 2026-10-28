import { describe, expect, it } from 'vitest';
import { allocate, computeSettlement } from './settlement';

describe('computeSettlement (D-028)', () => {
  it('clears partner balances with the fewest transfers, exact to the paisa', () => {
    const rows = [
      { id: 'Sameer', paid: 7240000, received: 9630000, shareBps: 2500 },
      { id: 'RY', paid: 1825000, received: 8860000, shareBps: 2500 },
      { id: 'RP', paid: 4190000, received: 5280000, shareBps: 2500 },
      { id: 'Santosh', paid: 1200000, received: 6140000, shareBps: 2500 },
    ];
    const { net, balances, transfers } = computeSettlement(rows);
    expect(net).toBe(15455000);
    expect(balances.reduce((a, b) => a + b.balance, 0)).toBe(0);
    expect(transfers).toEqual([
      { from: 'RY', to: 'RP', amountPaise: 2773750 },
      { from: 'RY', to: 'Sameer', amountPaise: 397500 },
      { from: 'Santosh', to: 'Sameer', amountPaise: 1076250 },
    ]);
  });

  it('splits uneven shares without losing a paisa', () => {
    const a = allocate(100, [
      { id: 'a', shareBps: 3334 },
      { id: 'b', shareBps: 3333 },
      { id: 'c', shareBps: 3333 },
    ]);
    expect([...a.values()].reduce((x, y) => x + y, 0)).toBe(100);
  });

  it('returns no transfers when everyone is at their share', () => {
    const rows = ['A', 'B'].map((id) => ({ id, paid: 0, received: 1000, shareBps: 5000 }));
    expect(computeSettlement(rows).transfers).toEqual([]);
  });
});
