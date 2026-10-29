import type { ReactNode } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { AuthGate, InvitePage, LoginPage, useSession } from '@atp/core';
import { AccountRoute } from '@/features/account/AccountRoute';
import { AvailabilityPage } from '@/features/availability/AvailabilityPage';
import { BookPage } from '@/features/book/BookPage';
import { BranchesPage } from '@/features/branches/BranchesPage';
import { BookingProvider } from '@/features/calendar/booking';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { InquiriesPage } from '@/features/inquiries/InquiriesPage';
import { MorePage } from '@/features/more/MorePage';
import { NoPermission } from '@/features/more/NoPermission';
import { PatientProfile } from '@/features/patients/PatientProfile';
import { PatientsPage } from '@/features/patients/PatientsPage';
import { RolesPage } from '@/features/settings/RolesPage';
import { Shell } from '@/layout/Shell';
import { BranchProvider } from './branch';
import { HeaderProvider } from './header';
import { NAV, allowed, type NavKey } from './nav';

function Staff() {
  return (
    <AuthGate>
      <BranchProvider>
        <HeaderProvider>
          <BookingProvider>
            <Shell />
          </BookingProvider>
        </HeaderProvider>
      </BranchProvider>
    </AuthGate>
  );
}

/** Screens follow permissions (never role names); without one, say so instead of redirecting. */
function Guard({ nav, children }: { nav: NavKey; children: ReactNode }) {
  const { can } = useSession();
  return allowed(NAV[nav], can) ? children : <NoPermission />;
}

export const routes: RouteObject[] = [
  // Public booking request: no session (A-01, D-044).
  { path: '/book', element: <BookPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
  { path: '/invite', element: <InvitePage /> },
  {
    element: <Staff />,
    children: [
      {
        index: true,
        element: (
          <Guard nav="calendar">
            <CalendarPage />
          </Guard>
        ),
      },
      {
        path: 'inquiries',
        element: (
          <Guard nav="inquiries">
            <InquiriesPage />
          </Guard>
        ),
      },
      {
        path: 'patients',
        element: (
          <Guard nav="patients">
            <PatientsPage />
          </Guard>
        ),
      },
      {
        path: 'patients/:id',
        element: (
          <Guard nav="patients">
            <PatientProfile />
          </Guard>
        ),
      },
      {
        path: 'availability',
        element: (
          <Guard nav="availability">
            <AvailabilityPage />
          </Guard>
        ),
      },
      {
        path: 'settings/branches',
        element: (
          <Guard nav="branches">
            <BranchesPage />
          </Guard>
        ),
      },
      {
        path: 'settings/users',
        element: (
          <Guard nav="users">
            <RolesPage tab="users" />
          </Guard>
        ),
      },
      {
        path: 'settings/roles',
        element: (
          <Guard nav="roles">
            <RolesPage tab="roles" />
          </Guard>
        ),
      },
      { path: 'more', element: <MorePage /> },
      { path: 'account', element: <AccountRoute /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
