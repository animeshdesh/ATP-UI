import { AccountPage } from '@atp/core';
import { usePageHeader } from '@/app/header';

/** `/account`: own name, password and sign out (shared `AccountPage`). */
export function AccountRoute() {
  usePageHeader({ title: 'My account', subtitle: 'ATP Patients' });
  return <AccountPage />;
}
