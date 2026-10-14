/** API money is integer paise (D-005). Format to INR only at display. */
const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** 1234500 → "₹12,345". Sign is dropped; use `signedInr` when direction matters. */
export function inr(paise: number): string {
  return '₹' + inrFormatter.format(Math.round(Math.abs(paise) / 100));
}

/** Income shows "+₹600", expense "−₹3,240" (U+2212 minus, matches the design). */
export function signedInr(paise: number, type: 'income' | 'expense'): string {
  return (type === 'expense' ? '−' : '+') + inr(paise);
}

/** Parses typed rupees ("3,240" / "3240") to paise. Returns 0 for empty or invalid input. */
export function rupeesToPaise(input: string): number {
  const digits = input.replace(/[^\d]/g, '');
  return digits ? Number(digits) * 100 : 0;
}
