import type { ReactNode } from 'react';
import { cn } from './cn';

/** Ink-bordered white box. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col border-2 border-ink bg-white', className)}>{children}</div>
  );
}

/** Section title row: 18px heading, optional right slot, 2px divider below. */
export function SectionHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-divider pb-2">
      <h4 className="text-lg">{title}</h4>
      {aside && <div className="text-xs text-neutral-700">{aside}</div>}
    </div>
  );
}

/** Grid of stat cells separated by 2px ink rules. */
export function StatGrid({ cols, children }: { cols?: 3; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid gap-0.5 border-2 border-ink bg-ink',
        cols === 3 ? 'grid-cols-3' : 'grid-cols-[repeat(auto-fit,minmax(150px,1fr))]',
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  income,
  danger,
  size = 'md',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  income?: boolean;
  danger?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 bg-white',
        size === 'md' ? 'min-h-24 px-4 py-3.5' : 'px-3 py-2.5',
      )}
    >
      <div className="kicker">{label}</div>
      <div
        className={cn(
          'font-extrabold tracking-tight tabular',
          size === 'md' ? 'text-[22px] lg:text-[28px]' : 'text-lg',
          income && 'text-accent-700',
          danger && 'text-danger-fg',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-auto text-xs text-neutral-700">{sub}</div>}
    </div>
  );
}

export type Tone = 'accent' | 'neutral' | 'danger' | 'warn' | 'solid';

const tones: Record<Tone, string> = {
  accent: 'bg-accent-100 text-accent-800',
  neutral: 'bg-neutral-200 text-neutral-800',
  danger: 'bg-danger-bg text-danger-fg',
  warn: 'bg-warn-bg text-warn-fg',
  solid: 'bg-accent text-ink',
};

export function Tag({
  tone,
  className,
  children,
}: {
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-[7px] py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Square initials avatar. */
export function Avatar({
  initials,
  filled = true,
  size = 40,
}: {
  initials: string;
  filled?: boolean;
  size?: 34 | 36 | 40;
}) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        'grid flex-none place-items-center text-[13px] font-extrabold',
        filled ? 'bg-accent' : 'border-2 border-ink bg-white',
      )}
    >
      {initials}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 text-xs text-neutral-700">{children}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-7 text-sm text-neutral-700">{children}</div>;
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-3 py-2" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse bg-white/70" />
      ))}
    </div>
  );
}
