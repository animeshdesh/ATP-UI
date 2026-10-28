import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from './cn';

export interface ToastOptions {
  /** Red icon for failures (e.g. "Slot just got taken"). */
  danger?: boolean;
  /** One inline action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string } & ToastOptions>({ message: '' });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    setToast({ message, ...options });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast({ message: '' }), options.action ? 5000 : 2600);
  }, []);
  const Icon = toast.danger ? CircleAlert : CircleCheck;
  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[110px] z-50 flex justify-center px-4 lg:bottom-7"
      >
        {toast.message && (
          <div className="pointer-events-auto flex animate-sheet-up items-center gap-2.5 bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <Icon
              aria-hidden
              size={18}
              className={cn('flex-none', toast.danger ? 'text-danger' : 'text-accent')}
            />
            {toast.message}
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action!.onClick();
                  setToast({ message: '' });
                }}
                className="ml-2 border-0 bg-transparent p-0 text-sm font-extrabold text-accent underline"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);
