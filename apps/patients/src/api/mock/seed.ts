/*
 * Seed data ported from the design prototype (apps/patients/design/patients.js), moved onto the
 * current week so the calendar always has a "today". Therapists are mock clinic members from
 * @atp/core (Owner Sameer, Therapist Anjali, Owner RP), so `own` scope follows the signed-in role.
 */
import { addDays, todayIso } from '@atp/core';
import type {
  Appointment,
  AppointmentStatus,
  Branch,
  Inquiry,
  Package,
  Patient,
  PatientNote,
  Payment,
  TimeOff,
  VisitType,
  Weekday,
  WorkingHours,
} from '@/domain/types';
import { at, mondayOf, toMinutes } from '@/lib/time';

export const SAMEER = 'member-1';
export const ANJALI = 'member-5';
export const RP = 'member-3';
export const THERAPIST_IDS = [SAMEER, ANJALI, RP];

export const seedBranches = (): Branch[] => [
  {
    id: 'br-kvn',
    name: 'Karvenagar',
    code: 'KVN',
    address: 'Lane No. 2, Bhagyoday Colony, Karvenagar, Pune',
    phone: '+919822041736',
    isPublic: true,
    archivedAt: null,
  },
  {
    id: 'br-ktd',
    name: 'Kothrud',
    code: 'KTD',
    address: 'Paud Road, near Vanaz Corner, Kothrud, Pune',
    phone: '+919822041737',
    isPublic: true,
    archivedAt: null,
  },
  {
    id: 'br-wrj',
    name: 'Warje',
    code: 'WRJ',
    address: 'Warje Malwadi Road, Warje, Pune',
    phone: '+919822041738',
    isPublic: true,
    archivedAt: null,
  },
];

const H = (start: string, end: string, branchId: string, visitType: VisitType = 'clinic') => ({
  start,
  end,
  branchId,
  visitType,
});

/** Mon–Fri the same, Saturday mornings, Sunday off. */
function week(weekday: ReturnType<typeof H>[], saturday: ReturnType<typeof H>[]): WorkingHours[] {
  const rows: WorkingHours[] = [];
  for (let d = 0; d < 5; d++) rows.push(...weekday.map((h) => ({ ...h, weekday: d as Weekday })));
  rows.push(...saturday.map((h) => ({ ...h, weekday: 5 as Weekday })));
  return rows;
}

export const seedHours = (): Record<string, WorkingHours[]> => ({
  [SAMEER]: week(
    [H('09:00', '14:00', 'br-kvn'), H('17:00', '20:00', 'br-wrj')],
    [H('09:00', '13:00', 'br-ktd')],
  ),
  [ANJALI]: week(
    [H('09:00', '13:00', 'br-kvn'), H('16:00', '20:00', 'br-ktd')],
    [H('09:00', '13:00', 'br-kvn')],
  ),
  [RP]: week(
    [H('10:00', '14:00', 'br-kvn', 'home'), H('16:00', '19:00', 'br-wrj')],
    [H('09:00', '13:00', 'br-kvn', 'home')],
  ),
});

const P = (
  id: string,
  fullName: string,
  phone: string,
  rest: Partial<Patient> & { daysAgo: number },
): Patient => ({
  id,
  fullName,
  phone,
  email: rest.email ?? null,
  dateOfBirth: null,
  age: rest.age ?? null,
  gender: rest.gender ?? 'unspecified',
  address: rest.address ?? null,
  referralSource: rest.referralSource ?? null,
  referralNote: rest.referralNote ?? null,
  chiefComplaint: rest.chiefComplaint ?? null,
  branchId: rest.branchId ?? 'br-kvn',
  plannedSessions: rest.plannedSessions ?? null,
  createdAt: `${addDays(todayIso(), -rest.daysAgo)}T10:00:00+05:30`,
});

