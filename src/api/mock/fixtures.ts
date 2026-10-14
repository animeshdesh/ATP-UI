/*
 * Seed data ported from the design prototype (design/clinic-os.js). Amounts in paise.
 * Mock date context: Wed 14 Oct 2026.
 */
import type {
  AuditEntry,
  CategorySpend,
  Fund,
  PaymentMode,
  Person,
  PermissionKey,
  PermissionRow,
  RecurringItem,
  RoleKey,
  Scope,
  Transaction,
} from '@/domain/types';

export const MOCK_TODAY = '2026-10-14';
const oct = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
const r = (rupees: number) => rupees * 100;

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
};

export const PARTNER_KEYS = ['Sameer', 'RY', 'RP', 'Santosh'];

export const ROLE_LABEL: Record<RoleKey, string> = {
  owner: 'Owner',
  therapist: 'Therapist',
  frontdesk: 'Front desk',
  ca: 'CA (read-only)',
};

/** Signed-in user per role in the mock. */
export const USER_FOR_ROLE: Record<Exclude<RoleKey, 'ca'>, string> = {
  owner: 'Sameer',
  therapist: 'Anjali',
  frontdesk: 'Pooja',
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
  mode: PaymentMode,
  rupees: number,
  party: string,
  recordedBy: string,
  receipt?: boolean,
];

