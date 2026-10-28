/*
 * In-memory L4 (settlement) and L5 (dashboard) with the contract's shapes, computed from the
 * mock ledger (ledger.ts). Mirrors backend docs/SETTLEMENT.md (D-028) and docs/DASHBOARD.md.
 */
import type {
  MonthlyReport,
  ReceiptsMode,
  ReportFile,
  ReportFormat,
  BudgetLine,
  Budgets,
  CreateFund,
  Fund,
  FundTopUp,
  SetBudgets,
  UpdateFund,
  DashboardData,
  DashboardQuery,
  Partner,
  PartnerShares,
  PartyRef,
  PaymentMode,
  PeriodTotals,
  SetPartnerShares,
  SettleTransfer,
  SettlementDetail,
  SettlementPosition,
  SettlementSummary,
} from '@atp/core';
import { addDays, addMonths, daysBetween, monthStart, ApiError } from '@atp/core';
import { MOCK_TODAY, PARTNER_KEYS, PEOPLE } from './fixtures';
import { memberIdOf, mockMembers, mockScope, mockUserKey, recordAudit } from '@atp/core/mock';
import { ledgerDb, type StoredTxn } from './ledger';
import { computeSettlement } from './settlement';

const latency = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));

function fresh() {
  return {
    partners: PARTNER_KEYS.map((k) => ({
      id: `partner-${k}`,
      key: k,
      since: '2026-04-01',
      deactivatedAt: null as string | null,
    })),
    shares: null as null | { effectiveFrom: string; bps: Record<string, number> },
    settlements: [] as Array<SettlementDetail & { entryIds: string[] }>,
    seq: 0,
  };
}
let fin = fresh();
export const resetMockFinance = () => {
  fin = fresh();
};

function requireView() {
  if (
    mockScope('finance.settlement.manage') === 'none' &&
    mockScope('finance.report.view') === 'none'
  )
    throw new ApiError(403, 'Not allowed', 'forbidden');
}
function requireBudgetManage() {
  if (mockScope('finance.budget.manage') === 'none')
    throw new ApiError(403, 'Not allowed', 'forbidden');
}
function requireManage() {
  if (mockScope('finance.settlement.manage') === 'none')
    throw new ApiError(403, 'Not allowed', 'forbidden');
}

const activePartners = () => fin.partners.filter((p) => !p.deactivatedAt);
const member = (key: string): PartyRef => ({
  kind: 'member',
  memberId: memberIdOf(key) ?? key,
  name: PEOPLE[key]?.fullName ?? key,
});

function shareBps(): {
  bps: Record<string, number>;
  source: 'set' | 'equal';
  effectiveFrom: string | null;
  stale: boolean;
} {
  const active = activePartners();
  const set = fin.shares;
  const matches =
    set && active.every((p) => p.id in set.bps) && Object.keys(set.bps).length === active.length;
  if (set && matches)
    return { bps: set.bps, source: 'set', effectiveFrom: set.effectiveFrom, stale: false };
  const base = Math.floor(10000 / active.length);
  const bps = Object.fromEntries(
    active.map((p, i) => [p.id, base + (i < 10000 - base * active.length ? 1 : 0)]),
  );
  return { bps, source: 'equal', effectiveFrom: null, stale: !!set };
}

const unsettled = (to: string) =>
  ledgerDb().transactions.filter((t) => !t.deleted && !t.settled && t.entryDate <= to);

/** Cheap stable hash of what a settlement would close; changes when any of those entries change. */
const fingerprint = (rows: StoredTxn[]) => {
  let h = 2166136261;
  for (const c of rows.map((t) => `${t.id}:${t.updatedAt}:${t.amountPaise}`).join('|'))
    h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return `fp${(h >>> 0).toString(16).padStart(8, '0')}`;
};

