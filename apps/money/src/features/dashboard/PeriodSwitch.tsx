import { useSearchParams } from 'react-router';
import { Segmented } from '@atp/ui';

export const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;
export type Period = (typeof PERIODS)[number]['value'];

export function usePeriod(): [Period, (p: Period) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('period');
  const period: Period = raw === 'today' || raw === 'week' ? raw : 'month';
  return [period, (p) => setParams(p === 'month' ? {} : { period: p }, { replace: true })];
}

export function PeriodSwitch({ block }: { block?: boolean }) {
  const [period, setPeriod] = usePeriod();
  return (
    <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} block={block} />
  );
}
