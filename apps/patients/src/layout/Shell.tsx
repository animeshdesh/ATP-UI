import { ChevronDown, LogOut, MapPin, Plus, WifiOff } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { InstallHint, useAuthedSession, useOnline, useSession } from '@atp/core';
import { useEffect } from 'react';
import { brand } from '@/app/brand';
import { dropPushSubscription, setAppBadge } from '@/app/push';
import { Avatar, Button, cn } from '@atp/ui';
import { useInquiryCounts } from '@/api/queries';
import { useBranch } from '@/app/branch';
import { useHeaderState } from '@/app/header';
import { NAV, allowed, usersNavKey, type NavKey } from '@/app/nav';
import { useBooking } from '@/features/calendar/booking';

export function Shell() {
  const { can } = useSession();
  const header = useHeaderState();
  const canInquiries = allowed(NAV.inquiries, can);
  const { data: counts } = useInquiryCounts(canInquiries);
  const fresh = counts?.new ?? 0;
  useEffect(() => {
    if (canInquiries && counts) setAppBadge(fresh);
  }, [canInquiries, counts, fresh]);

  return (
    <div className="flex h-dvh min-h-0">
      <Sidebar badge={fresh} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="hidden flex-none items-center gap-4 border-b-2 border-divider px-8 py-[18px] lg:flex">
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-[26px]">{header.title}</h1>
            {header.subtitle && (
              <div className="text-[13px] text-neutral-700">{header.subtitle}</div>
            )}
          </div>
          {header.action && (
            <Button variant="primary" icon={header.action.icon} onClick={header.action.onClick}>
              {header.action.label}
            </Button>
          )}
        </header>

        <header className="flex flex-none items-end gap-3 border-b-2 border-divider px-[18px] pt-[max(10px,env(safe-area-inset-top))] pb-3.5 lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex min-w-0 items-center gap-2">
              <img src="/atp-mark.svg" alt="" className="h-5" />
              <BranchSelect compact />
              <span className="truncate kicker">{header.mobileSubtitle ?? header.subtitle}</span>
            </div>
            <h1 className="truncate text-[28px]">{header.mobileTitle ?? header.title}</h1>
          </div>
          <MeAvatar />
        </header>

        <OfflineBanner />
        <InstallHint appName={brand.appName} />

        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-4 pt-4 pb-6',
            'lg:gap-6 lg:px-8 lg:pt-6 lg:pb-10',
          )}
        >
          <Outlet />
        </main>

        <TabBar badge={fresh} canInquiries={canInquiries} />
      </div>
    </div>
  );
}

function MeAvatar() {
  const session = useAuthedSession();
  return (
    <Link to="/account" aria-label="My account" className="-m-0.5 p-0.5">
      <Avatar initials={session.user.initials} filled size={40} />
    </Link>
  );
}

/** "All branches" or one branch; filters the calendar, requests and patients. */
export function BranchSelect({ compact }: { compact?: boolean }) {
  const { current, setCurrent, active } = useBranch();
  if (active.length < 2) return null;
  return (
    <label
      className={cn(
        'relative flex flex-none items-center gap-1.5 border-2 border-ink bg-white',
        compact ? 'h-12 pr-1.5 pl-2' : 'mt-1 h-10 px-2',
      )}
    >
      <MapPin aria-hidden size={compact ? 13 : 15} />
      <select
        aria-label="Branch"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className={cn(
          'appearance-none border-0 bg-transparent pr-[18px] text-ink outline-none',
          compact
            ? 'h-11 text-base font-bold lg:text-[13px]'
            : 'h-10 flex-1 text-base font-semibold lg:text-sm',
        )}
      >
        <option value="all">All branches</option>
        {active.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden size={13} className="pointer-events-none absolute right-1.5" />
    </label>
  );
}

function NavItemLink({ k, badge }: { k: NavKey; badge?: number }) {
  const item = NAV[k];
  const Icon = item.icon;
  const { pathname } = useLocation();
  const active =
    k === 'calendar'
      ? pathname === '/'
      : [item.path, ...(item.match ?? [])].some((p) => pathname.startsWith(p));
  return (
    <NavLink
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[42px] items-center gap-3 border-l-4 px-4 py-2.5 text-sm no-underline',
        active
          ? 'border-accent bg-accent-100 font-extrabold text-accent-900 hover:text-accent-900'
          : 'border-transparent font-medium text-ink hover:bg-accent-100 hover:text-ink',
      )}
    >
      <Icon aria-hidden size={17} />
      <span className="flex-1">{item.label}</span>
      {!!badge && <Badge n={badge} />}
    </NavLink>
  );
}

const Badge = ({ n, small }: { n: number; small?: boolean }) => (
  <span
    aria-label={`${n} new`}
    className={cn(
      'border-2 border-ink bg-accent text-center font-extrabold text-ink tabular',
      small
        ? 'absolute top-1.5 left-[calc(50%+6px)] min-w-[18px] px-1 text-[10px] leading-[14px]'
        : 'min-w-[22px] px-1.5 text-xs',
    )}
  >
    {n}
  </span>
);

