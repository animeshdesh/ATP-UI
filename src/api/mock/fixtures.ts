/*
 * Seed data ported from the design prototype (design/clinic-os.js). Amounts in paise.
 * Mock date context: Wed 14 Oct 2026.
 */
import type { FundRule, Person, RoleKey } from '@/domain/types';

export const MOCK_TODAY = '2026-10-14';
export const oct = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
export const r = (rupees: number) => rupees * 100;

export const PEOPLE: Record<string, Person> = {
  Sameer: {
    key: 'Sameer',
    fullName: 'Dr. Sameer Ushkewar',
    shortName: 'Sameer U.',
    initials: 'SU',
  },
  RY: { key: 'RY', fullName: 'Dr. Rushikesh Yannawar', shortName: 'Rushikesh Y.', initials: 'RY' },
  RP: { key: 'RP', fullName: 'Dr. Rushikesh Patil', shortName: 'Rushikesh P.', initials: 'RP' },
  Santosh: {
    key: 'Santosh',
    fullName: 'Dr. Santosh Bhalerao',
    shortName: 'Santosh B.',
    initials: 'SB',
  },
  Anjali: {
    key: 'Anjali',
    fullName: 'Dr. Anjali Deshmukh',
    shortName: 'Anjali D.',
    initials: 'AD',
  },
  Pooja: { key: 'Pooja', fullName: 'Pooja Shinde', shortName: 'Pooja S.', initials: 'PS' },
  Clinic: {
    key: 'Clinic',
    fullName: 'Clinic account',
    shortName: 'Clinic account',
    initials: 'CA',
  },
  CA: {
    key: 'CA',
    fullName: 'Kulkarni & Associates',
    shortName: 'Kulkarni & Assoc.',
    initials: 'KA',
  },
};

export const PARTNER_KEYS = ['Sameer', 'RY', 'RP', 'Santosh'];

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: 'Owner',
  therapist: 'Therapist',
  frontdesk: 'Front desk',
  ca: 'CA (read-only)',
};

/** Signed-in user per role in the mock. */
export const USER_FOR_ROLE: Record<RoleKey, string> = {
  owner: 'Sameer',
  therapist: 'Anjali',
  frontdesk: 'Pooja',
  ca: 'CA',
};

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries',
  'Consumables',
  'Equipment',
  'Utilities',
  'Marketing',
  'Travel (home visits)',
  'Maintenance',
  'Miscellaneous',
];
export const INCOME_CATEGORIES = ['Clinic session', 'Home visit', 'Package', 'Other'];

type Seed = [
  day: number,
  type: 'in' | 'out',
  category: string,
  description: string,
  patient: string | null,
  mode: 'Cash' | 'UPI' | 'Card' | 'Bank transfer',
  rupees: number,
  party: string,
  recordedBy: string,
  receipt?: boolean,
];

/** October entries, newest first (day, type, category, description, patient, mode, ₹, party, recorded by, receipt). */
export const SEED_ENTRIES: Seed[] = [
  [
    14,
    'in',
    'Clinic session',
    'Knee rehab session',
    'Atharva Kale',
    'Cash',
    600,
    'Clinic',
    'Pooja',
  ],
  [14, 'out', 'Consumables', 'Kinesio tape, 6 rolls', null, 'UPI', 3240, 'RP', 'RP', true],
  [
    14,
    'in',
    'Home visit',
    'Neuro session, Kothrud',
    'Kishor Kumar',
    'UPI',
    1200,
    'Anjali',
    'Anjali',
  ],
  [13, 'out', 'Travel (home visits)', 'Auto fare, Kothrud', null, 'Cash', 180, 'Anjali', 'Anjali'],
  [
    13,
    'in',
    'Package',
    '10-session spine package',
    'Shruti Dhengale',
    'Card',
    6000,
    'Clinic',
    'Pooja',
  ],
  [
    12,
    'out',
    'Utilities',
    'Electricity, September',
    null,
    'Bank transfer',
    4310,
    'Santosh',
    'Santosh',
    true,
  ],
  [11, 'in', 'Clinic session', 'Shoulder mobilisation', 'Deva Kumar', 'Cash', 600, 'RY', 'RY'],
  [10, 'out', 'Equipment', 'TENS unit', null, 'UPI', 12500, 'Sameer', 'Sameer', true],
  [9, 'in', 'Home visit', 'Stroke rehab, Warje', 'M. Joshi', 'UPI', 1200, 'Anjali', 'Anjali'],
  [8, 'out', 'Maintenance', 'AC servicing', null, 'Cash', 1400, 'RY', 'Pooja'],
  [
    7,
    'in',
    'Home visit',
    'Post-op knee, Karvenagar',
    'S. Patwardhan',
    'Cash',
    1000,
    'Anjali',
    'Anjali',
  ],
  [6, 'in', 'Clinic session', 'Post-op ACL', 'Kundan Kumar', 'UPI', 800, 'Clinic', 'Pooja'],
  [5, 'out', 'Rent', 'October rent', null, 'Bank transfer', 60000, 'Clinic', 'Sameer', true],
  [3, 'out', 'Marketing', 'Google Business photos', null, 'UPI', 3200, 'RP', 'RP'],
  [2, 'out', 'Consumables', 'Electrode pads, gel', null, 'UPI', 11200, 'Santosh', 'Santosh', true],
  [1, 'out', 'Salaries', 'Watchman salary', null, 'Cash', 9000, 'Sameer', 'Sameer'],
  [1, 'out', 'Salaries', 'Staff salary', null, 'Bank transfer', 21000, 'Clinic', 'Sameer'],
];

/** Recurring items: key, name, category, day of month, ₹ expected, description of the October entry that logged it. */
export const RECURRING_SEED: Array<[string, string, string, number, number, string | null]> = [
  ['watch', 'Watchman salary', 'Salaries', 1, 9000, 'Watchman salary'],
  ['staff', 'Staff salary', 'Salaries', 1, 21000, 'Staff salary'],
  ['care', 'Caretaker salary', 'Salaries', 1, 8000, null],
  ['rent', 'Rent', 'Rent', 5, 60000, 'October rent'],
  ['elec', 'Electricity', 'Utilities', 10, 4500, null],
  ['net', 'Internet', 'Utilities', 15, 1199, null],
  ['waste', 'Biomedical waste pickup', 'Maintenance', 20, 700, null],
];

/** Monthly expense budgets in ₹ (design prototype). */
export const BUDGET_SEED: Array<[string, number]> = [
  ['Rent', 62000],
  ['Salaries', 40000],
  ['Consumables', 20000],
  ['Equipment', 25000],
  ['Utilities', 9000],
  ['Travel (home visits)', 6000],
  ['Marketing', 5000],
  ['Maintenance', 4000],
  ['Miscellaneous', 3000],
];

/** Funds (design prototype). The TENS unit expense is drawn from the equipment fund. */
export const FUND_SEED: Array<{
  id: string;
  name: string;
  rule: FundRule;
  openingRupees: number;
  topUpRupees?: number;
}> = [
  {
    id: 'fund-equipment',
    name: 'Equipment fund',
    rule: { type: 'percent', bps: 1000, base: 'net' },
    openingRupees: 136940,
  },
  {
    id: 'fund-emergency',
    name: 'Emergency reserve',
    rule: { type: 'fixed', amountPaise: r(10000) },
    openingRupees: 75000,
  },
  {
    id: 'fund-expansion',
    name: 'Clinic expansion',
    rule: { type: 'manual' },
    openingRupees: 0,
    topUpRupees: 240000,
  },
];