function position(to = MOCK_TODAY): SettlementPosition {
  const rows = unsettled(to);
  const shares = shareBps();
  const sum = (filter: (t: StoredTxn) => boolean, type: 'income' | 'expense') =>
    rows.filter((t) => filter(t) && t.type === type).reduce((a, t) => a + t.amountPaise, 0);

  const partnerRows = activePartners().map((p) => ({
    id: p.id,
    key: p.key,
    received: sum((t) => t.partyKey === p.key, 'income'),
    paid: sum((t) => t.partyKey === p.key, 'expense'),
    shareBps: shares.bps[p.id] ?? 0,
  }));
  const { net, balances, transfers } = computeSettlement(partnerRows);
  const keyOf = (id: string) => partnerRows.find((p) => p.id === id)!.key;

  const staffKeys = [
    ...new Set(
      rows.map((t) => t.partyKey).filter((k): k is string => !!k && !PARTNER_KEYS.includes(k)),
    ),
  ];
  const staff = staffKeys.map((k) => {
    const received = sum((t) => t.partyKey === k, 'income');
    const paid = sum((t) => t.partyKey === k, 'expense');
    return {
      memberId: memberIdOf(k) ?? k,
      name: PEOPLE[k]?.fullName ?? k,
      paidPaise: paid,
      receivedPaise: received,
      balancePaise: received - paid,
    };
  });
  const clinicIn = sum((t) => t.partyKey === null, 'income');
  const clinicOut = sum((t) => t.partyKey === null, 'expense');
  const last = fin.settlements[0];

  const allTransfers: SettleTransfer[] = [
    ...transfers.map((t) => ({
      from: member(keyOf(t.from)),
      to: member(keyOf(t.to)),
      amountPaise: t.amountPaise,
    })),
    ...staff
      .filter((s) => s.balancePaise !== 0)
      .map<SettleTransfer>((s) => {
        const who: PartyRef = { kind: 'member', memberId: s.memberId, name: s.name };
        return s.balancePaise > 0
          ? { from: who, to: { kind: 'clinic' }, amountPaise: s.balancePaise }
          : { from: { kind: 'clinic' }, to: who, amountPaise: -s.balancePaise };
      }),
  ];

  return {
    periodFrom: rows.length ? rows.map((t) => t.entryDate).sort()[0]! : null,
    periodTo: to,
    entryCount: rows.length,
    fingerprint: fingerprint(rows),
    lastSettlement: last
      ? { id: last.id, periodTo: last.periodTo, settledAt: last.settledAt }
      : null,
    shares: { source: shares.source, effectiveFrom: shares.effectiveFrom, stale: shares.stale },
    partnerNetPaise: net,
    clinicAccount: {
      receivedPaise: clinicIn,
      paidPaise: clinicOut,
      netPaise: clinicIn - clinicOut,
    },
    partners: partnerRows.map((p) => {
      const b = balances.find((x) => x.id === p.id)!;
      return {
        partnerId: p.id,
        memberId: memberIdOf(p.key) ?? p.key,
        name: PEOPLE[p.key]!.fullName,
        active: true,
        shareBps: p.shareBps,
        paidPaise: p.paid,
        receivedPaise: p.received,
        allocationPaise: b.allocation,
        balancePaise: b.balance,
      };
    }),
    staff,
    transfers: allTransfers,
  } as SettlementPosition;
}

function periodTotals(rows: StoredTxn[]): PeriodTotals {
  const s = (type: 'income' | 'expense', cash = false) =>
    rows
      .filter((t) => t.type === type && (!cash || t.paymentMode === 'cash'))
      .reduce((a, t) => a + t.amountPaise, 0);
  const cashIn = s('income', true);
  const cashOut = s('expense', true);
  return {
    count: rows.length,
    incomePaise: s('income'),
    expensePaise: s('expense'),
    netPaise: s('income') - s('expense'),
    cashInPaise: cashIn,
    cashOutPaise: cashOut,
    cashInHandPaise: cashIn - cashOut,
  };
}