function Sidebar({ badge }: { badge: number }) {
  const session = useAuthedSession();
  const { can, signOut } = useSession();
  const navigate = useNavigate();
  const main = (['calendar', 'inquiries', 'patients', 'availability'] as const).filter((k) =>
    allowed(NAV[k], can),
  );
  const showBranches = allowed(NAV.branches, can);
  const users = usersNavKey(can);
  return (
    <aside className="hidden w-[236px] flex-none flex-col border-r-2 border-divider bg-white lg:flex">
      <div className="flex flex-col gap-1.5 border-b-2 border-divider px-5 pt-[18px] pb-4">
        <img src="/atp-logo.svg" alt="ATP Rehab" className="h-[54px] self-start" />
        <div className="kicker">ATP Patients</div>
        <BranchSelect />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto py-3">
        {main.map((k) => (
          <NavItemLink key={k} k={k} badge={k === 'inquiries' ? badge : undefined} />
        ))}
        {(showBranches || users) && (
          <div className="mx-5 mt-3.5 mb-1.5 kicker text-neutral-600">Settings</div>
        )}
        {showBranches && <NavItemLink k="branches" />}
        {users && <NavItemLink k={users} />}
      </nav>
      <div className="flex items-center gap-2.5 border-t-2 border-divider px-4 pt-3.5 pb-1.5">
        <Link
          to="/account"
          title="My account"
          className="flex min-w-0 flex-1 items-center gap-2.5 text-ink no-underline hover:text-ink"
        >
          <Avatar initials={session.user.initials} filled size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{session.user.fullName}</div>
            <div className="text-xs text-neutral-700">{session.roleLabel}</div>
          </div>
        </Link>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={async () => {
            await dropPushSubscription();
            await signOut();
            navigate('/login');
          }}
          className="grid size-9 place-items-center border-0 bg-transparent text-neutral-700 hover:bg-accent-100"
        >
          <LogOut aria-hidden size={17} />
        </button>
      </div>
      <div className="px-4 pt-1 pb-3 text-[11px] text-neutral-600">
        Built by Avyanta Labs for ATP Rehab
      </div>
    </aside>
  );
}

function OfflineBanner() {
  if (useOnline()) return null;
  return (
    <div
      role="status"
      className="flex flex-none items-center gap-2.5 border-b-2 border-warn-fg bg-warn-bg px-[18px] py-2.5 text-sm font-semibold text-warn-fg"
    >
      <WifiOff aria-hidden size={18} />
      <span className="flex-1">You're offline. Changes can't be saved right now.</span>
    </div>
  );
}

function TabBar({ badge, canInquiries }: { badge: number; canInquiries: boolean }) {
  const { pathname } = useLocation();
  const header = useHeaderState();
  const booking = useBooking();
  const { can } = useSession();
  const keys: Array<NavKey | 'add'> = canInquiries
    ? ['calendar', 'inquiries', 'add', 'patients', 'more']
    : ['calendar', 'add', 'patients', 'more'];
  const add = header.action ?? {
    label: 'New appointment',
    onClick: () => booking.openNew(),
  };
  return (
    <nav
      aria-label="Tabs"
      className="flex flex-none items-stretch border-t-2 border-ink bg-white pb-[max(18px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {keys.map((k) => {
        if (k === 'add')
          return (
            <div key="add" className="flex flex-1 items-center justify-center py-1.5">
              {can('appointments.manage') || header.action ? (
                <button
                  type="button"
                  aria-label={add.label}
                  onClick={add.onClick}
                  className="grid h-[52px] w-[60px] place-items-center border-2 border-ink bg-accent text-ink hover:bg-accent-400"
                >
                  <Plus aria-hidden size={26} />
                </button>
              ) : null}
            </div>
          );
        const item = NAV[k];
        const Icon = item.icon;
        const active =
          k === 'calendar'
            ? pathname === '/'
            : k === 'more'
              ? ['/more', '/availability', '/settings', '/account'].some((p) =>
                  pathname.startsWith(p),
                )
              : pathname.startsWith(item.path);
        return (
          <NavLink
            key={k}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative -mt-0.5 flex min-h-[60px] flex-1 flex-col items-center justify-center gap-[3px] border-t-4 py-2 text-[11px] no-underline',
              active
                ? 'border-accent font-extrabold text-ink hover:text-ink'
                : 'border-transparent font-medium text-neutral-600 hover:text-ink',
            )}
          >
            <Icon aria-hidden size={21} />
            {k === 'calendar' ? 'Today' : item.label}
            {k === 'inquiries' && badge > 0 && <Badge n={badge} small />}
          </NavLink>
        );
      })}
    </nav>
  );
}
