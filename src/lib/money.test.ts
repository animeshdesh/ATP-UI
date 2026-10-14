import { describe, expect, it } from 'vitest';
import { inr, rupeesToPaise, signedInr } from './money';

describe('money', () => {
  it('formats paise as Indian-grouped rupees', () => {
    expect(inr(32910000)).toBe('₹3,29,100');
    expect(inr(60000)).toBe('₹600');
    expect(inr(0)).toBe('₹0');
  });

  it('drops sign and rounds to whole rupees', () => {
    expect(inr(-1473750)).toBe('₹14,738');
    expect(inr(2773749)).toBe('₹27,737');
  });

  it('prefixes direction with a true minus sign', () => {
    expect(signedInr(324000, 'expense')).toBe('−₹3,240');
    expect(signedInr(60000, 'income')).toBe('+₹600');
  });

  it('parses typed rupees to paise', () => {
    expect(rupeesToPaise('3,240')).toBe(324000);
    expect(rupeesToPaise('')).toBe(0);
    expect(rupeesToPaise('abc')).toBe(0);
  });
});
