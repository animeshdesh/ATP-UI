import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from './cn';

// Phones get 16px fields: iOS Safari zooms into any focused field below that. Desktop keeps the
// design's smaller sizes via `lg:` classes.
const control =
  'min-h-12 rounded-none border-2 border-ink bg-white px-3 text-base text-ink placeholder:text-neutral-500 disabled:border-divider disabled:bg-transparent';

export const Input = ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, 'w-full', className)} {...rest} />
);

/** `inline` sizes to content (filter bars); otherwise fills the field. */
export const Select = ({
  className,
  children,
  inline,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { inline?: boolean }) => (
  <select
    className={cn(control, 'px-2 font-semibold lg:text-sm', !inline && 'w-full', className)}
    {...rest}
  >
    {children}
  </select>
);

/** Label + control. `kicker` uses the small uppercase label from the entry form. */
export function Field({
  label,
  hint,
  kicker,
  children,
}: {
  label: string;
  hint?: ReactNode;
  kicker?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={kicker ? 'kicker' : 'text-[13px] font-semibold'}>
        {label}
      </label>
      {children(id)}
      {hint && <div className="text-xs text-neutral-700">{hint}</div>}
    </div>
  );
}
