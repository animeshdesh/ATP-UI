import { createContext, use, useMemo, useState, type ReactNode } from 'react';
import type { Appointment, Inquiry } from '@/domain/types';
import { ConvertSheet } from '@/features/inquiries/ConvertSheet';
import { AppointmentSheet, type NewPrefill } from './AppointmentSheet';
import { DetailSheet, type DetailMode } from './DetailSheet';

type Open =
  | { kind: 'new'; prefill: NewPrefill }
  | { kind: 'edit'; appointment: Appointment }
  | { kind: 'detail'; appointment: Appointment; mode: DetailMode }
  | { kind: 'convert'; inquiry: Inquiry };

interface Booking {
  openNew: (prefill?: NewPrefill) => void;
  openEdit: (a: Appointment) => void;
  openDetail: (a: Appointment, mode?: DetailMode) => void;
  openConvert: (i: Inquiry) => void;
}

const BookingContext = createContext<Booking | null>(null);

/** The appointment sheets, reachable from every screen (calendar, requests, profile, add button). */
export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  // A new key per opening resets each sheet's local state.
  const [n, setN] = useState(0);
  const show = (o: Open) => {
    setN((x) => x + 1);
    setOpen(o);
  };
  const close = () => setOpen(null);
  const value = useMemo<Booking>(
    () => ({
      openNew: (prefill = {}) => show({ kind: 'new', prefill }),
      openEdit: (appointment) => show({ kind: 'edit', appointment }),
      openDetail: (appointment, mode = 'view') => show({ kind: 'detail', appointment, mode }),
      openConvert: (inquiry) => show({ kind: 'convert', inquiry }),
    }),
    [],
  );
  return (
    <BookingContext value={value}>
      {children}
      {(open?.kind === 'new' || open?.kind === 'edit') && (
        <AppointmentSheet
          key={n}
          prefill={open.kind === 'new' ? open.prefill : {}}
          editing={open.kind === 'edit' ? open.appointment : null}
          onClose={close}
        />
      )}
      {open?.kind === 'detail' && (
        <DetailSheet
          key={n}
          appointment={open.appointment}
          initialMode={open.mode}
          onClose={close}
          onReschedule={(a) => show({ kind: 'edit', appointment: a })}
        />
      )}
      {open?.kind === 'convert' && <ConvertSheet key={n} inquiry={open.inquiry} onClose={close} />}
    </BookingContext>
  );
}

export function useBooking() {
  const v = use(BookingContext);
  if (!v) throw new Error('useBooking outside BookingProvider');
  return v;
}
