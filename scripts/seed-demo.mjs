#!/usr/bin/env node
/*
 * Adds realistic demo data to a LOCAL backend through the public API, signed in as the seeded
 * dev users (atp-backend `pnpm db:seed:dev`). Safe to re-run: entries use fixed idempotency keys,
 * receipts/settlement/invite are only added when missing.
 *
 *   pnpm seed:demo
 *
 * Adds: Jul–Aug 2026 full months, extra Sep–Oct entries by therapist and front desk, receipt
 * photos, an equipment-fund draw, a settlement up to 31 Aug, and a pending invite.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.development', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const API = process.env.API_URL ?? env.VITE_API_URL;
const SUPABASE = process.env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = 'atp-dev-1234';

for (const u of [API, SUPABASE]) {
  const host = new URL(u).hostname;
  if (!['localhost', '127.0.0.1'].includes(host))
    throw new Error(`Refusing to seed non-local ${u}`);
}

// ── helpers ───────────────────────────────────────────────
const tokens = {};
async function login(email) {
  if (tokens[email]) return tokens[email];
  const r = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token)
    throw new Error(
      `Login failed for ${email}: ${JSON.stringify(j)}. Run pnpm db:seed:dev in atp-backend.`,
    );
  return (tokens[email] = j.access_token);
}
async function call(email, method, path, body, headers = {}) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await login(email)}`,
      ...(body && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: body instanceof Uint8Array ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      })()
    : null;
  if (!r.ok)
    throw Object.assign(new Error(`${method} ${path} → ${r.status} ${text.slice(0, 200)}`), {
      status: r.status,
      data,
    });
  return data;
}

// Deterministic pseudo-random so re-runs produce the same entries.
let seed = 20261014;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const rupees = (min, max, step = 50) => Math.round((min + rnd() * (max - min)) / step) * step * 100;
const day = (month, d) => `${month}-${String(d).padStart(2, '0')}`;

const OWNER = 'owner@atp.local';
const USERS = {
  Sameer: OWNER,
  RY: 'ry@atp.local',
  RP: 'rp@atp.local',
  Santosh: 'santosh@atp.local',
  Anjali: 'therapist@atp.local',
  Pooja: 'frontdesk@atp.local',
};
const PATIENTS = [
  'Atharva Kale',
  'Shruti Dhengale',
  'Deva Kumar',
  'M. Joshi',
  'S. Patwardhan',
  'Kundan Kumar',
  'R. Pawar',
  'A. Kulkarni',
  'Neha Gokhale',
  'Vikram Shinde',
  'Asha Bhosale',
  'Prakash Jadhav',
];
const AREAS = ['Kothrud', 'Warje', 'Karvenagar', 'Baner', 'Aundh', 'Erandwane'];

// ── reference data ────────────────────────────────────────
const categories = await call(OWNER, 'GET', '/v1/categories');
const cat = (name) => {
  const c = categories.find((x) => x.name === name);
  if (!c) throw new Error(`Missing category ${name}`);
  return c.id;
};
const recurring = await call(OWNER, 'GET', '/v1/recurring-items');
const rec = (name) => recurring.find((r) => r.name === name);
const people = await call(OWNER, 'GET', '/v1/people');
const member = (key) => {
  const names = {
    Sameer: 'Sameer',
    RY: 'Yannawar',
    RP: 'Patil',
    Santosh: 'Santosh',
    Anjali: 'Anjali',
    Pooja: 'Pooja',
  };
  const p = people.find((x) => x.name.includes(names[key]));
  if (!p) throw new Error(`Missing person ${key}`);
  return p.memberId;
};
const funds = await call(OWNER, 'GET', '/v1/funds');
const equipmentFund = funds.find((f) => f.name === 'Equipment fund');

// ── entries ───────────────────────────────────────────────
/** e: [recorder key, payload]; party 'self' | 'clinic' | partner key. */
const entries = [];
let n = 0;
function add(month, recorder, e) {
  const { party = 'self', ...rest } = e;
  entries.push({
    recorder,
    key: `demo-${month}-${String(++n).padStart(3, '0')}`,
    body: {
      ...rest,
      ...(party === 'self' ? {} : { partyMemberId: party === 'clinic' ? null : member(party) }),
    },
  });
}

