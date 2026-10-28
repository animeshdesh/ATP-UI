import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Share2,
  Sheet as SheetIcon,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/api';
import { useMonthlyReport } from '@/api/queries';
import { Button, IconButton, Loading, Segmented, useToast } from '@atp/ui';
import {
  PAYMENT_MODE_LABEL,
  type PaymentMode,
  type ReceiptsMode,
  type ReportFormat,
  addMonths,
  dateRange,
  dayOfMonth,
  monthShort,
  monthYear,
  todayIso,
} from '@atp/core';
import { inr } from '@/lib/money';
import { canShareFiles, download, shareOrDownload } from '@/lib/share';

const RECEIPT_OPTIONS = [
  { value: 'links', label: 'As links' },
  { value: 'appendix', label: 'Appendix' },
  { value: 'none', label: 'Leave out' },
] as const;
const RECEIPT_TEXT: Record<ReceiptsMode, string> = {
  links: 'linked (30-day links)',
  appendix: 'in an appendix',
  none: 'not included',
};
const PREVIEW_ROWS = 6;

const modeLabel = (m: string) => PAYMENT_MODE_LABEL[m as PaymentMode] ?? m;

export function ReportsPage() {
  const toast = useToast();
  const thisMonth = todayIso().slice(0, 7);
  // The CA usually wants last month; the current month is available month-to-date.
  const [month, setMonth] = useState(() => addMonths(todayIso(), -1).slice(0, 7));
  const shift = (n: number) => setMonth((m) => addMonths(`${m}-01`, n).slice(0, 7));
  const { data, isPending, isError } = useMonthlyReport(month);
  const [receipts, setReceipts] = useState<ReceiptsMode>('links');
  const [busy, setBusy] = useState<string | null>(null);
  const shareable = canShareFiles();

  const run = async (key: string, format: ReportFormat, how: 'download' | 'share') => {
    setBusy(key);
    try {
      const file = await api.downloadReport(month, format, receipts);
      if (how === 'share') {
        const r = await shareOrDownload(file, `ATP Rehab accounts · ${monthYear(`${month}-01`)}`);
        if (r === 'downloaded') toast(`Downloaded ${file.filename}`);
      } else {
        download(file);
        toast(`Downloaded ${file.filename}`);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const exports: Array<{
    key: string;
    label: string;
    icon: LucideIcon;
    format: ReportFormat;
    how: 'download' | 'share';
  }> = [
    { key: 'xlsx', label: 'Excel (.xlsx)', icon: SheetIcon, format: 'xlsx', how: 'download' },
    { key: 'csv', label: 'CSV', icon: FileSpreadsheet, format: 'csv', how: 'download' },
    { key: 'share', label: 'Share PDF', icon: Share2, format: 'pdf', how: 'share' },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          label="Previous month"
          bordered
          className="bg-white"
          onClick={() => shift(-1)}
        />
        <div className="flex min-h-11 flex-1 items-center border-2 border-ink bg-white px-3.5 text-base font-extrabold">
          {monthYear(`${month}-01`)}
          {month === thisMonth && (
            <span className="ml-2 text-xs font-semibold text-neutral-700">month to date</span>
          )}
        </div>
        <IconButton
          icon={ChevronRight}
          label="Next month"
          bordered
          className="bg-white disabled:opacity-40"
          disabled={month >= thisMonth}
          onClick={() => shift(1)}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-5 lg:gap-7">
        <div className="flex flex-col gap-3.5">
          <Button
            variant="primary"
            size="lg"
            icon={FileText}
            trailingIcon={Download}
            className="min-h-14"
            disabled={!!busy}
            onClick={() => run('pdf', 'pdf', 'download')}
          >
            {busy === 'pdf' ? 'Preparing PDF…' : 'Generate CA report (PDF)'}
          </Button>
          <div className="grid grid-cols-2 gap-0.5 border-2 border-ink bg-ink">
            {exports.map(({ key, label, icon: Icon, format, how }) => (
              <button
                key={key}
                type="button"
                disabled={!!busy}
                onClick={() => run(key, format, how)}
                className="flex min-h-12 items-center gap-2.5 border-0 bg-white px-3.5 py-3 text-left text-sm font-semibold text-ink hover:bg-accent-100 disabled:opacity-60"
              >
                <Icon aria-hidden size={17} />
                {busy === key ? 'Preparing…' : label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-1.5">
            <div className="text-[13px] font-semibold">Receipt photos in the PDF</div>
            <Segmented
              label="Receipt photos in the PDF"
              block
              options={RECEIPT_OPTIONS}
              value={receipts}
              onChange={setReceipts}
            />
          </div>
          <p className="m-0 border-t-2 border-divider pt-3 text-xs text-neutral-700">
            {shareable
              ? 'Share PDF opens your phone’s share sheet (WhatsApp, email).'
              : 'On a phone, Share PDF opens the share sheet; here it downloads the file.'}{' '}
            Emailing the CA automatically on the 1st comes later.
          </p>
        </div>

        {isPending ? (
          <Loading label="Loading preview" />
        ) : isError || !data ? (
          <p className="text-sm text-danger-fg">Could not load the report.</p>
        ) : (
          <article
            aria-label="Report preview"
            className="flex flex-col gap-3 border border-rule bg-white px-[22px] pt-[22px] pb-4 text-[11px] shadow-md"
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-2.5">
              <img src="/atp-logo.svg" alt="ATP Rehab" className="h-11" />
              <div className="text-right">
                <div className="text-sm font-extrabold">Monthly statement</div>
                <div className="text-neutral-700">
                  {dateRange(data.period.from, data.period.to)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 tabular">
              {(
                [
                  ['Income', data.totals.incomePaise],
                  ['Expense', data.totals.expensePaise],
                  ['Net', data.totals.netPaise],
                ] as const
              ).map(([l, v]) => (
                <div key={l}>
                  <div className="text-neutral-700">{l}</div>
                  <div className="text-[15px] font-extrabold">
                    {v < 0 ? '−' : ''}
                    {inr(v)}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Category totals
              </div>
              {[...data.expenseByCategory, ...data.incomeByCategory].length === 0 && (
                <div className="text-neutral-600">No entries this month.</div>
              )}
              {data.expenseByCategory.map((c) => (
                <div
                  key={`e-${c.name}`}
                  className="flex justify-between border-b border-rule py-0.5 tabular"
                >
                  <span>{c.name}</span>
                  <span>−{inr(c.amountPaise)}</span>
                </div>
              ))}
              {data.incomeByCategory.map((c) => (
                <div
                  key={`i-${c.name}`}
                  className="flex justify-between border-b border-rule py-0.5 tabular"
                >
                  <span>{c.name}</span>
                  <span>+{inr(c.amountPaise)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Transactions ({data.totals.count})
              </div>
              <div className="grid grid-cols-[40px_1fr_44px_60px] gap-x-1.5 gap-y-0.5 text-neutral-700">
                <span>Date</span>
                <span>Category · description</span>
                <span>Mode</span>
                <span className="text-right">Amount</span>
              </div>
              {data.transactions.slice(0, PREVIEW_ROWS).map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[40px_1fr_44px_60px] gap-x-1.5 border-b border-rule py-0.5 tabular"
                >
                  <span>
                    {dayOfMonth(t.entryDate)} {monthShort(t.entryDate)}
                  </span>
                  <span className="truncate">
                    {t.category}
                    {t.description
                      ? ` · ${t.description}`
                      : t.patientName
                        ? ` · ${t.patientName}`
                        : ''}
                  </span>
                  <span>{modeLabel(t.paymentMode)}</span>
                  <span className="text-right">
                    {t.type === 'expense' ? '−' : '+'}
                    {inr(t.amountPaise)}
                  </span>
                </div>
              ))}
              <div className="pt-[3px] text-neutral-600">
                {data.transactions.length > PREVIEW_ROWS &&
                  `… ${data.transactions.length - PREVIEW_ROWS} more rows · `}
                receipts {RECEIPT_TEXT[receipts]}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Partner settlement
              </div>
              {data.settlement.settled.map((s, i) => (
                <div key={i}>
                  Settled {dayOfMonth(s.settledAt.slice(0, 10))}{' '}
                  {monthShort(s.settledAt.slice(0, 10))} by {s.settledBy} · {s.transfers.length}{' '}
                  payments · {inr(s.transfers.reduce((a, t) => a + t.amountPaise, 0))}
                </div>
              ))}
              {data.settlement.openAtMonthEnd.entryCount > 0 ? (
                <div>
                  Open at month end: {data.settlement.openAtMonthEnd.transfers.length} payments ·{' '}
                  {inr(
                    data.settlement.openAtMonthEnd.transfers.reduce((a, t) => a + t.amountPaise, 0),
                  )}
                </div>
              ) : (
                data.settlement.settled.length === 0 && (
                  <div className="text-neutral-600">Nothing open.</div>
                )
              )}
            </div>
            <div className="flex justify-between gap-2 border-t border-rule pt-1.5 text-neutral-600">
              <span>{data.clinicName}</span>
              <span>Preview · full list in the PDF</span>
            </div>
          </article>
        )}
      </div>
    </>
  );
}
