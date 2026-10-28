import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 2600);
  }, []);
  return (
    <ToastContext value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[110px] z-50 flex justify-center px-4 lg:bottom-7"
      >
        {message && (
          <div className="flex animate-sheet-up items-center gap-2.5 bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <CircleCheck aria-hidden size={18} className="flex-none text-accent" />
            {message}
          </div>
        )}
      </div>
    </ToastContext>
  );
}

export const useToast = () => use(ToastContext);