export const mockFinance = {
  // ── L4 settlement ─────────────────────────────────────────
  async getSettlement(to?: string): Promise<SettlementPosition> {
    requireView();
    return latency(position(to));
  },
  async settle(v: { to: string; fingerprint: string }): Promise<SettlementSummary> {
    requireManage();
    const pos = position(v.to);
    if (pos.entryCount === 0) throw new ApiError(409, 'Nothing to settle.', 'nothing_to_settle');
    if (pos.fingerprint !== v.fingerprint)
      throw new ApiError(
        409,
        'Entries changed since you opened this. Review and settle again.',
        'settlement_changed',
      );
    const rows = unsettled(v.to);
    rows.forEach((t) => (t.settled = true));
    const me = mockUserKey();
    const s = {
      id: `settlement-${++fin.seq}`,
      periodFrom: pos.periodFrom,
      periodTo: pos.periodTo,
      entryCount: pos.entryCount,
      partnerNetPaise: pos.partnerNetPaise,
      transferCount: pos.transfers.length,
      transferredPaise: pos.transfers.reduce((a, t) => a + t.amountPaise, 0),
      settledAt: new Date().toISOString(),
      settledBy: { userId: me, name: PEOPLE[me]!.fullName },
      position: pos,
      entryIds: rows.map((t) => t.id),
    };
    fin.settlements = [s, ...fin.settlements];
    recordAudit({
      action: 'insert',
      tableName: 'settlements',
      rowId: s.id,
      before: null,
      after: { period_to: s.periodTo, transfer_count: s.transferCount },
    });
    const { position: _p, entryIds: _e, ...summary } = s;
    return latency(summary, 200);
  },
  async listSettlements(): Promise<SettlementSummary[]> {
    requireView();
    return latency(fin.settlements.map(({ position: _p, entryIds: _e, ...summary }) => summary));
  },
  async undoSettlement(id: string): Promise<void> {
    requireManage();
    if (fin.settlements[0]?.id !== id)
      throw new ApiError(409, 'Only the latest settlement can be undone.', 'not_latest_settlement');
    const [s, ...rest] = fin.settlements;
    for (const t of ledgerDb().transactions) if (s!.entryIds.includes(t.id)) t.settled = false;
    fin.settlements = rest;
    return latency(undefined);
  },
  async getShares(): Promise<PartnerShares> {
    requireView();
    const s = shareBps();
    return latency({
      effective: {
        source: s.source,
        effectiveFrom: s.effectiveFrom,
        stale: s.stale,
        partners: activePartners().map((p) => ({
          partnerId: p.id,
          name: PEOPLE[p.key]!.fullName,
          shareBps: s.bps[p.id] ?? 0,
        })),
      },
    });
  },
  async setShares(v: SetPartnerShares): Promise<PartnerShares> {
    requireManage();
    const active = activePartners();
    const total = v.shares.reduce((a, s) => a + s.shareBps, 0);
    if (total !== 10000) throw new ApiError(400, 'Shares must add up to 100%.', 'shares_not_100');
    if (active.some((p) => !v.shares.some((s) => s.partnerId === p.id)))
      throw new ApiError(400, 'Give every partner a share.', 'bad_request');
    fin.shares = {
      effectiveFrom: v.effectiveFrom ?? MOCK_TODAY,
      bps: Object.fromEntries(v.shares.map((s) => [s.partnerId, s.shareBps])),
    };
    return mockFinance.getShares();
  },
  async listPartners(): Promise<Partner[]> {
    requireView();
    return latency(
      fin.partners.map((p) => ({
        id: p.id,
        memberId: memberIdOf(p.key) ?? p.key,
        name: PEOPLE[p.key]!.fullName,
        status: p.deactivatedAt ? 'deactivated' : 'active',
        since: p.since,
        deactivatedAt: p.deactivatedAt,
      })),
    );
  },
  async addPartner(memberId: string): Promise<Partner> {
    requireManage();
    const m = mockMembers().find((x) => x.id === memberId);
    if (!m) throw new ApiError(404, 'Member not found', 'not_found');
    if (fin.partners.some((p) => p.key === m.userId))
      throw new ApiError(409, `${m.fullName} is already a partner`, 'conflict');
    fin.partners = [
      ...fin.partners,
      { id: `partner-${m.userId}`, key: m.userId, since: MOCK_TODAY, deactivatedAt: null },
    ];
    return (await mockFinance.listPartners()).find((p) => p.memberId === memberId)!;
  },

  // ── L5 dashboard ──────────────────────────────────────────
  async getDashboard(q: DashboardQuery = {}): Promise<DashboardData> {
    const own = mockScope('finance.report.view') === 'none';
    if (own && mockScope('finance.entry.view') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const to = q.to ?? MOCK_TODAY;
    const from = q.from ?? monthStart(to);
    const days = daysBetween(from, to);
    const prevFrom =
      q.compareFrom ?? (from.endsWith('-01') ? addMonths(from, -1) : addDays(from, -days - 1));
    const prevTo = q.compareTo ?? (from.endsWith('-01') ? addMonths(to, -1) : addDays(from, -1));
    const me = mockUserKey();
    const visible = ledgerDb().transactions.filter(
      (t) => !t.deleted && (!own || t.recordedByKey === me || t.partyKey === me),
    );
    const inRange = (a: string, b: string) =>
      visible.filter((t) => t.entryDate >= a && t.entryDate <= b);
    const cur = inRange(from, to);
    const prev = inRange(prevFrom, prevTo);
    const byCategory = (type: 'income' | 'expense') => {
      const names = new Map<string, string>();
      [...cur, ...prev]
        .filter((t) => t.type === type)
        .forEach((t) => names.set(t.categoryId, t.categoryName));
      const amt = (rows: StoredTxn[], id: string) =>
        rows
          .filter((t) => t.categoryId === id && t.type === type)
          .reduce((a, t) => a + t.amountPaise, 0);
      return [...names]
        .map(([categoryId, name]) => ({
          categoryId,
          name,
          type,
          amountPaise: amt(cur, categoryId),
          previousPaise: amt(prev, categoryId),
          budgetPaise: type === 'expense' ? (ledgerDb().budgets.get(categoryId) ?? null) : null,
        }))
        .sort((a, b) => b.amountPaise - a.amountPaise);
    };
    const modes: PaymentMode[] = ['cash', 'upi', 'card', 'bank_transfer'];
    return latency({
      period: { from, to },
      previous: { from: prevFrom, to: prevTo },
      scope: own ? 'own' : 'clinic',
      totals: periodTotals(cur),
      previousTotals: periodTotals(prev),
      expenseByCategory: byCategory('expense'),
      incomeByCategory: byCategory('income'),
      byPaymentMode: modes.map((m) => ({
        paymentMode: m,
        incomePaise: cur
          .filter((t) => t.paymentMode === m && t.type === 'income')
          .reduce((a, t) => a + t.amountPaise, 0),
        expensePaise: cur
          .filter((t) => t.paymentMode === m && t.type === 'expense')
          .reduce((a, t) => a + t.amountPaise, 0),
      })),
    } as DashboardData);
  },

  // ── L6 budgets & funds ────────────────────────────────────
  async getBudgets(month = MOCK_TODAY.slice(0, 7)): Promise<Budgets> {
    if (
      mockScope('finance.budget.manage') === 'none' &&
      mockScope('finance.report.view') === 'none'
    )
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const L = ledgerDb();
    const prev = addMonths(`${month}-01`, -1).slice(0, 7);
    const spent = (m: string, id: string) =>
      L.transactions
        .filter(
          (t) =>
            !t.deleted && t.type === 'expense' && t.categoryId === id && t.entryDate.startsWith(m),
        )
        .reduce((a, t) => a + t.amountPaise, 0);
    const categories: BudgetLine[] = L.categories
      .filter((c) => c.type === 'expense' && !c.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => {
        const budget = L.budgets.get(c.id) ?? null;
        const s = spent(month, c.id);
        const usedBps = budget ? Math.round((s * 10000) / budget) : null;
        return {
          categoryId: c.id,
          name: c.name,
          budgetPaise: budget,
          spentPaise: s,
          lastMonthPaise: spent(prev, c.id),
          usedBps,
          status:
            usedBps === null
              ? 'none'
              : usedBps >= 10000
                ? 'over'
                : usedBps >= 8000
                  ? 'warning'
                  : 'ok',
        };
      });
    return latency({
      month,
      categories,
      totals: {
        budgetPaise: categories.reduce((a, c) => a + (c.budgetPaise ?? 0), 0),
        spentPaise: categories.reduce((a, c) => a + c.spentPaise, 0),
      },
    });
  },
  async setBudgets(v: SetBudgets): Promise<Budgets> {
    requireBudgetManage();
    const L = ledgerDb();
    for (const b of v.budgets) {
      const c = L.categories.find((x) => x.id === b.categoryId);
      if (!c || c.type !== 'expense')
        throw new ApiError(400, 'Budgets are for expense categories only.', 'bad_request');
      if (b.amountPaise === null) L.budgets.delete(b.categoryId);
      else L.budgets.set(b.categoryId, b.amountPaise);
    }
    return mockFinance.getBudgets(v.month);
  },
  async listFunds(month = MOCK_TODAY.slice(0, 7), includeArchived = false): Promise<Fund[]> {
    const full =
      mockScope('finance.budget.manage') !== 'none' || mockScope('finance.report.view') !== 'none';
    if (!full && mockScope('finance.entry.create') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const L = ledgerDb();
    const inMonth = (t: StoredTxn) => !t.deleted && t.entryDate.startsWith(month);
    const income = L.transactions
      .filter((t) => inMonth(t) && t.type === 'income')
      .reduce((a, t) => a + t.amountPaise, 0);
    const expense = L.transactions
      .filter((t) => inMonth(t) && t.type === 'expense')
      .reduce((a, t) => a + t.amountPaise, 0);
    return latency(
      L.funds
        .filter((f) => includeArchived || !f.archived)
        .map<Fund>((f) => {
          const rule = f.rule;
          const allocated =
            rule.type === 'fixed'
              ? rule.amountPaise
              : rule.type === 'percent'
                ? Math.floor(
                    ((rule.base === 'net' ? Math.max(0, income - expense) : income) * rule.bps) /
                      10000,
                  )
                : 0;
          const toppedUp = L.topups
            .filter((x) => x.fundId === f.id && x.entryDate.startsWith(month))
            .reduce((a, x) => a + x.amountPaise, 0);
          const drawn = L.transactions
            .filter((t) => inMonth(t) && t.fund?.id === f.id)
            .reduce((a, t) => a + t.amountPaise, 0);
          const amounts = {
            openingBalancePaise: f.openingBalancePaise,
            allocatedPaise: allocated,
            toppedUpPaise: toppedUp,
            drawnPaise: drawn,
            allocatedToDatePaise: allocated,
            toppedUpToDatePaise: toppedUp,
            drawnToDatePaise: drawn,
            balancePaise: f.openingBalancePaise + allocated + toppedUp - drawn,
          };
          const zero = Object.fromEntries(
            Object.keys(amounts).map((k) => [k, 0]),
          ) as typeof amounts;
          return {
            id: f.id,
            name: f.name,
            startMonth: f.startMonth,
            archived: f.archived,
            rule: full ? rule : null,
            ruleEffectiveMonth: full ? f.ruleEffectiveMonth : null,
            ...(full ? amounts : zero),
          } as Fund;
        }),
    );
  },
  async createFund(v: CreateFund): Promise<Fund> {
    requireBudgetManage();
    const L = ledgerDb();
    if (L.funds.some((f) => f.name.toLowerCase() === v.name.toLowerCase()))
      throw new ApiError(409, `${v.name} already exists`, 'conflict');
    const id = `fund-${++fin.seq}`;
    L.funds = [
      ...L.funds,
      {
        id,
        name: v.name,
        rule: v.rule,
        startMonth: v.startMonth ?? MOCK_TODAY.slice(0, 7),
        ruleEffectiveMonth: v.startMonth ?? MOCK_TODAY.slice(0, 7),
        openingBalancePaise: v.openingBalancePaise ?? 0,
        archived: false,
      },
    ];
    return (await mockFinance.listFunds(undefined, true)).find((f) => f.id === id)!;
  },
  async updateFund(id: string, v: UpdateFund): Promise<Fund> {
    requireBudgetManage();
    const f = ledgerDb().funds.find((x) => x.id === id);
    if (!f) throw new ApiError(404, 'Fund not found', 'not_found');
    if (v.name) f.name = v.name;
    if (v.rule) {
      f.rule = v.rule;
      f.ruleEffectiveMonth = v.ruleEffectiveMonth ?? MOCK_TODAY.slice(0, 7);
    }
    if (v.openingBalancePaise !== undefined) f.openingBalancePaise = v.openingBalancePaise;
    if (v.archived !== undefined) f.archived = v.archived;
    return (await mockFinance.listFunds(undefined, true)).find((x) => x.id === id)!;
  },
  async topUpFund(id: string, v: FundTopUp): Promise<Fund> {
    requireBudgetManage();
    const L = ledgerDb();
    if (!L.funds.some((f) => f.id === id)) throw new ApiError(404, 'Fund not found', 'not_found');
    L.topups = [
      ...L.topups,
      { fundId: id, amountPaise: v.amountPaise, entryDate: v.entryDate ?? MOCK_TODAY },
    ];
    return (await mockFinance.listFunds(undefined, true)).find((x) => x.id === id)!;
  },

  // ── L7 reports ────────────────────────────────────────────
  async getMonthlyReport(month: string): Promise<MonthlyReport> {
    if (mockScope('finance.report.view') === 'none')
      throw new ApiError(403, 'Not allowed', 'forbidden');
    const rows = ledgerDb()
      .transactions.filter((t) => !t.deleted && t.entryDate.startsWith(month))
      .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
    const byCat = (type: 'income' | 'expense') => {
      const m = new Map<string, { name: string; count: number; amountPaise: number }>();
      for (const t of rows.filter((x) => x.type === type)) {
        const e = m.get(t.categoryName) ?? { name: t.categoryName, count: 0, amountPaise: 0 };
        e.count++;
        e.amountPaise += t.amountPaise;
        m.set(t.categoryName, e);
      }
      return [...m.values()].sort((a, b) => b.amountPaise - a.amountPaise);
    };
    const last = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
    ).getUTCDate();
    const to = `${month}-${String(last).padStart(2, '0')}`;
    const open = position(to < MOCK_TODAY ? to : MOCK_TODAY);
    const name = (p: PartyRef) => (p.kind === 'clinic' ? 'Clinic account' : p.name);
    const modes: PaymentMode[] = ['cash', 'upi', 'card', 'bank_transfer'];
    return latency({
      clinicName: 'ATP Rehab',
      month,
      period: { from: `${month}-01`, to },
      generatedAt: new Date().toISOString(),
      totals: periodTotals(rows),
      incomeByCategory: byCat('income'),
      expenseByCategory: byCat('expense'),
      byPaymentMode: modes.map((m) => ({
        paymentMode: m,
        incomePaise: rows
          .filter((t) => t.paymentMode === m && t.type === 'income')
          .reduce((a, t) => a + t.amountPaise, 0),
        expensePaise: rows
          .filter((t) => t.paymentMode === m && t.type === 'expense')
          .reduce((a, t) => a + t.amountPaise, 0),
      })),
      transactions: rows.map((t) => ({
        id: t.id,
        entryDate: t.entryDate,
        type: t.type,
        category: t.categoryName,
        description: t.description,
        patientName: t.patientName,
        paymentMode: t.paymentMode,
        amountPaise: t.amountPaise,
        party: t.party?.name ?? 'Clinic account',
        recordedBy: t.recordedBy.name,
        fund: t.fund?.name ?? null,
        hasReceipt: t.hasReceipt,
      })),
      settlement: {
        settled: fin.settlements
          .filter((x) => x.periodTo.startsWith(month))
          .map((x) => ({
            periodFrom: x.periodFrom,
            periodTo: x.periodTo,
            settledAt: x.settledAt,
            settledBy: x.settledBy.name,
            transfers: x.position.transfers.map((t) => ({
              from: name(t.from),
              to: name(t.to),
              amountPaise: t.amountPaise,
            })),
          })),
        openAtMonthEnd: {
          entryCount: open.entryCount,
          partnerNetPaise: open.partnerNetPaise,
          partners: open.partners.map((p) => ({
            name: p.name,
            shareBps: p.shareBps,
            balancePaise: p.balancePaise,
          })),
          transfers: open.transfers.map((t) => ({
            from: name(t.from),
            to: name(t.to),
            amountPaise: t.amountPaise,
          })),
        },
      },
    } as MonthlyReport);
  },
  async downloadReport(
    month: string,
    format: ReportFormat,
    receipts: ReceiptsMode = 'links',
  ): Promise<ReportFile> {
    const report = await mockFinance.getMonthlyReport(month);
    const type = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }[format];
    const lines = report.transactions.map((t) =>
      [t.entryDate, t.type, t.category, t.description, t.paymentMode, t.amountPaise / 100].join(
        ',',
      ),
    );
    const body =
      format === 'csv'
        ? ['date,type,category,description,mode,amount', ...lines].join('\n')
        : `mock ${format} ${month} receipts=${receipts}`;
    return latency(
      { blob: new Blob([body], { type }), filename: `atp-rehab-accounts-${month}.${format}` },
      300,
    );
  },
};
