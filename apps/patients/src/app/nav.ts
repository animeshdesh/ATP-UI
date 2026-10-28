import {
  CalendarDays,
  Clock,
  Ellipsis,
  Inbox,
  MapPinned,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey, Scope } from '@atp/core';

export type NavKey = 'calendar' | 'inquiries' | 'patients' | 'availability' | 'branches' | 'more';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the user has this permission at `min` scope or wider. */
  permission?: PermissionKey;
  min?: Exclude<Scope, 'none'>;
  section: 'main' | 'settings' | 'mobile';
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
  more: { path: '/more', label: 'More', icon: Ellipsis, section: 'mobile' },
};

export const allowed = (
  item: NavItem,
  can: (k: PermissionKey, min?: Exclude<Scope, 'none'>) => boolean,
) => !item.permission || can(item.permission, item.min);

/** Money's user management, linked from the sidebar and More. */
export const MONEY_USERS_URL = 'https://money.atprehab.si/settings/users';
export const MONEY_URL = 'https://money.atprehab.si';

/** Clinic whose public booking page this deployment serves (`/v1/public/clinics/{slug}`). */
export const CLINIC_SLUG = 'atp-rehab';

/** Public booking page, shared with patients. */
export const BOOKING_URL = 'https://patient.atprehab.si/book';
