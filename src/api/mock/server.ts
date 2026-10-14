/*
 * In-memory stand-in for backend levels not in the contract yet: L4 settlement, L5 dashboard
 * aggregates, L6 budgets, L7 reports (D-012). L2 and L3 mocks live in l2.ts and ledger.ts.
 */
import { monthToDate, monthYear } from '@/lib/dates';
import type { Budgets, DashboardAggregates, ReportPreview, Settlement } from '@/domain/types';
import { CATEGORY_SPEND, FUNDS, MOCK_TODAY, PARTNER_LEDGER, PEOPLE } from './fixtures';
import { computeSettlement } from './settlement';
import { mockUserKey, resetMockL2 } from './l2';
import { resetMockLedger } from './ledger';

function freshDb() {
  return { settledOn: undefined as string | undefined };
}

let db = freshDb();

/** Test hook: restore seed state. */
export function resetMockDb() {
  db = freshDb();
  resetMockL2();
  resetMockLedger();
}

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

const me = mockUserKey;

function settlementNow() {
  const result = computeSettlement(PARTNER_LEDGER);
  return {
    ...result,
    transfers: result.transfers.map((t) => ({
      from: PEOPLE[t.from]!.shortName,
      to: PEOPLE[t.to]!.shortName,
      amountPaise: t.amountPaise,
    })),
  };
}

export const mockServer = {
  // ── Dashboard (L5) ───────────────────────────────────────
  async getDashboardAggregates(_period: string): Promise<DashboardAggregates> {
    return latency({
      breakdown: CATEGORY_SPEND,
      transfers: settlementNow().transfers,
      ...(db.settledOn ? { settledOn: db.settledOn } : {}),
    });
  },

  // ── Settlement (L4) ──────────────────────────────────────
  async getSettlement(): Promise<Settlement> {
    const s = settlementNow();
    const owed = s.balances.filter((b) => b.balance > 0).reduce((a, b) => a + b.balance, 0);
    return latency({
      period: monthToDate(MOCK_TODAY),
      clinicNetPaise: s.net,
      transfers: s.transfers,
      partners: PARTNER_LEDGER.map((p) => ({
        person: PEOPLE[p.key]!,
        sharePct: p.sharePct,
        paidPaise: p.paid,
        receivedPaise: p.received,
        balancePaise: db.settledOn ? 0 : (s.balances.find((b) => b.key === p.key)?.balance ?? 0),
      })),
      ...(db.settledOn ? { settledOn: db.settledOn } : {}),
      history: [
        ...(db.settledOn
          ? [
              {
                period: monthToDate(MOCK_TODAY),
                meta: `Settled today by ${PEOPLE[me()]!.shortName} · ${s.transfers.length} payments`,
                amountPaise: owed,
              },
            ]
          : []),
        {
          period: 'September 2026',
          meta: 'Settled 2 Oct by Rushikesh Y. · 3 payments',
          amountPaise: 3124000,
        },
        {
          period: 'August 2026',
          meta: 'Settled 3 Sep by Sameer U. · 2 payments',
          amountPaise: 1896000,
        },
      ],
    });
  },
  async markSettled(): Promise<{ payments: number }> {
    db.settledOn = MOCK_TODAY;
    return latency({ payments: settlementNow().transfers.length }, 200);
  },
  async undoSettlement(): Promise<void> {
    db.settledOn = undefined;
    return latency(undefined);
  },

  // ── Budgets (L6) ─────────────────────────────────────────
  async getBudgets(): Promise<Budgets> {
    return latency({ month: monthYear(MOCK_TODAY), categories: CATEGORY_SPEND, funds: FUNDS });
  },

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
