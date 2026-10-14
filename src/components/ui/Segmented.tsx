import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Stretch to the container width with equal segments. */
  block?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

/** Bordered single-choice control: ink outline, accent fill on the selected segment. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  block,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'border-2 border-ink bg-white',
        block ? 'grid auto-cols-fr grid-flow-col' : 'inline-flex',
        className,
      )}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center justify-center gap-2 border-0 whitespace-nowrap text-ink',
              i > 0 && 'border-l-2 border-ink',
              active ? 'bg-accent' : 'bg-white hover:bg-accent-100',
              size === 'lg'
                ? 'min-h-12 px-3 text-[15px] font-extrabold'
                : 'min-h-11 px-3 text-[13px] font-semibold',
            )}
          >
            {Icon && <Icon aria-hidden size={17} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
