/*
 * In-memory stand-in for backend levels not in the contract yet: L7 reports (D-012).
 * L2: l2.ts · L3: ledger.ts · L4–L6: finance.ts.
 */
import type { ReportPreview } from '@/domain/types';
import { resetMockFinance } from './finance';
import { resetMockL2 } from './l2';
import { resetMockLedger } from './ledger';

/** Test hook: restore seed state of every mock. */
export function resetMockDb() {
  resetMockL2();
  resetMockLedger();
  resetMockFinance();
}

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

export const mockServer = {
  // ── Reports (L7) ─────────────────────────────────────────
  async getReportPreview(month: string): Promise<ReportPreview> {
    return latency({
      month,
      periodLabel: '1–30 September 2026',
      incomePaise: 29850000,
      expensePaise: 13190000,
      categories: [
        ['Rent', 60000],
        ['Salaries', 38000],
        ['Consumables', 14650],
        ['Utilities', 7420],
        ['Marketing', 5000],
        ['Other', 6830],
      ].map(([name, v]) => ({ name: name as string, amountPaise: (v as number) * 100 })),
      transactions: [
        ['01 Sep', 'Salaries · Watchman', 'Cash', 9000],
        ['01 Sep', 'Salaries · Staff', 'Bank', 21000],
        ['02 Sep', 'Clinic session · R. Pawar', 'UPI', 600],
        ['03 Sep', 'Consumables · Gel', 'UPI', 2150],
        ['05 Sep', 'Rent · September', 'Bank', 60000],
        ['05 Sep', 'Package · A. Kulkarni', 'Card', 6000],
      ].map(([date, label, mode, v]) => ({
        date: date as string,
        label: label as string,
        mode: mode as string,
        amountPaise: (v as number) * 100,
      })),
      transactionCount: 148,
      settlementLine: 'Settled 2 Oct 2026 · 3 payments · ₹31,240',
      caEmail: 'accounts@kulkarnica.in',
      pages: 6,
    });
  },
  async exportReport(_month: string, format: 'pdf' | 'xlsx' | 'csv' | 'receipts' | 'email') {
    const messages = {
      pdf: 'CA report for September ready · 6 pages',
      xlsx: 'Exported September as Excel',
      csv: 'Exported September as CSV',
      receipts: 'Zipped 38 receipt photos',
      email: 'Sent to accounts@kulkarnica.in',
    };
    return latency({ message: messages[format] }, 400);
  },
};
