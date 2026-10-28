/*
 * Provisional V2 types, mirroring atp-backend docs/V2.md (D-043 – D-047). Each becomes an alias of
 * `components['schemas'][...]` from @atp/core when its level (L9–L12) lands in the contract.
 * Times are ISO strings with the clinic offset (+05:30); money is integer paise.
 */
import type { PaymentMode } from '@atp/core';

export type { PaymentMode } from '@atp/core';

export type VisitType = 'clinic' | 'home';

export interface Branch {
  id: string;
  name: string;
  /** 2–4 uppercase letters, shown on calendar blocks. */
  code: string;
  address: string | null;
  phone: string | null;
  /** Listed on the public booking page. */
  isPublic: boolean;
  archivedAt: string | null;
}

export type NewBranch = Pick<Branch, 'name' | 'code' | 'address' | 'phone' | 'isPublic'>;

/** A clinic member who takes appointments. */
export interface Therapist {
  memberId: string;
  fullName: string;
  shortName: string;
  initials: string;
}

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WorkingHours {
  weekday: Weekday;
  /** "HH:MM" clinic time. */
  start: string;
  end: string;
  branchId: string;
  visitType: VisitType;
}

export interface TimeOff {
  id: string;
  memberId: string;
  from: string;
  to: string;
  reason: string | null;
}

export type AppointmentStatus = 'confirmed' | 'completed' | 'no_show' | 'cancelled';
export type StatusReason =
  'patient_request' | 'therapist_unavailable' | 'no_response' | 'rescheduled' | 'other';
export type AppointmentSource = 'phone' | 'walk_in' | 'web';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  therapistId: string;
  branchId: string;
  visitType: VisitType;
  homeAddress: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  statusReason: StatusReason | null;
  statusNote: string | null;
  source: AppointmentSource;
  notes: string | null;
  inquiryId: string | null;
  packageId: string | null;
}

export interface NewAppointment {
  patientId: string;
  therapistId: string;
  branchId: string;
  visitType: VisitType;
  homeAddress?: string | null;
  startsAt: string;
  endsAt: string;
  source: AppointmentSource;
  notes?: string | null;
  /** Book even outside working hours (`outside_hours` otherwise). */
  force?: boolean;
}

export type AppointmentPatch = Partial<
  Pick<
    NewAppointment,
    | 'therapistId'
    | 'branchId'
    | 'visitType'
    | 'homeAddress'
    | 'startsAt'
    | 'endsAt'
    | 'notes'
    | 'force'
  >
>;

export type StatusChange =
  | { status: 'completed'; packageId?: string | null; payment?: NewPayment | null }
  | { status: 'no_show' | 'cancelled'; reason: StatusReason; note?: string | null }
  | { status: 'confirmed' };

export type Gender = 'female' | 'male' | 'other' | 'unspecified';
export type ReferralSource = 'doctor' | 'friend' | 'google' | 'walk_in' | 'other';

export interface Patient {
  id: string;
  fullName: string;
  /** E.164. */
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  /** Age when only the age was given. */
  age: number | null;
  gender: Gender;
  address: string | null;
  referralSource: ReferralSource | null;
  referralNote: string | null;
  chiefComplaint: string | null;
  /** Home branch. */
  branchId: string | null;
  createdAt: string;
}

export interface PatientSummary extends Patient {
  /** Therapist of the latest appointment. */
  therapistId: string | null;
  visits: number;
  noShows: number;
  lastVisit: string | null;
  nextAppointment: Appointment | null;
  activePackage: Package | null;
}

export type NewPatient = Pick<
  Patient,
  | 'fullName'
  | 'phone'
  | 'email'
  | 'dateOfBirth'
  | 'age'
  | 'gender'
  | 'address'
  | 'referralSource'
  | 'referralNote'
  | 'chiefComplaint'
  | 'branchId'
>;

export type NoteKind = 'diagnosis' | 'plan' | 'session' | 'general';

export interface PatientNote {
  id: string;
  patientId: string;
  kind: NoteKind;
  body: string;
  appointmentId: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Package {
  id: string;
  patientId: string;
  name: string;
  sessionsTotal: number;
  sessionsUsed: number;
  pricePaise: number;
  soldOn: string;
}

export interface NewPackage {
  name: string;
  sessionsTotal: number;
  pricePaise: number;
  mode: PaymentMode;
  branchId: string;
}

/** Income recorded against a patient: a money `transactions` row with `patient_id`. */
export interface Payment {
  id: string;
  patientId: string;
  amountPaise: number;
  mode: PaymentMode;
  occurredOn: string;
  /** e.g. "Session · 14 Oct", "Package · 10 sessions". */
  description: string;
  branchId: string | null;
}

export interface NewPayment {
  amountPaise: number;
  mode: PaymentMode;
  description: string;
  branchId: string;
  appointmentId?: string | null;
}

export type InquiryStatus = 'new' | 'contacted' | 'booked' | 'closed';
export type PreferredSlot = 'morning' | 'afternoon' | 'evening' | 'any';
export type CloseReason = 'not_interested' | 'duplicate' | 'wrong_number' | 'other';

export interface Inquiry {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  preferredDate: string | null;
  preferredSlot: PreferredSlot;
  reason: string | null;
  branchId: string | null;
  status: InquiryStatus;
  closeReason: CloseReason | null;
  patientId: string | null;
  appointmentId: string | null;
  createdAt: string;
}

export type InquiryCounts = Record<InquiryStatus, number>;

/** Body of the public `POST /public/clinics/{slug}/inquiries`. */
export interface InquiryRequest {
  fullName: string;
  phone: string;
  email?: string | null;
  preferredDate: string | null;
  preferredSlot: PreferredSlot;
  reason?: string | null;
  branchId: string;
  /** Honeypot: must stay empty. */
  website?: string;
}

export interface PublicClinic {
  name: string;
  branches: Pick<Branch, 'id' | 'name' | 'code' | 'address' | 'phone'>[];
}

export interface ConvertInquiry {
  /** Existing patient to use; omitted → find by phone or create. */
  patientId?: string | null;
  appointment?: Omit<NewAppointment, 'patientId' | 'source'> | null;
}

export interface CalendarData {
  appointments: Appointment[];
  timeOff: TimeOff[];
}

export interface PatientProfile {
  patient: PatientSummary;
  appointments: Appointment[];
  payments: Payment[];
  packages: Package[];
}

export const PAYMENT_MODES_V2: PaymentMode[] = ['cash', 'upi', 'card'];
