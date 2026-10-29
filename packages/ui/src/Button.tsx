import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'outline' | 'link' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  /** Icon placed at the far right; the label is pushed left (primary CTAs in the design). */
  trailingIcon?: LucideIcon;
  block?: boolean;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'border-2 border-ink bg-accent text-ink font-extrabold hover:bg-accent-400 disabled:bg-neutral-200 disabled:hover:bg-neutral-200',
  outline: 'border-2 border-ink bg-transparent text-ink font-semibold hover:bg-accent-100',
  link: 'border-0 bg-transparent px-0 text-accent-700 font-semibold hover:text-accent-800',
  ghost: 'border-0 bg-transparent text-ink hover:bg-accent-100',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-[13px] gap-1.5 lg:min-h-10',
  md: 'min-h-11 px-4 text-sm gap-2',
  lg: 'min-h-13 px-4 text-base gap-2.5',
};

export function Button({
  variant = 'outline',
  size = 'md',
  icon: Icon,
  trailingIcon: Trailing,
  block,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center whitespace-nowrap select-none',
        Trailing ? 'justify-between' : 'justify-center',
        variants[variant],
        // Links look inline but get a 44px touch box on phones; the negative margin keeps layout.
        variant === 'link' ? '-my-2.5 min-h-0 py-3.5 text-[13px] lg:my-0 lg:py-1' : sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      <span className="inline-flex items-center gap-[inherit]">
        {Icon && <Icon aria-hidden size={size === 'lg' ? 19 : 17} />}
        {children}
      </span>
      {Trailing && <Trailing aria-hidden size={size === 'lg' ? 20 : 18} />}
    </button>
  );
}

/** Square 44px icon button (close, row actions). */
export function IconButton({
  icon: Icon,
  label,
  bordered,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-11 flex-none place-items-center bg-transparent text-ink hover:bg-accent-100',
        bordered ? 'border-2 border-ink' : 'border-0',
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden size={18} />
    </button>
  );
}
