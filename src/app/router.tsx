import type { ReactNode } from 'react';
import { Navigate, createBrowserRouter, useLocation, type RouteObject } from 'react-router';
import { Loading } from '@/components/ui';
import type { PermissionKey } from '@/domain/types';
import { AuditPage } from '@/features/audit/AuditPage';
import { ClinicPicker } from '@/features/auth/ClinicPicker';
import { InvitePage } from '@/features/auth/InvitePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { BudgetsPage } from '@/features/budgets/BudgetsPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { QuickAddProvider } from '@/features/entry/QuickAddContext';
import { MorePage } from '@/features/more/MorePage';
import { RecurringPage } from '@/features/recurring/RecurringPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { CategoriesPage } from '@/features/settings/CategoriesPage';
import { RolesPage } from '@/features/settings/RolesPage';
import { SettlementPage } from '@/features/settlement/SettlementPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { AppShell, type RouteHandle } from '@/layout/AppShell';
import { useSession } from './session';

function RequireAuth() {
  const { session, clinicPick, loading, error } = useSession();
  const location = useLocation();
  if (loading)
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  if (clinicPick) return <ClinicPicker pick={clinicPick} />;
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, ...(error ? { error: error.message } : {}) }}
      />
    );
  return (
    <QuickAddProvider>
      <AppShell />
    </QuickAddProvider>
  );
}

function Guard({ permission, children }: { permission: PermissionKey; children: ReactNode }) {
  const { can } = useSession();
  return can(permission) ? children : <Navigate to="/" replace />;
}

const page = (nav: RouteHandle['nav'], element: ReactNode, permission?: PermissionKey) => ({
  handle: { nav } satisfies RouteHandle,
  element: permission ? <Guard permission={permission}>{element}</Guard> : element,
});

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
  { path: '/invite', element: <InvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      { index: true, ...page('dashboard', <DashboardPage />) },
      { path: 'transactions', ...page('transactions', <TransactionsPage />) },
      {
        path: 'settlement',
        ...page('settlement', <SettlementPage />, 'finance.settlement.manage'),
      },
      { path: 'budgets', ...page('budgets', <BudgetsPage />, 'finance.budget.manage') },
      { path: 'recurring', ...page('recurring', <RecurringPage />, 'finance.budget.manage') },
      { path: 'reports', ...page('reports', <ReportsPage />, 'finance.report.view') },
      {
        path: 'settings/categories',
        ...page('categories', <CategoriesPage />, 'settings.categories.manage'),
      },
      {
        path: 'settings/roles',
        ...page('roles', <RolesPage tab="roles" />, 'settings.roles.manage'),
      },
      {
        path: 'settings/users',
        ...page('roles', <RolesPage tab="users" />, 'settings.roles.manage'),
      },
      { path: 'audit', ...page('audit', <AuditPage />, 'audit.view') },
      { path: 'more', ...page('more', <MorePage />) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
