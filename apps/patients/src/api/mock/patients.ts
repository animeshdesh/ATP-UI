/*
 * In-memory V2a API (L9–L12 of atp-backend docs/V2.md) with the same shapes and error codes the
 * backend will return, for tests and `VITE_AUTH=mock` (D-012). Scopes follow the signed-in mock
 * role: `own` means appointments where I am the therapist, and patients I have an appointment with.
 */
import { ApiError, addDays, todayIso, type PermissionKey } from '@atp/core';
import { PEOPLE, memberIdOf, mockScope, mockUserKey, mockMembers } from '@atp/core/mock';
import type {
  Appointment,
  AppointmentPatch,
  Branch,
  CalendarData,
  ConvertInquiry,
  Inquiry,
  InquiryCounts,
  InquiryRequest,
  InquiryStatus,
  NewAppointment,
  NewBranch,
  NewPackage,
  NewPatient,
  NewPayment,
  Package,
  Patient,
  PatientNote,
  PatientProfile,
  PatientSummary,
  Payment,
  PublicClinic,
  StatusChange,
  Therapist,
  TimeOff,
  WorkingHours,
} from '@/domain/types';
import { samePhone } from '@/lib/contact';
import { at, dateOf, minutesOf, toMinutes, weekdayOf } from '@/lib/time';
import {
  THERAPIST_IDS,
  seedAppointments,
  seedBranches,
  seedHours,
  seedInquiries,
  seedNotes,
  seedPackages,
  seedPatients,
  seedPayments,
  seedTimeOff,
} from './seed';

export const PUBLIC_SLUG = 'atp-rehab';

function fresh() {
  const patients = seedPatients();
  return {
    branches: seedBranches(),
    hours: seedHours(),
    timeOff: seedTimeOff(),
    patients,
    appointments: seedAppointments(patients),
    inquiries: seedInquiries(),
    notes: seedNotes(),
    packages: seedPackages(),
    payments: seedPayments(),
    publicSubmits: 0,
    seq: 1000,
  };
}

let db = fresh();

export function resetMockPatients() {
  db = fresh();
}

const latency = <T>(value: T, ms = 80): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
const fail = (status: number, message: string, code: string) =>
  Promise.reject(new ApiError(status, message, code));
const nextId = (prefix: string) => `${prefix}-${++db.seq}`;

const me = () => memberIdOf(mockUserKey());

function need(key: PermissionKey, min: 'own' | 'all' = 'own') {
  const s = mockScope(key);
  if (s === 'none' || (min === 'all' && s !== 'all'))
    throw new ApiError(403, "You don't have access to this.", 'forbidden');
  return s;
}

const isMine = (a: Appointment) => a.therapistId === me();

/** Patients a scope-`own` member may see: those with an appointment where they are the therapist. */
const visiblePatient = (scope: string, patientId: string) =>
  scope === 'all' || db.appointments.some((a) => a.patientId === patientId && isMine(a));

const overlaps = (
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string },
) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

function insideHours(therapistId: string, branchId: string, startsAt: string, endsAt: string) {
  const date = dateOf(startsAt);
  const s = minutesOf(startsAt);
  const e = minutesOf(endsAt);
  return (db.hours[therapistId] ?? []).some(
    (h) =>
      h.weekday === weekdayOf(date) &&
      h.branchId === branchId &&
      toMinutes(h.start) <= s &&
      e <= toMinutes(h.end),
  );
}

/** The DB exclusion constraint (A-02): one confirmed appointment per therapist at a time. */
function clash(
  therapistId: string,
  range: { startsAt: string; endsAt: string },
  ignoreId?: string,
) {
  return db.appointments.some(
    (a) =>
      a.therapistId === therapistId &&
      a.status === 'confirmed' &&
      a.id !== ignoreId &&
      overlaps(a, range),
  );
}

function onLeave(therapistId: string, range: { startsAt: string; endsAt: string }) {
  return db.timeOff.some(
    (o) => o.memberId === therapistId && overlaps({ startsAt: o.from, endsAt: o.to }, range),
  );
}

function summary(p: Patient): PatientSummary {
  const appts = db.appointments
    .filter((a) => a.patientId === p.id)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const now = new Date().toISOString();
  const done = appts.filter((a) => a.status === 'completed');
  const next = appts.find((a) => a.status === 'confirmed' && a.endsAt >= now) ?? null;
  const latest = [...appts].reverse().find((a) => a.status !== 'cancelled');
  const pkg =
    db.packages.find((k) => k.patientId === p.id && k.sessionsUsed < k.sessionsTotal) ?? null;
  return {
    ...p,
    therapistId: latest?.therapistId ?? null,
    visits: done.length,
    noShows: appts.filter((a) => a.status === 'no_show').length,
    lastVisit: done.at(-1)?.startsAt ?? null,
    nextAppointment: next,
    activePackage: pkg,
  };
}

