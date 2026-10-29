import { AccountPage } from '@atp/core';
import { usePageHeader } from '@/app/header';
import { dropPushSubscription } from '@/app/push';
import { NotificationsSetting } from './NotificationsSetting';

/** `/account`: own name, password, notifications and sign out (shared `AccountPage`). */
export function AccountRoute() {
  usePageHeader({ title: 'My account', subtitle: 'ATP Patients' });
  return (
    <AccountPage onSignOut={dropPushSubscription}>
      <NotificationsSetting />
    </AccountPage>
  );
}
