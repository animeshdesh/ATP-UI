/*
 * Patients app types: aliases of the API contract (backend L9–L12, docs/V2.md), so the real API
 * and the in-memory mock (tests) share one shape. Times are ISO instants; money is integer paise.
 */
import type { components } from '@atp/core';

type S = components['schemas'];

export type { PaymentMode } from '@atp/core';

export type VisitType = S['VisitType'];
export type Branch = S['Branch'];
export type NewBranch = S['NewBranch'];
export type UpdateBranch = S['UpdateBranch'];

/** A clinic member who can be booked (or, when `takesAppointments` is false, given hours). */
export type Therapist = S['Therapist'];

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WorkingHours = S['WorkingHours'];
export type TimeOff = S['TimeOff'];
export type NewTimeOff = S['NewTimeOff'];

export type AppointmentStatus = S['AppointmentStatus'];
export type StatusReason = S['StatusReason'];
export type Appointment = S['Appointment'];
export type AppointmentSource = Appointment['source'];
export type NewAppointment = S['NewAppointment'];
export type AppointmentPatch = S['UpdateAppointment'];
export type StatusChange = S['AppointmentStatusChange'];
export type CalendarData = S['CalendarData'];

export type Gender = S['Gender'];
export type ReferralSource = S['ReferralSource'];
export type Patient = S['Patient'];
export type PatientSummary = S['PatientSummary'];
export type PatientProfile = S['PatientProfile'];
export type NewPatient = S['NewPatient'];
export type UpdatePatient = S['UpdatePatient'];

export type NoteKind = S['NoteKind'];
export type PatientNote = S['PatientNote'];
export type NewPatientNote = S['NewPatientNote'];

export type Package = S['PatientPackage'];
export type NewPackage = S['NewPackage'];
/** Income recorded against a patient: a money entry with `patientId` and branch. */
export type Payment = S['PatientPayment'];
export type NewPayment = S['NewPatientPayment'];
/** Picks the income category in ATP Money (Clinic session, Home visit, Package, Other). */
export type PaymentKind = NewPayment['kind'];

export type InquiryStatus = S['InquiryStatus'];
export type PreferredSlot = S['PreferredSlot'];
export type CloseReason = S['CloseReason'];
export type Inquiry = S['Inquiry'];
export type InquiryCounts = S['InquiryCounts'];
export type InquiryRequest = S['InquiryRequest'];
export type UpdateInquiry = S['UpdateInquiry'];
export type PublicClinic = S['PublicClinic'];
export type ConvertInquiry = S['ConvertInquiry'];
export type ConvertResult = S['ConvertResult'];

export const PAYMENT_MODES_V2 = ['cash', 'upi', 'card'] as const;