function recordIncome(patientId: string, v: NewPayment): Payment {
  const pay: Payment = {
    id: nextId('pay'),
    patientId,
    amountPaise: v.amountPaise,
    mode: v.mode,
    occurredOn: todayIso(),
    description: v.description,
    branchId: v.branchId,
  };
  db.payments.push(pay);
  return pay;
}

function makeAppointment(v: NewAppointment, extra: Partial<Appointment> = {}): Appointment {
  const p = db.patients.find((x) => x.id === v.patientId);
  if (!p) throw new ApiError(404, 'Patient not found.', 'not_found');
  if (!(v.endsAt > v.startsAt)) throw new ApiError(400, 'End must be after start.', 'bad_request');
  if (clash(v.therapistId, v)) throw new ApiError(409, 'That slot was just taken.', 'slot_taken');
  if (
    !v.force &&
    (!insideHours(v.therapistId, v.branchId, v.startsAt, v.endsAt) || onLeave(v.therapistId, v))
  )
    throw new ApiError(409, 'Outside working hours.', 'outside_hours');
  return {
    id: nextId('ap'),
    patientId: p.id,
    patientName: p.fullName,
    patientPhone: p.phone,
    therapistId: v.therapistId,
    branchId: v.branchId,
    visitType: v.visitType,
    homeAddress: v.visitType === 'home' ? (v.homeAddress ?? p.address) : null,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    status: 'confirmed',
    statusReason: null,
    statusNote: null,
    source: v.source,
    notes: v.notes ?? null,
    inquiryId: null,
    packageId: null,
    ...extra,
  };
}

function freeSlots(
  therapistId: string,
  branchId: string,
  date: string,
  duration: number,
): string[] {
  const today = todayIso();
  if (date < today) return [];
  const earliest = date === today ? Math.ceil(minutesOf(new Date().toISOString()) / 15) * 15 : 0;
  const busy = [
    ...db.appointments.filter((a) => a.therapistId === therapistId && a.status === 'confirmed'),
    ...db.timeOff
      .filter((o) => o.memberId === therapistId)
      .map((o) => ({ startsAt: o.from, endsAt: o.to })),
  ];
  const out: string[] = [];
  for (const h of db.hours[therapistId] ?? []) {
    if (h.weekday !== weekdayOf(date) || h.branchId !== branchId) continue;
    let t = Math.max(toMinutes(h.start), earliest);
    while (t + duration <= toMinutes(h.end)) {
      const range = { startsAt: at(date, t), endsAt: at(date, t + duration) };
      if (busy.some((b) => overlaps(b, range))) t += 15;
      else {
        out.push(range.startsAt);
        t += duration;
      }
    }
  }
  return out.sort();
}

