import {
  CalendarDays,
  Clock,
  Ellipsis,
  Inbox,
  MapPinned,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey, Scope } from '@atp/core';

export type NavKey =
  'calendar' | 'inquiries' | 'patients' | 'availability' | 'branches' | 'users' | 'roles' | 'more';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the user has this permission at `min` scope or wider. */
  permission?: PermissionKey;
  min?: Exclude<Scope, 'none'>;
  section: 'main' | 'settings' | 'mobile';
  /** Other path prefixes that mark this item active (tabs of one screen). */
  match?: string[];
}

export const NAV: Record<NavKey, NavItem> = {
  calendar: {
    path: '/',
    label: 'Calendar',
    icon: CalendarDays,
    permission: 'appointments.manage',
    section: 'main',
  },
  // Therapists have `patients.manage` at scope own; the queue is for the front desk and owners.
  inquiries: {
    path: '/inquiries',
    label: 'Inquiries',
    icon: Inbox,
    permission: 'patients.manage',
    min: 'all',
    section: 'main',
  },
  patients: {
    path: '/patients',
    label: 'Patients',
    icon: Users,
    permission: 'patients.view',
    section: 'main',
  },
  availability: {
    path: '/availability',
    label: 'Availability',
    icon: Clock,
    permission: 'appointments.manage',
    section: 'main',
  },
  branches: {
    path: '/settings/branches',
    label: 'Branches',
    icon: MapPinned,
    permission: 'settings.branches.manage',
    section: 'settings',
  },
  // One screen with two tabs (D-051); `usersNavKey` picks the entry the user may open.
  users: {
    path: '/settings/users',
    label: 'Users & roles',
    icon: ShieldCheck,
    permission: 'settings.users.invite',
    section: 'settings',
    match: ['/settings/roles'],
  },
  roles: {
    path: '/settings/roles',
    label: 'Users & roles',
    icon: ShieldCheck,
    permission: 'settings.roles.manage',
    section: 'settings',
    match: ['/settings/users'],
  },
  more: { path: '/more', label: 'More', icon: Ellipsis, section: 'mobile' },
};

export const allowed = (
  item: NavItem,
  can: (k: PermissionKey, min?: Exclude<Scope, 'none'>) => boolean,
) => !item.permission || can(item.permission, item.min);

/** The "Users & roles" entry: the Users tab when the user may invite, else the Roles tab. */
export const usersNavKey = (
  can: (k: PermissionKey, min?: Exclude<Scope, 'none'>) => boolean,
): 'users' | 'roles' | null =>
  allowed(NAV.users, can) ? 'users' : allowed(NAV.roles, can) ? 'roles' : null;

export const MONEY_URL = 'https://money.atprehab.si';

/** Clinic whose public booking page this deployment serves (`/v1/public/clinics/{slug}`). */
export const CLINIC_SLUG = 'atp-rehab';

/** Public booking page, shared with patients. */
export const BOOKING_URL = 'https://patient.atprehab.si/book';
