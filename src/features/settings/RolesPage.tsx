import { useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useInvite, useMembers, usePermissionMatrix, useSetPermission } from '@/api/queries';
import { useSession } from '@/app/session';
import { Button, Dialog, Field, Input, Loading, Segmented, useToast } from '@/components/ui';
import type { PermissionRow, Scope } from '@/domain/types';
import { cn } from '@/lib/cn';

type Tab = 'roles' | 'users';
const TABS = [
  { value: 'roles', label: 'Roles & permissions' },
  { value: 'users', label: 'Users' },
] as const;

export function RolesPage({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  return (
    <>
      <Segmented
        label="Section"
        options={TABS}
        value={tab}
        onChange={(t) =>
          navigate(t === 'roles' ? '/settings/roles' : '/settings/users', { replace: true })
        }
        className="self-start"
      />
      {tab === 'roles' ? <PermissionMatrixView /> : <UsersView />}
    </>
  );
}

const NEXT: Record<Scope, Scope> = { all: 'own', own: 'none', none: 'all' };
const SCOPE_LABEL: Record<Scope, string> = { all: 'All', own: 'Own', none: 'None' };
const SCOPE_STYLE: Record<Scope, string> = {
  all: 'bg-accent text-ink border-ink',
  own: 'bg-accent-100 text-accent-900 border-accent-400',
  none: 'bg-transparent text-neutral-500 border-transparent',
};
const GRID = 'grid grid-cols-[minmax(200px,1.6fr)_repeat(4,minmax(96px,1fr))]';

function PermissionMatrixView() {
  const { data, isPending } = usePermissionMatrix();
  const setPermission = useSetPermission();
  const { can } = useSession();
  const toast = useToast();
  if (isPending || !data) return <Loading />;
  const editable = can('settings.roles.manage', 'all');
  const groups = [...new Set(data.rows.map((r) => r.group))];

  const cycle = (row: PermissionRow, col: number) => {
    const role = data.roles[col]!.key;
    if (!editable || row.later || role === 'owner') return;
    setPermission.mutate({ key: row.key, role, scope: NEXT[row.scopes[col]!] });
  };

  return (
    <>
      <div className="flex-none overflow-x-auto border-2 border-ink bg-white">
        <div className="min-w-[640px]" role="table" aria-label="Role permissions">
          <div className={cn(GRID, 'border-b-2 border-ink')} role="row">
            <div className="self-end px-3.5 py-2.5 kicker" role="columnheader">
              Permission
            </div>
            {data.roles.map((r) => (
              <div key={r.key} className="border-l border-rule px-2 py-2.5" role="columnheader">
                <div className="text-[13px] font-extrabold">{r.name}</div>
                <div className="text-[11px] text-neutral-700">{r.users}</div>
              </div>
            ))}
          </div>
          {groups.map((g) => (
            <div key={g} role="rowgroup">
              <div className="border-b border-rule bg-canvas px-3.5 py-2 text-[11px] font-extrabold tracking-[.08em] uppercase">
                {g}
              </div>
              {data.rows
                .filter((r) => r.group === g)
                .map((row) => (
                  <div
                    key={row.key}
                    role="row"
                    className={cn(GRID, 'border-b border-rule', row.later && 'opacity-55')}
                  >
                    <div className="px-3.5 py-2" role="rowheader">
                      <div className="text-[13px] font-semibold">{row.label}</div>
                      <div className="font-mono text-[11px] text-neutral-600">{row.key}</div>
                    </div>
                    {row.scopes.map((s, col) => (
                      <div
                        key={col}
                        role="cell"
                        className="flex items-center border-l border-rule px-2 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => cycle(row, col)}
                          aria-label={`${row.label}, ${data.roles[col]!.name}: ${SCOPE_LABEL[s]}`}
                          className={cn(
                            'border-2 px-2 py-1 text-xs font-bold',
                            SCOPE_STYLE[s],
                            (col === 0 || row.later || !editable) && 'cursor-default',
                          )}
                        >
                          {SCOPE_LABEL[s]}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button icon={Plus} onClick={() => toast('Custom roles arrive with backend L2')}>
          New role
        </Button>
        <span className="min-w-[200px] flex-1 text-xs text-neutral-700">
          Tap a cell to cycle All → Own → None. Owner access can't be reduced. Later-version
          permissions are set now and switch on when those modules ship.
        </span>
      </div>
    </>
  );
}

const INVITE_ROLES = ['Owner', 'Therapist', 'Front desk', 'CA (read-only)'];

function UsersView() {
  const { data, isPending } = useMembers();
  const { can } = useSession();
  const [open, setOpen] = useState(false);
  if (isPending || !data) return <Loading />;
  return (
    <>
      {can('settings.users.invite') && (
        <Button
          variant="primary"
          icon={UserPlus}
          className="min-h-12 self-start text-[15px]"
          onClick={() => setOpen(true)}
        >
          Invite user
        </Button>
      )}
      <ul className="m-0 flex list-none flex-col border-t-2 border-divider p-0">
        {data.map((u) => (
          <li
            key={u.name + u.contact}
            className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-3"
          >
            <div
              className={cn(
                'grid size-10 place-items-center border-2 border-ink text-[13px] font-extrabold',
                u.roles[0] === 'Owner' ? 'bg-accent' : 'bg-white',
              )}
              aria-hidden
            >
              {u.initials}
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">{u.name}</div>
              <div className="truncate text-xs text-neutral-700">{u.contact}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {u.roles.map((r) => (
                  <span
                    key={r}
                    className="bg-accent-100 px-[7px] py-0.5 text-[11px] font-semibold text-accent-800"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={cn(
                'text-xs font-semibold',
                u.status === 'Invited' ? 'text-warn-fg' : 'text-neutral-700',
              )}
            >
              {u.status}
            </span>
          </li>
        ))}
      </ul>
      <InviteDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInvite();
  const toast = useToast();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [roles, setRoles] = useState<string[]>(['Therapist']);
  const [error, setError] = useState('');
  const close = () => {
    setName('');
    setContact('');
    setRoles(['Therapist']);
    setError('');
    onClose();
  };
  const send = async () => {
    if (!name.trim() || !contact.trim()) return setError('Add a name and a phone number or email.');
    if (roles.length === 0) return setError('Pick at least one role.');
    await invite.mutateAsync({ name: name.trim(), contact: contact.trim(), roles });
    toast(contact.includes('@') ? 'Invite sent by email' : 'Invite sent on WhatsApp');
    close();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Invite user"
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={send} disabled={invite.isPending}>
            Send invite
          </Button>
        </>
      }
    >
      <Field label="Name">
        {(id) => (
          <Input
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="min-h-[46px] text-[15px]"
          />
        )}
      </Field>
      <Field label="Phone or email">
        {(id) => (
          <Input
            id={id}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="+91 or name@email.com"
            className="min-h-[46px] text-[15px]"
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="text-[13px] font-semibold">Roles</div>
        <div className="flex flex-wrap gap-1.5">
          {INVITE_ROLES.map((r) => {
            const on = roles.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setRoles((rs) => (on ? rs.filter((x) => x !== r) : [...rs, r]))}
                className={cn(
                  'min-h-11 border-2 border-ink px-3 py-2 text-[13px] font-semibold text-ink',
                  on ? 'bg-accent' : 'bg-white',
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-xs text-neutral-700">
        They get a link on WhatsApp or email to set their own password.
      </div>
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}