const SEED: Seed[] = [
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

export const seedTransactions = (): Transaction[] =>
  SEED.map(([d, t, category, description, patient, mode, rupees, party, rec, receipt], i) => ({
    id: `txn_${i + 1}`,
    type: t === 'in' ? 'income' : 'expense',
    amountPaise: r(rupees),
    category,
    entryDate: oct(d),
    description,
    ...(patient ? { patientName: patient } : {}),
    paymentMode: mode,
    partyKey: party,
    recordedBy: rec,
    hasReceipt: !!receipt,
  }));

export const CATEGORY_SPEND: CategorySpend[] = [
  ['Rent', 60000, 62000, 60000],
  ['Salaries', 38000, 40000, 38000],
  ['Consumables', 21400, 20000, 14650],
  ['Equipment', 12500, 25000, 0],
  ['Utilities', 6850, 9000, 7420],
  ['Travel (home visits)', 4900, 6000, 3800],
  ['Marketing', 3200, 5000, 5000],
  ['Maintenance', 2100, 4000, 900],
  ['Miscellaneous', 1600, 3000, 2130],
].map(([name, spent, budget, last]) => ({
  name: name as string,
  spentPaise: r(spent as number),
  budgetPaise: r(budget as number),
  lastMonthPaise: r(last as number),
}));

/** Month-to-date partner ledger: what each paid out for the clinic and received from patients. */
export const PARTNER_LEDGER = [
  { key: 'Sameer', paid: r(72400), received: r(96300), sharePct: 25 },
  { key: 'RY', paid: r(18250), received: r(88600), sharePct: 25 },
  { key: 'RP', paid: r(41900), received: r(52800), sharePct: 25 },
  { key: 'Santosh', paid: r(12000), received: r(61400), sharePct: 25 },
];

export const seedRecurring = (): RecurringItem[] => [
  {
    key: 'watch',
    name: 'Watchman salary',
    category: 'Salaries',
    dayOfMonth: 1,
    amountPaise: r(9000),
    logged: true,
  },
  {
    key: 'staff',
    name: 'Staff salary',
    category: 'Salaries',
    dayOfMonth: 1,
    amountPaise: r(21000),
    logged: true,
  },
  {
    key: 'care',
    name: 'Caretaker salary',
    category: 'Salaries',
    dayOfMonth: 1,
    amountPaise: r(8000),
    logged: false,
  },
  {
    key: 'rent',
    name: 'Rent',
    category: 'Rent',
    dayOfMonth: 5,
    amountPaise: r(60000),
    logged: true,
  },
  {
    key: 'elec',
    name: 'Electricity',
    category: 'Utilities',
    dayOfMonth: 10,
    amountPaise: r(4500),
    logged: false,
  },
  {
    key: 'net',
    name: 'Internet',
    category: 'Utilities',
    dayOfMonth: 15,
    amountPaise: r(1199),
    logged: false,
  },
  {
    key: 'waste',
    name: 'Biomedical waste pickup',
    category: 'Maintenance',
    dayOfMonth: 20,
    amountPaise: r(700),
    logged: false,
  },
];

export const FUNDS: Fund[] = [
  {
    name: 'Equipment fund',
    rule: '10% of monthly net',
    balancePaise: r(142300),
    allocatedPaise: r(17860),
    drawnPaise: r(12500),
  },
  {
    name: 'Emergency reserve',
    rule: '₹10,000 fixed each month',
    balancePaise: r(85000),
    allocatedPaise: r(10000),
    drawnPaise: 0,
  },
  {
    name: 'Clinic expansion',
    rule: 'Manual top-ups',
    balancePaise: r(240000),
    allocatedPaise: 0,
    drawnPaise: 0,
  },
];

const S = (v: string): Scope => (v === 'All' ? 'all' : v === 'Own' ? 'own' : 'none');
const P = (
  key: PermissionKey,
  label: string,
  group: PermissionRow['group'],
  v: [string, string, string, string],
  later = false,
): PermissionRow => ({ key, label, group, scopes: v.map(S), ...(later ? { later } : {}) });

/** Columns: Owner, Therapist, Front desk, CA (read-only) */
export const seedPermissions = (): PermissionRow[] => [
  P('finance.entry.create', 'Log income & expenses', 'Finance', ['All', 'Own', 'Own', '—']),
  P('finance.entry.view', 'View entries', 'Finance', ['All', 'Own', 'Own', 'All']),
  P('finance.entry.edit_own', 'Edit own entries (7 days)', 'Finance', ['All', 'Own', 'Own', '—']),
  P('finance.entry.edit_any', 'Edit any entry', 'Finance', ['All', '—', '—', '—']),
  P('finance.report.view', 'Dashboard & CA report', 'Finance', ['All', '—', '—', 'All']),
  P('finance.settlement.manage', 'Partner settlement', 'Finance', ['All', '—', '—', '—']),
  P('finance.budget.manage', 'Budgets & funds', 'Finance', ['All', '—', '—', '—']),
  P('settings.categories.manage', 'Manage categories', 'Settings', ['All', '—', '—', '—']),
  P('settings.users.invite', 'Invite users', 'Settings', ['All', '—', '—', '—']),
  P('settings.roles.manage', 'Edit roles', 'Settings', ['All', '—', '—', '—']),
  P('audit.view', 'View audit log', 'Settings', ['All', '—', '—', 'All']),
  P('appointments.manage', 'Appointments (V2)', 'Later versions', ['All', 'Own', 'All', '—'], true),
  P('patients.view', 'Patient records (V2)', 'Later versions', ['All', 'Own', 'All', '—'], true),
  P('inventory.manage', 'Inventory (V3)', 'Later versions', ['All', '—', '—', '—'], true),
];

export const ROLE_COLUMNS: RoleKey[] = ['owner', 'therapist', 'frontdesk', 'ca'];

export const seedMembers = () => [
  { key: 'Sameer', contact: '+91 98220 41736 · sameer@atpxrehab.com', roles: ['Owner'] },
  { key: 'RY', contact: '+91 98901 22457', roles: ['Owner'] },
  { key: 'RP', contact: '+91 97300 81924', roles: ['Owner'] },
  { key: 'Santosh', contact: '+91 98606 77031', roles: ['Owner'] },
  { key: 'Anjali', contact: '+91 97654 22018', roles: ['Therapist'] },
  { key: 'Pooja', contact: '+91 90110 56432', roles: ['Front desk'] },
  {
    name: 'Kulkarni & Associates',
    initials: 'KA',
    contact: 'accounts@kulkarnica.in',
    roles: ['CA (read-only)'],
    invited: true,
  },
];

export const seedAudit = (): AuditEntry[] => [
  {
    at: '14 Oct, 11:42',
    user: 'Pooja S.',
    action: 'Created',
    kind: 'Entries',
    entity: 'Income · Clinic session',
    after: '₹600 · Cash · Atharva Kale',
  },
  {
    at: '13 Oct, 19:05',
    user: 'Rushikesh P.',
    action: 'Edited',
    kind: 'Entries',
    entity: 'Expense · Consumables · amount',
    before: '₹3,420',
    after: '₹3,240',
  },
  {
    at: '12 Oct, 09:15',
    user: 'Santosh B.',
    action: 'Edited',
    kind: 'Entries',
    entity: 'Expense · Utilities · payment mode',
    before: 'Cash',
    after: 'Bank transfer',
  },
  {
    at: '11 Oct, 18:30',
    user: 'Sameer U.',
    action: 'Deleted',
    kind: 'Entries',
    entity: 'Expense · Miscellaneous',
    before: '₹450 · Tea & snacks (duplicate)',
    after: 'Soft-deleted',
  },
  {
    at: '10 Oct, 10:02',
    user: 'Sameer U.',
    action: 'Settings',
    kind: 'Settings',
    entity: 'Budget · Consumables',
    before: '₹18,000',
    after: '₹20,000',
  },
  {
    at: '08 Oct, 16:20',
    user: 'Sameer U.',
    action: 'Settings',
    kind: 'Settings',
    entity: 'Role · Front desk · finance.entry.view',
    before: 'None',
    after: 'Own',
  },
  {
    at: '02 Oct, 21:10',
    user: 'Rushikesh Y.',
    action: 'Settled',
    kind: 'Entries',
    entity: 'Settlement · September 2026',
    before: 'Open balance ₹31,240',
    after: 'Marked settled',
  },
  {
    at: '01 Oct, 08:45',
    user: 'Sameer U.',
    action: 'Settings',
    kind: 'Settings',
    entity: 'Category · rename',
    before: 'Travel',
    after: 'Travel (home visits)',
  },
];
