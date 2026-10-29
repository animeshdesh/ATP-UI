import { useEffect, type ReactNode } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import {
  AccountPage,
  AuthGate,
  InvitePage,
  LoginPage,
  useSession,
  type PermissionKey,
} from '@atp/core';
import { AuditPage } from '@/features/audit/AuditPage';
import { BudgetsPage } from '@/features/budgets/BudgetsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { QuickAddProvider } from '@/features/entry/QuickAddContext';
import { MorePage } from '@/features/more/MorePage';
import { RecurringPage } from '@/features/recurring/RecurringPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { CategoriesPage } from '@/features/settings/CategoriesPage';
import { SettlementPage } from '@/features/settlement/SettlementPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { AppShell, type RouteHandle } from '@/layout/AppShell';
import { NAV, PATIENTS_URL, navAllowed } from './nav';

function RequireAuth() {
  return (
    <AuthGate>
      <QuickAddProvider>
        <AppShell />
      </QuickAddProvider>
    </AuthGate>
  );
}

function Guard({
  permission,
  children,
}: {
  permission: PermissionKey | PermissionKey[];
  children: ReactNode;
}) {
  const { can } = useSession();
  return navAllowed(permission, (k) => can(k)) ? children : <Navigate to="/" replace />;
}

/** Users & roles moved to ATP Patients (D-051); old bookmarks continue there. */
function MovedToPatients({ path }: { path: string }) {
  useEffect(() => window.location.replace(`${PATIENTS_URL}${path}`), [path]);
  return null;
}

const page = (
  nav: RouteHandle['nav'],
  element: ReactNode,
  permission?: PermissionKey | PermissionKey[],
) => ({
  handle: { nav } satisfies RouteHandle,
  element: permission ? <Guard permission={permission}>{element}</Guard> : element,
});

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
  { path: '/invite', element: <InvitePage /> },
  { path: '/settings/users', element: <MovedToPatients path="/settings/users" /> },
  { path: '/settings/roles', element: <MovedToPatients path="/settings/roles" /> },
  {
    element: <RequireAuth />,
    children: [
      { index: true, ...page('dashboard', <DashboardPage />) },
      { path: 'transactions', ...page('transactions', <TransactionsPage />) },
      {
        path: 'settlement',
        ...page('settlement', <SettlementPage />, NAV.settlement.permission),
      },
      { path: 'budgets', ...page('budgets', <BudgetsPage />, NAV.budgets.permission) },
      { path: 'recurring', ...page('recurring', <RecurringPage />, 'finance.budget.manage') },
      { path: 'reports', ...page('reports', <ReportsPage />, 'finance.report.view') },
      {
        path: 'settings/categories',
        ...page('categories', <CategoriesPage />, 'settings.categories.manage'),
      },
      { path: 'audit', ...page('audit', <AuditPage />, 'audit.view') },
      { path: 'more', ...page('more', <MorePage />) },
      { path: 'account', ...page('account', <AccountPage />) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