export const mockPatients = {
  // --- public (no session) -------------------------------------------------------------------
  async getPublicClinic(slug: string): Promise<PublicClinic> {
    if (slug !== PUBLIC_SLUG) return fail(404, 'Clinic not found.', 'not_found');
    return latency({
      name: 'ATP Rehab',
      branches: db.branches
        .filter((b) => b.isPublic && !b.archivedAt)
        .map(({ id, name, code, address, phone }) => ({ id, name, code, address, phone })),
    });
  },

  async submitInquiry(slug: string, v: InquiryRequest): Promise<{ ok: true }> {
    if (slug !== PUBLIC_SLUG) return fail(404, 'Clinic not found.', 'not_found');
    // Honeypot: bots fill every field. Answer as if it worked.
    if (v.website) return latency({ ok: true });
    if (++db.publicSubmits > 5) return fail(429, 'Too many requests.', 'rate_limited');
    const branch = db.branches.find((b) => b.id === v.branchId && b.isPublic && !b.archivedAt);
    if (!branch) return fail(400, 'Pick a branch.', 'bad_request');
    db.inquiries.unshift({
      id: nextId('inq'),
      fullName: v.fullName.trim(),
      phone: v.phone,
      email: v.email || null,
      preferredDate: v.preferredDate,
      preferredSlot: v.preferredSlot,
      reason: v.reason || null,
      branchId: branch.id,
      status: 'new',
      closeReason: null,
      patientId: null,
      appointmentId: null,
      createdAt: new Date().toISOString(),
    });
    return latency({ ok: true }, 200);
  },

  // --- branches, therapists, availability -----------------------------------------------------
  async listBranches(): Promise<Branch[]> {
    return latency(db.branches);
  },

  async createBranch(v: NewBranch): Promise<Branch> {
    need('settings.branches.manage');
    if (db.branches.some((b) => b.code === v.code))
      return fail(409, 'Another branch uses this code.', 'code_in_use');
    const b: Branch = { ...v, id: nextId('br'), archivedAt: null };
    db.branches.push(b);
    return latency(b);
  },

  async updateBranch(id: string, v: Partial<NewBranch> & { archived?: boolean }): Promise<Branch> {
    need('settings.branches.manage');
    const b = db.branches.find((x) => x.id === id);
    if (!b) return fail(404, 'Branch not found.', 'not_found');
    if (v.code && db.branches.some((x) => x.code === v.code && x.id !== id))
      return fail(409, 'Another branch uses this code.', 'code_in_use');
    const { archived, ...rest } = v;
    Object.assign(b, rest);
    if (archived !== undefined) b.archivedAt = archived ? new Date().toISOString() : null;
    return latency(b);
  },

  async listTherapists(): Promise<Therapist[]> {
    const members = mockMembers().filter(
      (m) => THERAPIST_IDS.includes(m.id) && m.status === 'active',
    );
    return latency(
      members.map((m) => {
        const p = PEOPLE[m.userId]!;
        return {
          memberId: m.id,
          fullName: p.fullName,
          shortName: shortOf(p.fullName),
          initials: p.initials,
        };
      }),
    );
  },

  async getWorkingHours(memberId: string): Promise<WorkingHours[]> {
    const s = need('appointments.manage');
    if (s === 'own' && memberId !== me())
      return fail(403, "You don't have access to this.", 'forbidden');
    return latency(db.hours[memberId] ?? []);
  },

  async setWorkingHours(memberId: string, rows: WorkingHours[]): Promise<WorkingHours[]> {
    const s = need('appointments.manage');
    if (s === 'own' && memberId !== me())
      return fail(403, "You don't have access to this.", 'forbidden');
    if (rows.some((r) => toMinutes(r.start) >= toMinutes(r.end)))
      return fail(400, 'Each row must end after it starts.', 'bad_request');
    db.hours[memberId] = rows;
    return latency(rows);
  },

  async listTimeOff(): Promise<TimeOff[]> {
    const s = need('appointments.manage');
    return latency(
      db.timeOff
        .filter((o) => s === 'all' || o.memberId === me())
        .sort((a, b) => a.from.localeCompare(b.from)),
    );
  },

  async createTimeOff(v: Omit<TimeOff, 'id'>): Promise<TimeOff> {
    const s = need('appointments.manage');
    if (s === 'own' && v.memberId !== me())
      return fail(403, "You don't have access to this.", 'forbidden');
    if (!(v.to > v.from)) return fail(400, 'End must be after start.', 'bad_request');
    const o = { ...v, id: nextId('off') };
    db.timeOff.push(o);
    return latency(o);
  },

  async deleteTimeOff(id: string): Promise<void> {
    need('appointments.manage');
    db.timeOff = db.timeOff.filter((o) => o.id !== id);
    return latency(undefined);
  },

  async getFreeSlots(q: {
    therapistId: string;
    branchId: string;
    date: string;
    duration: number;
  }): Promise<string[]> {
    need('appointments.manage');
    return latency(freeSlots(q.therapistId, q.branchId, q.date, q.duration), 40);
  },

  // --- calendar ---------------------------------------------------------------------------------
  async getCalendar(q: { from: string; to: string }): Promise<CalendarData> {
    const s = need('appointments.manage');
    const from = at(q.from, 0);
    const to = at(addDays(q.to, 1), 0);
    return latency({
      appointments: db.appointments.filter(
        (a) => a.startsAt >= from && a.startsAt < to && (s === 'all' || isMine(a)),
      ),
      timeOff: db.timeOff.filter(
        (o) => o.from < to && o.to > from && (s === 'all' || o.memberId === me()),
      ),
    });
  },

  async createAppointment(v: NewAppointment): Promise<Appointment> {
    const s = need('appointments.manage');
    if (s === 'own' && v.therapistId !== me())
      return fail(403, "You don't have access to this.", 'forbidden');
    try {
      const a = makeAppointment(v);
      db.appointments.push(a);
      return latency(a);
    } catch (e) {
      return Promise.reject(e);
    }
  },

  async updateAppointment(id: string, v: AppointmentPatch): Promise<Appointment> {
    const s = need('appointments.manage');
    const a = db.appointments.find((x) => x.id === id);
    if (!a || (s === 'own' && !isMine(a))) return fail(404, 'Appointment not found.', 'not_found');
    const next = { ...a, ...v, homeAddress: v.homeAddress ?? a.homeAddress };
    if (clash(next.therapistId, next, id))
      return fail(409, 'That slot was just taken.', 'slot_taken');
    if (
      !v.force &&
      (!insideHours(next.therapistId, next.branchId, next.startsAt, next.endsAt) ||
        onLeave(next.therapistId, next))
    )
      return fail(409, 'Outside working hours.', 'outside_hours');
    const { force: _force, ...patch } = v;
    Object.assign(a, patch);
    return latency(a);
  },

  async setAppointmentStatus(id: string, v: StatusChange): Promise<Appointment> {
    const s = need('appointments.manage');
    const a = db.appointments.find((x) => x.id === id);
    if (!a || (s === 'own' && !isMine(a))) return fail(404, 'Appointment not found.', 'not_found');
    if (v.status === 'confirmed') {
      if (clash(a.therapistId, a, id)) return fail(409, 'That slot was just taken.', 'slot_taken');
      if (a.packageId) {
        const k = db.packages.find((x) => x.id === a.packageId);
        if (k) k.sessionsUsed -= 1;
      }
      Object.assign(a, {
        status: 'confirmed',
        statusReason: null,
        statusNote: null,
        packageId: null,
      });
      return latency(a);
    }
    if (a.status !== 'confirmed')
      return fail(409, 'This appointment is already closed.', 'conflict');
    if (v.status === 'completed') {
      if (v.packageId) {
        const k = db.packages.find((x) => x.id === v.packageId && x.patientId === a.patientId);
        if (!k) return fail(404, 'Package not found.', 'not_found');
        if (k.sessionsUsed >= k.sessionsTotal)
          return fail(409, 'No sessions left in this package.', 'package_exhausted');
        k.sessionsUsed += 1;
        a.packageId = k.id;
      }
      if (v.payment) recordIncome(a.patientId, { ...v.payment, appointmentId: a.id });
      a.status = 'completed';
    } else {
      Object.assign(a, { status: v.status, statusReason: v.reason, statusNote: v.note ?? null });
    }
    return latency(a);
  },

  // --- inquiries --------------------------------------------------------------------------------
  async listInquiries(status?: InquiryStatus): Promise<Inquiry[]> {
    need('patients.manage', 'all');
    return latency(
      db.inquiries
        .filter((i) => !status || i.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async inquiryCounts(): Promise<InquiryCounts> {
    need('patients.manage', 'all');
    const c: InquiryCounts = { new: 0, contacted: 0, booked: 0, closed: 0 };
    for (const i of db.inquiries) c[i.status] += 1;
    return latency(c, 40);
  },

  async updateInquiry(
    id: string,
    v: { status: 'new' | 'contacted' | 'closed'; closeReason?: Inquiry['closeReason'] },
  ): Promise<Inquiry> {
    need('patients.manage', 'all');
    const i = db.inquiries.find((x) => x.id === id);
    if (!i) return fail(404, 'Request not found.', 'not_found');
    if (i.status === 'booked')
      return fail(409, 'This request is already booked.', 'inquiry_closed');
    if (v.status === 'closed' && !v.closeReason) return fail(400, 'Pick a reason.', 'bad_request');
    Object.assign(i, {
      status: v.status,
      closeReason: v.status === 'closed' ? v.closeReason : null,
    });
    return latency(i);
  },

  async convertInquiry(
    id: string,
    v: ConvertInquiry,
  ): Promise<{ patient: Patient; appointment: Appointment | null }> {
    need('patients.manage', 'all');
    const i = db.inquiries.find((x) => x.id === id);
    if (!i) return fail(404, 'Request not found.', 'not_found');
    if (i.status === 'booked' || i.status === 'closed')
      return fail(409, 'This request is already closed.', 'inquiry_closed');
    let patient =
      (v.patientId && db.patients.find((p) => p.id === v.patientId)) ||
      db.patients.find((p) => samePhone(p.phone, i.phone));
    const created = !patient;
    if (!patient) {
      patient = {
        id: nextId('pt'),
        fullName: i.fullName,
        phone: i.phone,
        email: i.email,
        dateOfBirth: null,
        age: null,
        gender: 'unspecified',
        address: null,
        referralSource: 'other',
        referralNote: 'Web request',
        chiefComplaint: i.reason,
        branchId: i.branchId,
        createdAt: new Date().toISOString(),
      };
    }
    let appointment: Appointment | null = null;
    try {
      if (created) db.patients.push(patient);
      if (v.appointment) {
        need('appointments.manage');
        appointment = makeAppointment(
          { ...v.appointment, patientId: patient.id, source: 'web' },
          { inquiryId: i.id },
        );
        db.appointments.push(appointment);
      }
    } catch (e) {
      // One transaction: undo the new patient.
      if (created) db.patients = db.patients.filter((p) => p.id !== patient.id);
      return Promise.reject(e);
    }
    Object.assign(i, {
      status: appointment ? 'booked' : 'contacted',
      patientId: patient.id,
      appointmentId: appointment?.id ?? null,
    });
    return latency({ patient, appointment });
  },

  // --- patients ---------------------------------------------------------------------------------
  async listPatients(q = ''): Promise<PatientSummary[]> {
    const s = need('patients.view');
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, '');
    return latency(
      db.patients
        .filter((p) => visiblePatient(s, p.id))
        .filter(
          (p) =>
            !needle ||
            p.fullName.toLowerCase().includes(needle) ||
            (digits.length >= 3 && p.phone.includes(digits)),
        )
        .map(summary)
        .sort((a, b) => (b.lastVisit ?? b.createdAt).localeCompare(a.lastVisit ?? a.createdAt)),
    );
  },

  async createPatient(v: NewPatient): Promise<Patient> {
    need('patients.manage');
    if (db.patients.some((p) => samePhone(p.phone, v.phone)))
      return fail(409, 'Another patient already has this phone.', 'phone_in_use');
    const p: Patient = { ...v, id: nextId('pt'), createdAt: new Date().toISOString() };
    db.patients.push(p);
    return latency(p);
  },

  async updatePatient(id: string, v: Partial<NewPatient>): Promise<Patient> {
    const s = need('patients.manage');
    const p = db.patients.find((x) => x.id === id);
    if (!p || !visiblePatient(s, id)) return fail(404, 'Patient not found.', 'not_found');
    if (v.phone && db.patients.some((x) => x.id !== id && samePhone(x.phone, v.phone!)))
      return fail(409, 'Another patient already has this phone.', 'phone_in_use');
    Object.assign(p, v);
    return latency(p);
  },

  async getPatient(id: string): Promise<PatientProfile> {
    const s = need('patients.view');
    const p = db.patients.find((x) => x.id === id);
    if (!p || !visiblePatient(s, id)) return fail(404, 'Patient not found.', 'not_found');
    return latency({
      patient: summary(p),
      appointments: db.appointments
        .filter((a) => a.patientId === id)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      payments: db.payments
        .filter((x) => x.patientId === id)
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)),
      packages: db.packages.filter((k) => k.patientId === id),
    });
  },

  async listNotes(patientId: string): Promise<PatientNote[]> {
    const s = need('patients.clinical');
    if (!visiblePatient(s, patientId)) return fail(404, 'Patient not found.', 'not_found');
    return latency(
      db.notes
        .filter((n) => n.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async createNote(
    patientId: string,
    v: Pick<PatientNote, 'kind' | 'body' | 'appointmentId'>,
  ): Promise<PatientNote> {
    const s = need('patients.clinical');
    if (!visiblePatient(s, patientId)) return fail(404, 'Patient not found.', 'not_found');
    if (!v.body.trim()) return fail(400, 'Write the note first.', 'bad_request');
    const key = mockUserKey();
    const n: PatientNote = {
      ...v,
      body: v.body.trim(),
      id: nextId('note'),
      patientId,
      authorId: me() ?? key,
      authorName: PEOPLE[key]?.fullName ?? key,
      createdAt: new Date().toISOString(),
    };
    db.notes.push(n);
    return latency(n);
  },

  async sellPackage(patientId: string, v: NewPackage): Promise<Package> {
    need('patients.manage');
    need('finance.entry.create');
    const k: Package = {
      id: nextId('pk'),
      patientId,
      name: v.name,
      sessionsTotal: v.sessionsTotal,
      sessionsUsed: 0,
      pricePaise: v.pricePaise,
      soldOn: todayIso(),
    };
    db.packages.push(k);
    recordIncome(patientId, {
      amountPaise: v.pricePaise,
      mode: v.mode,
      description: `Package · ${v.name}`,
      branchId: v.branchId,
    });
    return latency(k);
  },

  async recordPayment(patientId: string, v: NewPayment): Promise<Payment> {
    need('patients.manage');
    need('finance.entry.create');
    return latency(recordIncome(patientId, v));
  },
};

const shortOf = (fullName: string) => {
  const parts = fullName.split(' ');
  return parts[0] === 'Dr.' ? `Dr. ${parts[1] ?? ''}` : (parts[0] ?? fullName);
};
