import type { ClinicPick, Me, PermissionKey, RoleKey, Scope, Session } from '@/domain/types';
import { features } from '@/lib/env';

const SYSTEM_ROLES: Array<[string, RoleKey]> = [
  ['Owner', 'owner'],
  ['Therapist', 'therapist'],
  ['Front desk', 'frontdesk'],
  ['CA (read-only)', 'ca'],
];

/** Closest default role for labels and mock-ledger identity. Custom roles fall back on permissions. */
export function roleKeyFrom(names: string[], perms: Partial<Record<string, Scope>>): RoleKey {
  for (const [name, key] of SYSTEM_ROLES) if (names.includes(name)) return key;
  if (perms['finance.settlement.manage'] === 'all') return 'owner';
  if (perms['finance.entry.create'] && perms['finance.entry.create'] !== 'none') return 'therapist';
  return 'ca';
}

export function initials(name: string): string {
  const words = name
    .replace(/^Dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length > 1 ? words[0]![0]! + words.at(-1)![0]! : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase();
}

export function shortName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const first = words.filter((w) => !/^Dr\.?$/i.test(w));
  if (first.length < 2) return name;
  return `${first[0]} ${first.at(-1)![0]}.`;
}

/** `GET /v1/me` → app session, or a clinic pick when no clinic is active. */
export function sessionFromMe(me: Me): Session | ClinicPick {
  const name = me.user.fullName || me.user.email || me.user.phone || 'Member';
  if (!me.activeClinic) return { pickClinic: me.clinics, userName: name };
  const c = me.activeClinic;
  const roleNames = c.roles.map((r) => r.name);
  return {
    user: { key: me.user.id, fullName: name, shortName: shortName(name), initials: initials(name) },
    role: roleKeyFrom(roleNames, c.permissions),
    roleLabel: roleNames.join(', ') || 'Member',
    clinicId: c.id,
    clinicName: c.name,
    permissions: c.permissions as Record<PermissionKey, Scope>,
  };
}

/**
 * Phone or email for Supabase sign-in. Indian numbers without a country code get +91 (E.164).
 * Phones are rejected while phone sign-in is off (`features.phoneAuth`).
 */
export function parseIdentifier(
  input: string,
  { phone = features.phoneAuth } = {},
): { email: string } | { phone: string } | null {
  const v = input.trim();
  if (v.includes('@'))
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { email: v.toLowerCase() } : null;
  if (!phone) return null;
  const digits = v.replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return { phone: digits };
  if (/^\d{10}$/.test(digits)) return { phone: `+91${digits}` };
  if (/^91\d{10}$/.test(digits)) return { phone: `+${digits}` };
  return null;
}

/** Contract timestamps may be Postgres text ("2026-10-14 05:42:52.17+00"); normalise to ISO. */
export function parseTimestamp(value: string): Date {
  const iso = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(iso);
}