function fullMonth(month, last) {
  // Recurring
  const r = (name) => (rec(name) ? { recurringItemId: rec(name).id } : {});
  add(month, 'Sameer', {
    type: 'expense',
    amountPaise: 2100000,
    categoryId: cat('Salaries'),
    entryDate: day(month, 1),
    description: 'Staff salary',
    paymentMode: 'bank_transfer',
    party: 'clinic',
    ...r('Staff salary'),
  });
  add(month, 'Sameer', {
    type: 'expense',
    amountPaise: 900000,
    categoryId: cat('Salaries'),
    entryDate: day(month, 1),
    description: 'Watchman salary',
    paymentMode: 'cash',
    ...r('Watchman salary'),
  });
  add(month, 'RY', {
    type: 'expense',
    amountPaise: 800000,
    categoryId: cat('Salaries'),
    entryDate: day(month, 2),
    description: 'Caretaker salary',
    paymentMode: 'cash',
    ...r('Caretaker salary'),
  });
  add(month, 'Sameer', {
    type: 'expense',
    amountPaise: 6000000,
    categoryId: cat('Rent'),
    entryDate: day(month, 5),
    description: `${month === '2026-07' ? 'July' : 'August'} rent`,
    paymentMode: 'bank_transfer',
    party: 'clinic',
    ...r('Rent'),
  });
  add(month, 'Santosh', {
    type: 'expense',
    amountPaise: rupees(3800, 4800),
    categoryId: cat('Utilities'),
    entryDate: day(month, 10),
    description: 'Electricity',
    paymentMode: 'bank_transfer',
    ...r('Electricity'),
  });
  add(month, 'Sameer', {
    type: 'expense',
    amountPaise: 119900,
    categoryId: cat('Utilities'),
    entryDate: day(month, 15),
    description: 'Internet',
    paymentMode: 'upi',
    party: 'clinic',
    ...r('Internet'),
  });
  add(month, 'RP', {
    type: 'expense',
    amountPaise: 70000,
    categoryId: cat('Maintenance'),
    entryDate: day(month, 20),
    description: 'Biomedical waste pickup',
    paymentMode: 'cash',
    ...r('Biomedical waste pickup'),
  });
  // Variable expenses
  for (const [d, who, desc, min, max] of [
    [4, 'RP', 'Kinesio tape', 2500, 3500],
    [12, 'Santosh', 'Electrode pads, gel', 6000, 11000],
    [23, 'RY', 'Theraband set', 1500, 2500],
  ])
    add(month, who, {
      type: 'expense',
      amountPaise: rupees(min, max),
      categoryId: cat('Consumables'),
      entryDate: day(month, d),
      description: desc,
      paymentMode: pick(['upi', 'cash']),
    });
  add(month, 'RP', {
    type: 'expense',
    amountPaise: rupees(2000, 4000),
    categoryId: cat('Marketing'),
    entryDate: day(month, 18),
    description: 'Google Business photos',
    paymentMode: 'upi',
  });
  add(month, 'RY', {
    type: 'expense',
    amountPaise: rupees(800, 1800),
    categoryId: cat('Maintenance'),
    entryDate: day(month, 26),
    description: 'AC servicing',
    paymentMode: 'cash',
  });
  add(month, 'Sameer', {
    type: 'expense',
    amountPaise: rupees(300, 900),
    categoryId: cat('Miscellaneous'),
    entryDate: day(month, 8),
    description: 'Tea & snacks',
    paymentMode: 'cash',
  });
  // Income: clinic sessions at the desk
  for (let i = 0; i < 14; i++)
    add(month, 'Pooja', {
      type: 'income',
      amountPaise: pick([60000, 60000, 80000]),
      categoryId: cat('Clinic session'),
      entryDate: day(month, 1 + Math.floor(rnd() * last)),
      patientName: pick(PATIENTS),
      description: pick([
        'Knee rehab session',
        'Shoulder mobilisation',
        'Post-op ACL',
        'Lower back session',
      ]),
      paymentMode: pick(['cash', 'upi', 'upi']),
      party: pick(['self', 'clinic']),
    });
  // Partner-run sessions
  for (const who of ['Sameer', 'RY', 'RP', 'Santosh'])
    add(month, who, {
      type: 'income',
      amountPaise: pick([60000, 80000]) * 2,
      categoryId: cat('Clinic session'),
      entryDate: day(month, 3 + Math.floor(rnd() * (last - 3))),
      patientName: pick(PATIENTS),
      description: 'Two sessions',
      paymentMode: pick(['cash', 'upi']),
    });
  // Home visits by the therapist
  for (let i = 0; i < 6; i++)
    add(month, 'Anjali', {
      type: 'income',
      amountPaise: pick([100000, 120000]),
      categoryId: cat('Home visit'),
      entryDate: day(month, 1 + Math.floor(rnd() * last)),
      patientName: pick(PATIENTS),
      description: `${pick(['Neuro session', 'Stroke rehab', 'Post-op knee', 'Geriatric rehab'])}, ${pick(AREAS)}`,
      paymentMode: pick(['cash', 'upi']),
    });
  for (let i = 0; i < 3; i++)
    add(month, 'Anjali', {
      type: 'expense',
      amountPaise: rupees(120, 260, 10),
      categoryId: cat('Travel (home visits)'),
      entryDate: day(month, 2 + i * 9),
      description: `Auto fare, ${pick(AREAS)}`,
      paymentMode: 'cash',
    });
  // Packages
  for (let i = 0; i < 2; i++)
    add(month, 'Pooja', {
      type: 'income',
      amountPaise: pick([600000, 720000]),
      categoryId: cat('Package'),
      entryDate: day(month, 6 + i * 11),
      patientName: pick(PATIENTS),
      description: pick(['10-session spine package', '12-session knee package']),
      paymentMode: 'card',
      party: 'clinic',
    });
}