export const seedPatients = (): Patient[] => [
  P('pt-priya', 'Priya Kulkarni', '+919822041721', {
    daysAgo: 16,
    age: 34,
    gender: 'female',
    email: 'priya.k@gmail.com',
    referralSource: 'doctor',
    referralNote: 'Dr. Apte',
    chiefComplaint: 'Right knee pain after running',
    address: 'Flat 6, Shreeyash Apartments, Karvenagar, Pune',
    plannedSessions: 12,
  }),
  P('pt-amit', 'Amit Joshi', '+919890437712', {
    daysAgo: 14,
    age: 52,
    gender: 'male',
    referralSource: 'google',
    chiefComplaint: 'Lower back pain, desk job',
    address: 'B-203, Karve Nagar Housing Society, Pune',
  }),
  P('pt-sunita', 'Sunita Pawar', '+919422158830', {
    daysAgo: 10,
    age: 67,
    gender: 'female',
    referralSource: 'doctor',
    referralNote: 'Dr. Kulkarni',
    chiefComplaint: 'Post knee replacement rehab, home visits',
    address: 'Plot 18, Hingne Home Colony, Karvenagar, Pune',
  }),
  P('pt-rohan', 'Rohan Gokhale', '+917720091463', {
    daysAgo: 7,
    age: 19,
    gender: 'male',
    email: 'rohan.g19@gmail.com',
    referralSource: 'friend',
    chiefComplaint: 'Ankle sprain, football',
    address: 'Warje, Pune',
  }),
  P('pt-meera', 'Meera Shah', '+919823011842', {
    daysAgo: 1,
    age: 41,
    gender: 'female',
    email: 'meera.shah@outlook.com',
    referralSource: 'google',
    referralNote: 'Web request',
    chiefComplaint: 'Frozen shoulder',
    address: 'Kothrud, Pune',
    branchId: 'br-ktd',
  }),
  P('pt-kavita', 'Kavita Nair', '+919850062219', {
    daysAgo: 9,
    age: 45,
    gender: 'female',
    referralSource: 'walk_in',
    chiefComplaint: 'Neck pain, cervical spondylosis',
    address: 'Erandwane, Pune',
  }),
  P('pt-deepak', 'Deepak Patwardhan', '+919049017736', {
    daysAgo: 12,
    age: 58,
    gender: 'male',
    referralSource: 'doctor',
    chiefComplaint: 'Left shoulder impingement',
    address: 'Karvenagar, Pune',
    branchId: 'br-wrj',
  }),
  P('pt-anil', 'Anil Shinde', '+918805044190', {
    daysAgo: 8,
    age: 29,
    gender: 'male',
    referralSource: 'friend',
    chiefComplaint: 'Hamstring strain, cricket',
    address: 'Warje, Pune',
    branchId: 'br-ktd',
  }),
];

type Seed = [
  id: string,
  day: number,
  start: string,
  end: string,
  patient: string,
  therapist: string,
  branch: string,
  status?: AppointmentStatus,
  visit?: VisitType,
];

