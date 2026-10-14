import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

/** Escape closes, focus moves into the panel and returns to the opener on close. */
function useModal(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  // Read the latest onClose without re-running the effect: callers often pass an inline
  // function, and re-running would steal focus back to the first field on every render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('[data-autofocus], input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [open]);
  return panel;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/** Bottom sheet below the status area on mobile; 460px right panel on desktop. */
export function Sheet({ open, onClose, title, subtitle, footer, children }: SheetProps) {
  const panel = useModal(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-fade-in bg-scrim" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-x-0 top-16 bottom-0 flex animate-sheet-up flex-col border-t-2 border-ink bg-canvas shadow-lg',
          'lg:top-0 lg:left-auto lg:w-[460px] lg:animate-sheet-left lg:border-t-0 lg:border-l-2',
        )}
      >
        <div className="flex flex-none items-center gap-2.5 border-b-2 border-ink px-[18px] py-3.5">
          <div className="flex-1">
            <div className="text-xl font-extrabold">{title}</div>
            {subtitle && <div className="text-xs text-neutral-700">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" bordered onClick={onClose} />
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-4">{children}</div>
        {footer && (
          <div className="flex flex-none flex-col gap-1.5 border-t-2 border-ink bg-white px-[18px] pt-3 pb-[max(22px,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  actions: ReactNode;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, actions, children }: DialogProps) {
  const panel = useModal(open, onClose);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-40 grid animate-fade-in place-items-center bg-scrim p-[18px]"
      onClick={onClose}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col border-2 border-ink bg-canvas shadow-lg"
      >
        <div className="flex items-center border-b-2 border-ink px-[18px] py-3.5">
          <div className="flex-1 text-xl font-extrabold">{title}</div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        <div className="flex flex-col gap-3.5 px-[18px] py-4">{children}</div>
        <div className="flex justify-end gap-2 px-[18px] pt-3 pb-4">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