fullMonth('2026-07', 31);
fullMonth('2026-08', 31);
// Equipment bought in August, drawn from the equipment fund
add('2026-08', 'Sameer', {
  type: 'expense',
  amountPaise: 1850000,
  categoryId: cat('Equipment'),
  entryDate: '2026-08-21',
  description: 'Ultrasound therapy unit',
  paymentMode: 'bank_transfer',
  party: 'clinic',
  ...(equipmentFund ? { fundId: equipmentFund.id } : {}),
});

// A few more recent entries recorded by therapist and front desk
for (const [d, desc] of [
  [3, 'Neuro session, Aundh'],
  [11, 'Post-op knee, Baner'],
  [17, 'Stroke rehab, Warje'],
  [24, 'Geriatric rehab, Kothrud'],
])
  add('2026-09', 'Anjali', {
    type: 'income',
    amountPaise: 120000,
    categoryId: cat('Home visit'),
    entryDate: day('2026-09', d),
    patientName: pick(PATIENTS),
    description: desc,
    paymentMode: pick(['cash', 'upi']),
  });
for (const d of [2, 4, 7, 9, 11, 12])
  add('2026-10', 'Pooja', {
    type: 'income',
    amountPaise: 60000,
    categoryId: cat('Clinic session'),
    entryDate: day('2026-10', d),
    patientName: pick(PATIENTS),
    description: pick(['Knee rehab session', 'Shoulder mobilisation', 'Lower back session']),
    paymentMode: pick(['cash', 'upi']),
  });
add('2026-10', 'Anjali', {
  type: 'income',
  amountPaise: 100000,
  categoryId: cat('Home visit'),
  entryDate: '2026-10-10',
  patientName: 'Asha Bhosale',
  description: 'Geriatric rehab, Erandwane',
  paymentMode: 'cash',
});

let created = 0;
const ids = [];
for (const e of entries) {
  const r = await fetch(`${API}/v1/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await login(USERS[e.recorder])}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ...e.body, idempotencyKey: e.key }),
  });
  const j = await r.json();
  if (!r.ok)
    throw new Error(
      `Create ${e.key} (${e.body.description}) → ${r.status} ${JSON.stringify(j).slice(0, 200)}`,
    );
  if (r.status === 201) created++;
  ids.push({ ...e, id: j.id, hasReceipt: j.hasReceipt });
}
console.log(`entries: ${created} created, ${entries.length - created} already there`);

// ── receipts on a few expenses ────────────────────────────
const png = new Uint8Array(
  readFileSync(fileURLToPath(new URL('../public/pwa-512x512.png', import.meta.url))),
);
let receipts = 0;
for (const e of ids
  .filter(
    (x) =>
      x.body.type === 'expense' &&
      /Kinesio|Electrode|Ultrasound|Electricity/.test(x.body.description),
  )
  .slice(0, 6)) {
  if (e.hasReceipt) continue;
  await call(USERS[e.recorder], 'PUT', `/v1/transactions/${e.id}/receipt`, png, {
    'content-type': 'image/png',
  });
  receipts++;
}
console.log(`receipts: ${receipts} uploaded`);

// ── settlement up to 31 Aug ───────────────────────────────
const history = await call(OWNER, 'GET', '/v1/settlements');
if (history.some((s) => s.periodTo >= '2026-08-31'))
  console.log('settlement: already settled up to 31 Aug');
else {
  const pos = await call(OWNER, 'GET', '/v1/settlement?to=2026-08-31');
  if (pos.entryCount === 0) console.log('settlement: nothing open up to 31 Aug');
  else {
    const s = await call(OWNER, 'POST', '/v1/settlements', {
      to: '2026-08-31',
      fingerprint: pos.fingerprint,
    });
    console.log(
      `settlement: settled ${s.entryCount} entries up to 31 Aug, ${s.transferCount} payments`,
    );
  }
}

// ── a pending invite ──────────────────────────────────────
const invites = await call(OWNER, 'GET', '/v1/invites');
if (invites.some((i) => i.displayName === 'Dr. Neha Joshi')) console.log('invite: already pending');
else {
  const roles = await call(OWNER, 'GET', '/v1/roles');
  const therapist = roles.find((r) => r.name === 'Therapist');
  const inv = await call(OWNER, 'POST', '/v1/invites', {
    displayName: 'Dr. Neha Joshi',
    phone: '+919876543210',
    roleIds: [therapist.id],
  });
  console.log(`invite: created, link ${inv.inviteUrl}`);
}
console.log('done');
