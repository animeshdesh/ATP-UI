import { ChevronRight, ExternalLink, ShieldCheck, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useAuthedSession, useSession } from '@atp/core';
import { Avatar, Button, Note } from '@atp/ui';
import { usePageHeader } from '@/app/header';
import { MONEY_URL, MONEY_USERS_URL, NAV, allowed } from '@/app/nav';

/** Phone-only overflow: availability, branches, links to ATP Money, sign out. */
export function MorePage() {
  const session = useAuthedSession();
  const { can, signOut } = useSession();
  const navigate = useNavigate();
  usePageHeader({ title: 'More', subtitle: 'ATP Patients' });
  const items = (['availability', 'branches'] as const).filter((k) => allowed(NAV[k], can));
  const row =
    'flex min-h-13 items-center gap-3 border-0 border-b border-rule bg-white px-4 text-[15px] font-semibold text-ink no-underline last:border-b-0 hover:bg-accent-100 hover:text-ink';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col border-2 border-ink bg-white">
        {items.map((k) => {
          const Icon = NAV[k].icon;
          return (
            <Link key={k} to={NAV[k].path} className={row}>
              <Icon aria-hidden size={19} />
              <span className="flex-1">{NAV[k].label}</span>
              <ChevronRight aria-hidden size={17} />
            </Link>
          );
        })}
        <a href={MONEY_URL} target="_blank" rel="noreferrer" className={row}>
          <Wallet aria-hidden size={19} />
          <span className="flex-1">Open ATP Money</span>
          <ExternalLink aria-hidden size={15} />
        </a>
        {can('settings.roles.manage') && (
          <a href={MONEY_USERS_URL} target="_blank" rel="noreferrer" className={row}>
            <ShieldCheck aria-hidden size={19} />
            <span className="flex-1">Manage users in ATP Money</span>
            <ExternalLink aria-hidden size={15} />
          </a>
        )}
      </div>
      <div className="flex items-center gap-3 border-2 border-ink bg-white px-4 py-3">
        <Avatar initials={session.user.initials} filled size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{session.user.fullName}</div>
          <div className="text-sm text-neutral-700">{session.roleLabel}</div>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
        >
          Sign out
        </Button>
      </div>
      <Note>ATP Patients · Built by Avyanta Labs for ATP Rehab</Note>
    </div>
  );
}