/** Day 0 = Monday of this week; negative days are earlier weeks. */
const APPTS: Seed[] = [
  ['a1', 1, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['a2', 1, '10:00', '10:45', 'pt-amit', ANJALI, 'br-kvn'],
  ['a3', 1, '10:00', '11:00', 'pt-sunita', RP, 'br-kvn', 'confirmed', 'home'],
  ['a4', 1, '11:30', '12:15', 'pt-rohan', SAMEER, 'br-kvn', 'no_show'],
  ['a5', 1, '16:00', '16:45', 'pt-meera', ANJALI, 'br-ktd'],
  ['b1', 0, '09:00', '09:45', 'pt-kavita', ANJALI, 'br-kvn', 'completed'],
  ['b2', 0, '10:00', '11:00', 'pt-sunita', RP, 'br-kvn', 'completed', 'home'],
  ['b3', 0, '17:30', '18:15', 'pt-deepak', SAMEER, 'br-wrj', 'completed'],
  ['b4', 0, '18:00', '18:45', 'pt-anil', ANJALI, 'br-ktd', 'completed'],
  ['c1', 2, '09:30', '10:15', 'pt-deepak', SAMEER, 'br-kvn'],
  ['c2', 2, '18:00', '18:45', 'pt-amit', ANJALI, 'br-ktd'],
  ['c3', 2, '10:00', '11:00', 'pt-sunita', RP, 'br-kvn', 'confirmed', 'home'],
  ['d1', 3, '10:00', '10:45', 'pt-kavita', SAMEER, 'br-kvn'],
  ['d2', 3, '16:30', '17:15', 'pt-anil', RP, 'br-wrj'],
  ['e1', 4, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn'],
  ['e2', 4, '10:00', '11:00', 'pt-sunita', RP, 'br-kvn', 'confirmed', 'home'],
  ['e3', 4, '18:00', '18:45', 'pt-deepak', SAMEER, 'br-wrj'],
  ['f1', 5, '09:00', '10:00', 'pt-sunita', RP, 'br-kvn', 'confirmed', 'home'],
  ['f2', 5, '10:00', '10:45', 'pt-kavita', ANJALI, 'br-kvn'],
  ['h1', -16, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['h2', -14, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['h3', -12, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['h4', -10, '10:00', '10:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['h5', -7, '09:00', '09:45', 'pt-priya', ANJALI, 'br-kvn', 'completed'],
  ['h6', -14, '18:00', '18:45', 'pt-amit', ANJALI, 'br-ktd', 'completed'],
  ['h7', -7, '18:00', '18:45', 'pt-amit', ANJALI, 'br-ktd', 'completed'],
  ['h8', -7, '11:30', '12:15', 'pt-rohan', SAMEER, 'br-kvn', 'completed'],
  ['h9', -5, '10:00', '11:00', 'pt-sunita', RP, 'br-kvn', 'completed', 'home'],
];

export function seedAppointments(patients: Patient[]): Appointment[] {
  const monday = mondayOf(todayIso());
  return APPTS.map(([id, day, start, end, patientId, therapistId, branchId, status, visit]) => {
    const p = patients.find((x) => x.id === patientId)!;
    const date = addDays(monday, day);
    return {
      id,
      patientId,
      patientName: p.fullName,
      patientPhone: p.phone,
      therapistId,
      branchId,
      visitType: visit ?? 'clinic',
      homeAddress: visit === 'home' ? p.address : null,
      startsAt: at(date, toMinutes(start)),
      endsAt: at(date, toMinutes(end)),
      status: status ?? 'confirmed',
      statusReason: status === 'no_show' ? 'no_response' : null,
      statusNote: null,
      source: id === 'a5' ? 'web' : 'phone',
      notes: null,
      inquiryId: null,
      packageId: null,
      // Today's home visit to Sunita was done on "pay later" (D-052).
      feePaise: id === 'b2' ? 120000 : null,
    };
  });
}

export function seedTimeOff(): TimeOff[] {
  const monday = mondayOf(todayIso());
  return [
    {
      id: 'off-1',
      memberId: SAMEER,
      from: at(addDays(monday, 1), 780),
      to: at(addDays(monday, 1), 840),
      reason: 'Lunch',
    },
    {
      id: 'off-2',
      memberId: ANJALI,
      from: at(addDays(monday, 3), 480),
      to: at(addDays(monday, 3), 1200),
      reason: 'Leave',
    },
    {
      id: 'off-3',
      memberId: RP,
      from: at(addDays(monday, 7), 480),
      to: at(addDays(monday, 9), 1200),
      reason: 'Training · IAP workshop, Mumbai',
    },
  ];
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export function seedInquiries(): Inquiry[] {
  const today = todayIso();
  const I = (
    id: string,
    fullName: string,
    phone: string,
    minutesAgo: number,
    rest: Partial<Inquiry>,
  ): Inquiry => ({
    id,
    fullName,
    phone,
    email: null,
    preferredDate: null,
    preferredSlot: 'any',
    reason: null,
    branchId: 'br-kvn',
    status: 'new',
    closeReason: null,
    patientId: null,
    appointmentId: null,
    createdAt: ago(minutesAgo),
    ...rest,
  });
  return [
    I('i1', 'Meera Shah', '+919823011842', 12, {
      email: 'meera.shah@outlook.com',
      preferredDate: addDays(today, 1),
      preferredSlot: 'morning',
      reason: 'Shoulder stiff for 3 months',
      branchId: 'br-ktd',
    }),
    I('i2', 'Kunal Jadhav', '+919970023518', 66, { preferredSlot: 'evening', reason: 'Neck pain' }),
    I('i3', 'Priya K.', '+919822041721', 128, {
      preferredDate: addDays(today, 1),
      preferredSlot: 'morning',
      reason: 'Knee pain again, want 2 more sessions',
    }),
    I('i4', 'Vikram Rao', '+919764088215', 189, {
      email: 'vikram.rao@gmail.com',
      preferredDate: today,
      preferredSlot: 'afternoon',
      reason: 'Tennis elbow',
      branchId: 'br-wrj',
    }),
    I('i5', 'Asha Kale', '+919881266470', 26 * 60, {
      preferredDate: addDays(today, 4),
      preferredSlot: 'morning',
      reason: 'Father needs home visit after stroke',
      status: 'contacted',
    }),
    I('i6', 'Sanjay Pandit', '+919372050164', 32 * 60, {
      preferredDate: addDays(today, 2),
      preferredSlot: 'evening',
      reason: 'Follow-up after ACL surgery',
      status: 'contacted',
      branchId: 'br-ktd',
    }),
    I('i7', 'Neeta Bhosale', '+919860531277', 2 * 24 * 60, {
      reason: 'Heel pain in the mornings',
      status: 'booked',
    }),
    I('i8', 'Test', '+919999999999', 3 * 24 * 60, {
      reason: 'test',
      status: 'closed',
      closeReason: 'wrong_number',
    }),
  ];
}

export function seedNotes(): PatientNote[] {
  const today = todayIso();
  const N = (
    id: string,
    patientId: string,
    kind: PatientNote['kind'],
    daysAgo: number,
    authorId: string,
    body: string,
    appointmentId: string | null = null,
  ): PatientNote => ({
    id,
    patientId,
    kind,
    body,
    appointmentId,
    authorId,
    authorName: authorId === SAMEER ? 'Dr. Sameer Ushkewar' : 'Dr. Anjali Deshmukh',
    createdAt: `${addDays(today, -daysAgo)}T09:45:00+05:30`,
  });
  return [
    N(
      'n1',
      'pt-priya',
      'diagnosis',
      16,
      ANJALI,
      'Patellofemoral pain, right knee. Pain 6/10 on stairs and after 3 km. Weak hip abductors, tight ITB.',
      'h1',
    ),
    N(
      'n2',
      'pt-priya',
      'plan',
      16,
      ANJALI,
      '10 sessions over 4 weeks. Quads and glute strengthening, patellar taping, ITB release. Easy running from week 3.',
    ),
    N(
      'n3',
      'pt-priya',
      'session',
      7,
      ANJALI,
      'Pain 4/10. Added step-downs and side planks. Tolerated well.',
      'h5',
    ),
    N(
      'n4',
      'pt-priya',
      'general',
      4,
      SAMEER,
      'Asked about running shoes. Suggested a gait check at the next visit.',
    ),
    N(
      'n6',
      'pt-amit',
      'diagnosis',
      14,
      ANJALI,
      'Mechanical low back pain, L4–L5. No radiating symptoms. Sits 9–10 hours a day.',
      'h6',
    ),
  ];
}

export function seedPackages(): Package[] {
  return [
    {
      id: 'pk-priya',
      patientId: 'pt-priya',
      name: '10 sessions',
      sessionsTotal: 10,
      sessionsUsed: 6,
      pricePaise: 600000,
      soldOn: addDays(todayIso(), -16),
    },
  ];
}

export function seedPayments(): Payment[] {
  const d = (n: number) => addDays(todayIso(), -n);
  const Y = (
    id: string,
    patientId: string,
    rupees: number,
    mode: Payment['mode'],
    daysAgo: number,
    description: string,
    branchId = 'br-kvn',
  ): Payment => ({
    id,
    patientId,
    amountPaise: rupees * 100,
    mode,
    occurredOn: d(daysAgo),
    description,
    branchId,
  });
  return [
    Y('pay-1', 'pt-priya', 800, 'upi', 16, 'Assessment'),
    Y('pay-2', 'pt-priya', 6000, 'card', 16, 'Package · 10 sessions'),
    Y('pay-3', 'pt-amit', 800, 'cash', 14, 'Session', 'br-ktd'),
    Y('pay-4', 'pt-amit', 800, 'upi', 7, 'Session', 'br-ktd'),
    Y('pay-5', 'pt-sunita', 1200, 'upi', 5, 'Home visit'),
    Y('pay-6', 'pt-rohan', 800, 'cash', 7, 'Session'),
  ];
}
