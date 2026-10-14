import { LogOut, Plus } from 'lucide-react';
import { NavLink, Outlet, useLocation, useMatches, useNavigate } from 'react-router';
import { MORE_KEYS, NAV, TABS, navLabel, type NavKey } from '@/app/nav';
import { useAuthedSession, useSession } from '@/app/session';
import { Avatar, Button } from '@/components/ui';
import { useQuickAdd } from '@/features/entry/QuickAddContext';
import { PeriodSwitch } from '@/features/dashboard/PeriodSwitch';
import { cn } from '@/lib/cn';
import { useOutboxSync } from '@/offline/hooks';
import { OfflineBanner } from '@/offline/OfflineBanner';
import { longDate, monthToDate, monthYear, todayIso } from '@/lib/dates';

export interface RouteHandle {
  nav: NavKey;
}

const subtitleFor = (key: NavKey, clinicName: string): string => {
  const today = todayIso();
  switch (key) {
    case 'dashboard':
      return longDate(today);
    case 'transactions':
    case 'budgets':
    case 'recurring':
      return monthYear(today);
    case 'settlement':
      return monthToDate(today);
    case 'reports':
      return 'Monthly report for the CA';
    case 'categories':
    case 'roles':
      return 'Settings';
    case 'audit':
      return 'Every create, edit and delete';
    case 'more':
      return clinicName;
  }
};

export function AppShell() {
  useOutboxSync();
  const session = useAuthedSession();
  const { can } = useSession();
  const openAdd = useQuickAdd();
  const matches = useMatches();
  const current = (matches.at(-1)?.handle as RouteHandle | undefined)?.nav ?? 'dashboard';
  const title = navLabel(current, session.role);
  const subtitle = subtitleFor(current, session.clinicName);
  const showPeriod = current === 'dashboard' && can('finance.report.view', 'all');

  const visible = (k: NavKey) => {
    const p = NAV[k].permission;
    return !p || can(p);
  };
  const mainKeys = (Object.keys(NAV) as NavKey[]).filter(
    (k) => NAV[k].section === 'main' && visible(k),
  );
  const settingsKeys = (Object.keys(NAV) as NavKey[]).filter(
    (k) => NAV[k].section === 'settings' && visible(k),
  );
  const hasMore = MORE_KEYS.some(visible);

  return (
    <div className="flex h-dvh min-h-0">
      <Sidebar mainKeys={mainKeys} settingsKeys={settingsKeys} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <header className="hidden flex-none items-center gap-4 border-b-2 border-divider px-8 py-[18px] lg:flex">
          <div className="mr-auto">
            <h1 className="text-[26px]">{title}</h1>
            <div className="text-[13px] text-neutral-700">{subtitle}</div>
          </div>
          {showPeriod && <PeriodSwitch />}
          <Button variant="primary" icon={Plus} onClick={() => openAdd()}>
            Add entry
          </Button>
        </header>

        {/* Mobile header */}
        <header className="flex flex-none items-end gap-3 border-b-2 border-divider px-[18px] pt-[max(10px,env(safe-area-inset-top))] pb-3.5 lg:hidden">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <img src="/atp-mark.svg" alt="" className="h-5" />
              <span className="kicker">{subtitle}</span>
            </div>
            <h1 className="text-[28px]">{title}</h1>
          </div>
          <Avatar initials={session.user.initials} />
        </header>

        <OfflineBanner />

        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pt-4 pb-6',
            'lg:gap-7 lg:px-8 lg:pt-6 lg:pb-10',
          )}
        >
          <Outlet />
        </main>

        <TabBar hasMore={hasMore} showSettle={visible('settlement')} />
      </div>
    </div>
  );
}

