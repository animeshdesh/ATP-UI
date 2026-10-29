import { ChevronRight, ExternalLink, Shield, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { MORE_KEYS, NAV, PATIENTS_USERS_URL, USERS_PERMISSIONS, navAllowed } from '@/app/nav';
import { useAuthedSession, useSession } from '@atp/core';
import { Avatar, Button } from '@atp/ui';

export function MorePage() {
  const session = useAuthedSession();
  const { can, signOut } = useSession();
  const navigate = useNavigate();
  const items = MORE_KEYS.filter((k) => navAllowed(NAV[k].permission, (key) => can(key)));
  const showUsers = navAllowed(USERS_PERMISSIONS, (key) => can(key));
  const row =
    'flex min-h-14 items-center gap-3.5 border-b border-rule py-3.5 text-base font-semibold text-ink no-underline hover:text-ink';
  return (
    <>
      <nav aria-label="More" className="flex flex-col border-t-2 border-divider">
        {items.map((k) => {
          const { icon: Icon, label, path } = NAV[k];
          return (
            <Link key={k} to={path} className={row}>
              <Icon aria-hidden size={20} className="w-6" />
              <span className="flex-1">{label}</span>
              <ChevronRight aria-hidden size={18} className="text-neutral-500" />
            </Link>
          );
        })}
        <Link to="/account" className={row}>
          <UserRound aria-hidden size={20} className="w-6" />
          <span className="flex-1">My account</span>
          <ChevronRight aria-hidden size={18} className="text-neutral-500" />
        </Link>
        {showUsers && (
          <a href={PATIENTS_USERS_URL} target="_blank" rel="noreferrer" className={row}>
            <Shield aria-hidden size={20} className="w-6" />
            <span className="flex-1">Manage users in ATP Patients</span>
            <ExternalLink aria-hidden size={16} className="text-neutral-500" />
          </a>
        )}
      </nav>
      <div className="flex items-center gap-3 border-2 border-ink bg-white p-3.5">
        <Avatar initials={session.user.initials} />
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{session.user.fullName}</div>
          <div className="text-xs text-neutral-700">{session.roleLabel}</div>
        </div>
        <Button
          size="sm"
          className="min-h-11"
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
        >
          Sign out
        </Button>
      </div>
      <div className="text-xs text-neutral-600">ATP Rehab Clinic OS · Built by Avyanta Labs</div>
    </>
  );
}
