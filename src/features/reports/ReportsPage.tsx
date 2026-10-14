import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Send,
  Sheet as SheetIcon,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/api';
import { useReportPreview } from '@/api/queries';
import { useAuthedSession } from '@/app/session';
import { Button, IconButton, Loading, Segmented, useToast } from '@/components/ui';
import { inr } from '@/lib/money';
import { monthYear, todayIso } from '@/lib/dates';

type ReceiptsMode = 'links' | 'embed' | 'none';
const RECEIPT_OPTIONS = [
  { value: 'links', label: 'As links' },
  { value: 'embed', label: 'Embedded' },
  { value: 'none', label: 'Leave out' },
] as const;
const RECEIPT_TEXT: Record<ReceiptsMode, string> = {
  links: 'linked',
  embed: 'embedded in appendix',
  none: 'not included',
};

/** Previous month as YYYY-MM, shifted by `offset` months. */
function monthKey(offset: number): string {
  const [y, m] = todayIso().split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 2 + offset, 1));
  return d.toISOString().slice(0, 7);
}

export function ReportsPage() {
  const session = useAuthedSession();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const month = monthKey(offset);
  const { data, isPending } = useReportPreview(month);
  const [receipts, setReceipts] = useState<ReceiptsMode>('links');
  const [autoEmail, setAutoEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = async (format: Parameters<typeof api.exportReport>[1]) => {
    setBusy(true);
    try {
      toast((await api.exportReport(month, format)).message);
    } finally {
      setBusy(false);
    }
  };

  const exports: Array<{
    label: string;
    icon: LucideIcon;
    format: Parameters<typeof api.exportReport>[1];
  }> = [
    { label: 'Excel (.xlsx)', icon: SheetIcon, format: 'xlsx' },
    { label: 'CSV', icon: FileSpreadsheet, format: 'csv' },
    { label: 'Receipts (.zip)', icon: FolderArchive, format: 'receipts' },
    { label: 'Email to CA', icon: Send, format: 'email' },
  ];

  return (
    <>
      <div className="flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          label="Previous month"
          bordered
          className="bg-white"
          onClick={() => setOffset((o) => o - 1)}
        />
        <div className="flex min-h-11 flex-1 items-center border-2 border-ink bg-white px-3.5 text-base font-extrabold">
          {monthYear(`${month}-01`)}
        </div>
        <IconButton
          icon={ChevronRight}
          label="Next month"
          bordered
          className="bg-white disabled:opacity-40"
          disabled={offset >= 0}
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
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
            disabled={busy}
            onClick={() => run('pdf')}
          >
            Generate CA report (PDF)
          </Button>
          <div className="grid grid-cols-2 gap-0.5 border-2 border-ink bg-ink">
            {exports.map(({ label, icon: Icon, format }) => (
              <button
                key={format}
                type="button"
                disabled={busy}
                onClick={() => run(format)}
                className="flex min-h-12 items-center gap-2.5 border-0 bg-white px-3.5 py-3 text-left text-sm font-semibold text-ink hover:bg-accent-100"
              >
                <Icon aria-hidden size={17} />
                {label}
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
          <div className="flex items-center gap-3 border-t-2 border-b border-t-divider border-b-rule py-3">
            <div className="flex-1">
              <div className="text-sm font-semibold">Email the CA on the 1st</div>
              <div className="text-xs text-neutral-700">
                {data?.caEmail ?? '…'} · previous month
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoEmail}
              aria-label="Email the CA on the 1st"
              onClick={() => setAutoEmail((v) => !v)}
              className={`relative h-7 w-12 flex-none border-2 border-ink p-0 ${autoEmail ? 'bg-accent' : 'bg-white'}`}
            >
              <span
                className={`absolute top-0.5 size-5 bg-ink transition-[left] ${autoEmail ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
        </div>

        {isPending || !data ? (
          <Loading label="Loading preview" />
        ) : (
          <article
            aria-label="Report preview"
            className="flex flex-col gap-3 border border-rule bg-white px-[22px] pt-[22px] pb-4 text-[11px] shadow-md"
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-2.5">
              <img src="/atp-logo.svg" alt="ATP Rehab" className="h-11" />
              <div className="text-right">
                <div className="text-sm font-extrabold">Monthly statement</div>
                <div className="text-neutral-700">{data.periodLabel}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 tabular">
              {[
                ['Income', data.incomePaise],
                ['Expense', data.expensePaise],
                ['Net', data.incomePaise - data.expensePaise],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-neutral-700">{l}</div>
                  <div className="text-[15px] font-extrabold">{inr(v as number)}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Category totals
              </div>
              {data.categories.map((c) => (
                <div
                  key={c.name}
                  className="flex justify-between border-b border-rule py-0.5 tabular"
                >
                  <span>{c.name}</span>
                  <span>{inr(c.amountPaise)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Transactions ({data.transactionCount})
              </div>
              <div className="grid grid-cols-[40px_1fr_40px_56px] gap-x-1.5 gap-y-0.5 text-neutral-700">
                <span>Date</span>
                <span>Category · description</span>
                <span>Mode</span>
                <span className="text-right">Amount</span>
              </div>
              {data.transactions.map((t, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[40px_1fr_40px_56px] gap-x-1.5 border-b border-rule py-0.5 tabular"
                >
                  <span>{t.date}</span>
                  <span className="truncate">{t.label}</span>
                  <span>{t.mode}</span>
                  <span className="text-right">{inr(t.amountPaise)}</span>
                </div>
              ))}
              <div className="pt-[3px] text-neutral-600">
                … {data.transactionCount - data.transactions.length} more rows · receipts{' '}
                {RECEIPT_TEXT[receipts]}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-extrabold tracking-[.06em] uppercase">
                Partner settlement
              </div>
              <div>{data.settlementLine}</div>
            </div>
            <div className="flex justify-between gap-2 border-t border-rule pt-1.5 text-neutral-600">
              <span>Generated by {session.user.fullName}</span>
              <span>Page 1 of {data.pages}</span>
            </div>
          </article>
        )}
      </div>
    </>
  );
}