function NavButton({ k }: { k: NavKey }) {
  const { role } = useAuthedSession();
  const item = NAV[k];
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) =>
        cn(
          'flex min-h-[42px] items-center gap-3 border-l-4 px-4 py-2.5 text-sm no-underline',
          isActive
            ? 'border-accent bg-accent-100 font-extrabold text-accent-900 hover:text-accent-900'
            : 'border-transparent font-medium text-ink hover:bg-accent-100 hover:text-ink',
        )
      }
    >
      <Icon aria-hidden size={17} />
      {navLabel(k, role)}
    </NavLink>
  );
}

function Sidebar({ mainKeys, settingsKeys }: { mainKeys: NavKey[]; settingsKeys: NavKey[] }) {
  const session = useAuthedSession();
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <aside className="hidden w-[236px] flex-none flex-col border-r-2 border-divider bg-white lg:flex">
      <div className="flex flex-col gap-1.5 border-b-2 border-divider px-5 pt-[18px] pb-4">
        <img src="/atp-logo.svg" alt="ATP Rehab" className="h-[54px] self-start" />
        <div className="kicker">Clinic OS · Karvenagar</div>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto py-3">
        {mainKeys.map((k) => (
          <NavButton key={k} k={k} />
        ))}
        {settingsKeys.length > 0 && (
          <>
            <div className="mx-5 mt-3.5 mb-1.5 kicker text-neutral-600">Settings</div>
            {settingsKeys.map((k) => (
              <NavButton key={k} k={k} />
            ))}
          </>
        )}
      </nav>
      <div className="flex items-center gap-2.5 border-t-2 border-divider px-4 pt-3.5 pb-1.5">
        <Avatar initials={session.user.initials} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{session.user.fullName}</div>
          <div className="text-xs text-neutral-700">{session.roleLabel}</div>
        </div>
        <button
          type="button"
          title="Sign out"
          aria-label="Sign out"
          onClick={async () => {
            await signOut();
            navigate('/login');
          }}
          className="grid size-9 place-items-center border-0 bg-transparent text-neutral-700 hover:bg-accent-100"
        >
          <LogOut aria-hidden size={17} />
        </button>
      </div>
      <div className="px-4 pt-1 pb-3 text-[11px] text-neutral-600">Built by Avyanta Labs</div>
    </aside>
  );
}

function TabBar({ hasMore, showSettle }: { hasMore: boolean; showSettle: boolean }) {
  const openAdd = useQuickAdd();
  const { pathname } = useLocation();
  const tabs = TABS.filter(
    (t) =>
      t === 'add' ||
      (t.key !== 'more' && t.key !== 'settlement') ||
      (t.key === 'more' ? hasMore : showSettle),
  );
  // Without More/Settle the design orders Home · Add · Entries.
  const ordered = tabs.length === 3 ? [tabs[0]!, 'add' as const, tabs[1]!] : tabs;
  return (
    <nav
      aria-label="Tabs"
      className="flex flex-none items-stretch border-t-2 border-ink bg-white pb-[max(18px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {ordered.map((t) => {
        if (t === 'add')
          return (
            <div key="add" className="flex flex-1 items-center justify-center py-1.5">
              <button
                type="button"
                aria-label="Add entry"
                onClick={() => openAdd()}
                className="grid h-[52px] w-[60px] place-items-center border-2 border-ink bg-accent text-ink hover:bg-accent-400"
              >
                <Plus aria-hidden size={26} />
              </button>
            </div>
          );
        const item = NAV[t.key];
        const active =
          t.key === 'dashboard'
            ? pathname === '/'
            : pathname.startsWith(item.path) ||
              (t.key === 'more' && MORE_KEYS.some((k) => pathname.startsWith(NAV[k].path)));
        const Icon = t.icon;
        return (
          <NavLink
            key={t.key}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mt-0.5 flex min-h-[60px] flex-1 flex-col items-center justify-center gap-[3px] border-t-4 py-2 text-[11px] no-underline',
              active
                ? 'border-accent font-extrabold text-ink hover:text-ink'
                : 'border-transparent font-medium text-neutral-600 hover:text-ink',
            )}
          >
            <Icon aria-hidden size={21} />
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
