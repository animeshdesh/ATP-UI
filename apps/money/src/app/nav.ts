import {
  History,
  Ellipsis,
  FileText,
  House,
  LayoutDashboard,
  List,
  PiggyBank,
  Repeat,
  Scale,
  Tags,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { PermissionKey, RoleKey } from '@atp/core';

export type NavKey =
  | 'dashboard'
  | 'transactions'
  | 'settlement'
  | 'budgets'
  | 'recurring'
  | 'reports'
  | 'categories'
  | 'audit'
  | 'more'
  | 'account';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Shown only with this permission, or any of these (any scope). */
  permission?: PermissionKey | PermissionKey[];
  section: 'main' | 'settings' | 'mobile';
}

export const NAV: Record<NavKey, NavItem> = {
  dashboard: { path: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  transactions: { path: '/transactions', label: 'Transactions', icon: List, section: 'main' },
  settlement: {
    path: '/settlement',
    label: 'Settlement',
    icon: Scale,
    permission: ['finance.settlement.manage', 'finance.report.view'],
    section: 'main',
  },
  budgets: {
    path: '/budgets',
    label: 'Budgets & funds',
    icon: PiggyBank,
    permission: ['finance.budget.manage', 'finance.report.view'],
    section: 'main',
  },
  recurring: {
    path: '/recurring',
    label: 'Recurring',
    icon: Repeat,
    permission: 'finance.budget.manage',
    section: 'main',
  },
  reports: {
    path: '/reports',
    label: 'CA report',
    icon: FileText,
    permission: 'finance.report.view',
    section: 'main',
  },
  categories: {
    path: '/settings/categories',
    label: 'Categories',
    icon: Tags,
    permission: 'settings.categories.manage',
    section: 'settings',
  },
  audit: {
    path: '/audit',
    label: 'Audit log',
    icon: History,
    permission: 'audit.view',
    section: 'settings',
  },
  more: { path: '/more', label: 'More', icon: Ellipsis, section: 'mobile' },
  account: { path: '/account', label: 'My account', icon: UserRound, section: 'mobile' },
};

const ROLE_LABELS: Partial<Record<RoleKey, Partial<Record<NavKey, string>>>> = {
  therapist: { dashboard: 'My summary', transactions: 'My entries' },
  frontdesk: { dashboard: 'Today', transactions: 'Entries' },
};

export const navLabel = (key: NavKey, role: RoleKey) => ROLE_LABELS[role]?.[key] ?? NAV[key].label;

/** Bottom tab bar. `add` is the centre quick-add button. */
export const TABS: Array<{ key: NavKey; label: string; icon: LucideIcon } | 'add'> = [
  { key: 'dashboard', label: 'Home', icon: House },
  { key: 'transactions', label: 'Entries', icon: List },
  'add',
  { key: 'settlement', label: 'Settle', icon: Scale },
  { key: 'more', label: 'More', icon: Ellipsis },
];

/** Screens reached through the More tab on mobile. */
export const MORE_KEYS: NavKey[] = ['budgets', 'recurring', 'reports', 'categories', 'audit'];

/** Users & roles are managed in ATP Patients (D-051); money links there. */
export const PATIENTS_URL = 'https://patient.atprehab.si';
export const PATIENTS_USERS_URL = `${PATIENTS_URL}/settings/users`;
export const USERS_PERMISSIONS: PermissionKey[] = [
  'settings.users.invite',
  'settings.roles.manage',
];

/** Whether a nav item (or route) is open to the user. */
export function navAllowed(
  permission: PermissionKey | PermissionKey[] | undefined,
  can: (key: PermissionKey) => boolean,
): boolean {
  if (!permission) return true;
  return (Array.isArray(permission) ? permission : [permission]).some((k) => can(k));
}
