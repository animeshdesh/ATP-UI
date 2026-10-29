import { useState } from 'react';
import { Copy, MessageCircle, Plus, Share2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api';
import {
  useCreateInvite,
  useCreateRole,
  useInvites,
  useMembers,
  usePermissionCatalog,
  useRevokeInvite,
  useRoles,
  useSetMemberActive,
  useSetRolePermission,
  useUpdateMember,
} from '@/api/queries';
import { usePageHeader } from '@/app/header';
import {
  initials,
  parseIdentifier,
  parseTimestamp,
  useAuthedSession,
  useSession,
  contactField,
  features,
} from '@atp/core';
import { Button, Dialog, Field, Input, Loading, Segmented, useToast, cn } from '@atp/ui';
import type { CreatedInvite, Member, PermissionDef, Role, Scope, UpdateMember } from '@atp/core';

type Tab = 'roles' | 'users';
const TABS = [
  { value: 'roles', label: 'Roles & permissions' },
  { value: 'users', label: 'Users' },
] as const;

/** Users (invites, members) and the role × permission matrix; moved here from money (D-051). */
export function RolesPage({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const showTabs = can('settings.roles.manage') && can('settings.users.invite');
  usePageHeader({
    title: 'Users & roles',
    subtitle: 'Settings · applies to ATP Patients and ATP Money',
    mobileSubtitle: 'Settings',
  });
  return (
    <>
      {showTabs && (
        <Segmented
          label="Section"
          options={TABS}
          value={tab}
          onChange={(t) =>
            navigate(t === 'roles' ? '/settings/roles' : '/settings/users', { replace: true })
          }
          className="self-start"
        />
      )}
      {tab === 'roles' ? <PermissionMatrixView /> : <UsersView />}
    </>
  );
}

const SYSTEM_ORDER = ['Owner', 'Therapist', 'Front desk', 'CA (read-only)'];
const sortRoles = (roles: Role[]) =>
  [...roles].sort((a, b) => {
    const ia = SYSTEM_ORDER.indexOf(a.name);
    const ib = SYSTEM_ORDER.indexOf(b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
  });

/** Releases whose modules have shipped; later ones are set now and dimmed. */
const LIVE: ReadonlyArray<PermissionDef['release']> = ['v1', 'v2'];
const live = (p: PermissionDef) => LIVE.includes(p.release);
const CLINICAL = ['patients', 'appointments'];
const GROUPS: Array<{ label: string; match: (p: PermissionDef) => boolean }> = [
  { label: 'Patients & appointments', match: (p) => live(p) && CLINICAL.includes(p.module) },
  { label: 'Finance', match: (p) => live(p) && p.module === 'finance' },
  {
    label: 'Settings',
    match: (p) => live(p) && p.module !== 'finance' && !CLINICAL.includes(p.module),
  },
  { label: 'Later versions', match: (p) => !live(p) },
];

const nextScope = (s: Scope, supportsOwn: boolean): Scope =>
  s === 'all' ? (supportsOwn ? 'own' : 'none') : s === 'own' ? 'none' : 'all';
const SCOPE_LABEL: Record<Scope, string> = { all: 'All', own: 'Own', none: 'None' };
const SCOPE_STYLE: Record<Scope, string> = {
  all: 'bg-accent text-ink border-ink',
  own: 'bg-accent-100 text-accent-900 border-accent-400',
  none: 'bg-transparent text-neutral-500 border-transparent',
};
/** The Owner role keeps full access; the API also guards the last admin. */
const isLocked = (role: Role) => role.isSystem && role.name === 'Owner';

function PermissionMatrixView() {
  const catalog = usePermissionCatalog();
  const roles = useRoles();
  const setPermission = useSetRolePermission();
  const createRole = useCreateRole();
  const { can } = useSession();
  const toast = useToast();
  const [newRole, setNewRole] = useState<string | null>(null);
  const [phoneRoleId, setPhoneRoleId] = useState<string | null>(null);
  if (catalog.isPending || roles.isPending) return <Loading />;
  if (!catalog.data || !roles.data)
    return <p className="text-sm text-danger-fg">Could not load roles.</p>;
  const editable = can('settings.roles.manage', 'all');
  const cols = sortRoles(roles.data);
  const grid = {
    gridTemplateColumns: `minmax(200px,1.6fr) repeat(${cols.length}, minmax(96px,1fr))`,
  };

  // Phones show one role at a time; start on the first role that can be edited.
  const phoneRole =
    cols.find((r) => r.id === phoneRoleId) ?? cols.find((r) => !isLocked(r)) ?? cols[0]!;

  const cycle = (p: PermissionDef, role: Role) => {
    if (!editable || isLocked(role)) return;
    const scope = nextScope(role.permissions[p.key] ?? 'none', p.supportsOwn);
    setPermission.mutate(
      { roleId: role.id, key: p.key, scope },
      { onError: (e) => toast(e instanceof Error ? e.message : 'Could not change permission') },
    );
  };

  const scopeButton = (p: PermissionDef, role: Role, className: string) => {
    const s: Scope = role.permissions[p.key] ?? 'none';
    return (
      <button
        type="button"
        onClick={() => cycle(p, role)}
        aria-label={`${p.label}, ${role.name}: ${SCOPE_LABEL[s]}`}
        aria-disabled={!editable || isLocked(role)}
        className={cn(
          'border-2 text-xs font-bold',
          SCOPE_STYLE[s],
          (!editable || isLocked(role)) && 'cursor-default',
          className,
        )}
      >
        {SCOPE_LABEL[s]}
      </button>
    );
  };

  return (
    <>
      <section aria-label="Permissions by role" className="flex flex-col gap-3 lg:hidden">
        <div role="group" aria-label="Role" className="flex flex-wrap gap-1.5">
          {cols.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={r.id === phoneRole.id}
              onClick={() => setPhoneRoleId(r.id)}
              className={cn(
                'min-h-11 border-2 border-ink px-3 text-[13px] font-semibold text-ink',
                r.id === phoneRole.id ? 'bg-accent' : 'bg-white',
              )}
            >
              {r.name}
              <span className="font-normal text-neutral-800"> · {r.memberCount}</span>
            </button>
          ))}
        </div>
        <div className="border-2 border-ink bg-white">
          {GROUPS.map((g) => {
            const perms = catalog.data.filter(g.match);
            if (!perms.length) return null;
            return (
              <div key={g.label}>
                <div className="border-b border-rule bg-canvas px-3.5 py-2 text-[11px] font-extrabold tracking-[.08em] uppercase">
                  {g.label}
                </div>
                {perms.map((p) => (
                  <div
                    key={p.key}
                    className={cn(
                      'flex items-center gap-3 border-b border-rule px-3.5 py-1',
                      !live(p) && 'opacity-55',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{p.label}</div>
                      <div className="truncate font-mono text-[11px] text-neutral-600">{p.key}</div>
                    </div>
                    {scopeButton(p, phoneRole, 'min-h-11 min-w-16 px-3')}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
      <div className="hidden flex-none overflow-x-auto border-2 border-ink bg-white lg:block">
        <div
          style={{ minWidth: 200 + cols.length * 110 }}
          role="table"
          aria-label="Role permissions"
        >
          <div className="grid border-b-2 border-ink" style={grid} role="row">
            <div className="self-end px-3.5 py-2.5 kicker" role="columnheader">
              Permission
            </div>
            {cols.map((r) => (
              <div key={r.id} className="border-l border-rule px-2 py-2.5" role="columnheader">
                <div className="text-[13px] font-extrabold">{r.name}</div>
                <div className="text-[11px] text-neutral-700">
                  {r.memberCount} {r.memberCount === 1 ? 'user' : 'users'}
                </div>
              </div>
            ))}
          </div>
          {GROUPS.map((g) => (
            <div key={g.label} role="rowgroup">
              <div className="border-b border-rule bg-canvas px-3.5 py-2 text-[11px] font-extrabold tracking-[.08em] uppercase">
                {g.label}
              </div>
              {catalog.data.filter(g.match).map((p) => (
                <div
                  key={p.key}
                  role="row"
                  className={cn('grid border-b border-rule', !live(p) && 'opacity-55')}
                  style={grid}
                >
                  <div className="px-3.5 py-2" role="rowheader">
                    <div className="text-[13px] font-semibold">{p.label}</div>
                    <div className="font-mono text-[11px] text-neutral-600">{p.key}</div>
                  </div>
                  {cols.map((role) => (
                    <div
                      key={role.id}
                      role="cell"
                      className="flex items-center border-l border-rule px-2 py-1.5"
                    >
                      {scopeButton(p, role, 'px-2 py-1')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {editable && (
          <Button icon={Plus} onClick={() => setNewRole('')}>
            New role
          </Button>
        )}
        <span className="min-w-[200px] flex-1 text-xs text-neutral-700">
          Tap a scope to cycle All → Own → None. "Own" exists only where a permission supports it:
          for entries it means the ones that person logged; for patients, the ones they treat. Owner
          access can't be reduced. Later-version permissions are set now and switch on when those
          modules ship.
        </span>
      </div>
      <Dialog
        open={newRole !== null}
        onClose={() => setNewRole(null)}
        title="New role"
        actions={
          <>
            <Button onClick={() => setNewRole(null)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!newRole?.trim() || createRole.isPending}
              onClick={async () => {
                try {
                  await createRole.mutateAsync(newRole!.trim());
                  toast(`Added role ${newRole!.trim()}`);
                  setNewRole(null);
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'Could not add role');
                }
              }}
            >
              Add role
            </Button>
          </>
        }
      >
        <Field label="Role name" hint="Starts with no permissions. Set them in the table.">
          {(id) => (
            <Input
              id={id}
              value={newRole ?? ''}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="e.g. Visiting consultant"
            />
          )}
        </Field>
      </Dialog>
    </>
  );
}

const dateLabel = (ts: string) =>
  parseTimestamp(ts).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

function UsersView() {
  const session = useAuthedSession();
  const members = useMembers();
  const invites = useInvites();
  const setActive = useSetMemberActive();
  const revoke = useRevokeInvite();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  if (members.isPending) return <Loading />;
  if (!members.data) return <p className="text-sm text-danger-fg">Could not load members.</p>;
  const sorted = [...members.data].sort(
    (a, b) =>
      Number(a.status !== 'active') - Number(b.status !== 'active') ||
      a.fullName.localeCompare(b.fullName),
  );
  return (
    <>
      <Button
        variant="primary"
        icon={UserPlus}
        className="min-h-12 self-start text-[15px]"
        onClick={() => setOpen(true)}
      >
        Invite user
      </Button>

      {invites.data && invites.data.length > 0 && (
        <section className="flex flex-col" aria-label="Pending invites">
          <div className="border-b-2 border-divider pb-1.5 kicker">Invited · not joined yet</div>
          {invites.data.map((i) => (
            <div
              key={i.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-3"
            >
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">{i.displayName}</div>
                <div className="truncate text-xs text-neutral-700">
                  {i.email ?? i.phone} · {i.roles.map((r) => r.name).join(', ')} ·{' '}
                  {i.status === 'expired' ? (
                    <span className="font-semibold text-danger-fg">expired</span>
                  ) : (
                    `expires ${dateLabel(i.expiresAt)}`
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="min-h-11"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(i.id)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </section>
      )}

      <ul
        className="m-0 flex list-none flex-col border-t-2 border-divider p-0"
        aria-label="Members"
      >
        {sorted.map((m) => {
          const name = m.displayName || m.fullName;
          const active = m.status === 'active';
          const self = m.userId === session.user.key;
          return (
            <li
              key={m.id}
              className={cn(
                'grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-3',
                !active && 'opacity-60',
              )}
            >
              <div
                className={cn(
                  'grid size-10 place-items-center border-2 border-ink text-[13px] font-extrabold',
                  m.roles.some((r) => r.name === 'Owner') ? 'bg-accent' : 'bg-white',
                )}
                aria-hidden
              >
                {initials(name)}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold">
                  {name}
                  {self && <span className="font-normal text-neutral-700"> (you)</span>}
                </div>
                <div className="truncate text-xs text-neutral-700">
                  {[m.phone, m.email].filter(Boolean).join(' · ')}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.roles.map((r) => (
                    <span
                      key={r.id}
                      className="bg-accent-100 px-[7px] py-0.5 text-[11px] font-semibold text-accent-800"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'text-neutral-700' : 'text-danger-fg',
                  )}
                >
                  {active ? 'Active' : 'Deactivated'}
                </span>
                <Button
                  size="sm"
                  aria-label={`Edit ${name}`}
                  className="mt-0.5"
                  onClick={() => setEditing(m)}
                >
                  Edit
                </Button>
                {!self && (
                  <Button
                    variant="link"
                    disabled={setActive.isPending}
                    onClick={() =>
                      setActive.mutate(
                        { memberId: m.id, active: !active },
                        {
                          onSuccess: () =>
                            toast(`${name} ${active ? 'deactivated' : 'reactivated'}`),
                          onError: (e) =>
                            toast(e instanceof Error ? e.message : 'Could not update member'),
                        },
                      )
                    }
                  >
                    {active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <InviteDialog open={open} onClose={() => setOpen(false)} />
      <EditMemberDialog member={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const roles = useRoles();
  const invite = useCreateInvite();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [roleIds, setRoleIds] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedInvite | null>(null);

  const options = sortRoles(roles.data ?? []);
  const defaultRole = options.find((r) => r.name === 'Therapist')?.id;
  const selected = roleIds ?? (defaultRole ? [defaultRole] : []);

  const close = () => {
    setName('');
    setContact('');
    setRoleIds(null);
    setError('');
    setCreated(null);
    onClose();
  };
  const send = async () => {
    const id = parseIdentifier(contact);
    if (!name.trim()) return setError('Add their name.');
    if (!id) return setError(contactField.invalid);
    if (selected.length === 0) return setError('Pick at least one role.');
    try {
      setCreated(await invite.mutateAsync({ displayName: name.trim(), roleIds: selected, ...id }));
      setError('');
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'already_member'
          ? 'This person is already a member.'
          : e instanceof Error
            ? e.message
            : 'Could not create the invite.',
      );
    }
  };

  // One dialog for both steps: swapping dialogs would re-run focus handling mid-click.
  return (
    <Dialog
      open={open}
      onClose={close}
      title={created ? 'Send the invite' : 'Invite user'}
      actions={
        created ? (
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={send} disabled={invite.isPending || !roles.data}>
              Create invite
            </Button>
          </>
        )
      }
    >
      {created ? <InviteShare created={created} /> : renderForm()}
    </Dialog>
  );

  function renderForm() {
    return (
      <>
        <Field label="Name">
          {(id) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          )}
        </Field>
        <Field label={contactField.label}>
          {(id) => (
            <Input
              id={id}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={features.phoneAuth ? '+91 or name@email.com' : 'name@email.com'}
            />
          )}
        </Field>
        <RolePicker roles={roles.data} selected={selected} onChange={setRoleIds} />
        <div className="text-xs text-neutral-700">
          You get a link to send on WhatsApp or SMS. They open it and set their own password.
        </div>
        {error && (
          <div role="alert" className="text-xs font-semibold text-danger-fg">
            {error}
          </div>
        )}
      </>
    );
  }
}

function RolePicker({
  roles,
  selected,
  onChange,
}: {
  roles: Role[] | undefined;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[13px] font-semibold">Roles</div>
      <div className="flex flex-wrap gap-1.5">
        {!roles && <span className="text-[13px] text-neutral-700">Loading roles…</span>}
        {sortRoles(roles ?? []).map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((x) => x !== r.id) : [...selected, r.id])
              }
              className={cn(
                'min-h-11 border-2 border-ink px-3 py-2 text-[13px] font-semibold text-ink',
                on ? 'bg-accent' : 'bg-white',
              )}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Rename (settings.users.invite) and/or replace roles (settings.roles.manage). */
function EditMemberDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { can } = useSession();
  const roles = useRoles();
  const update = useUpdateMember();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [roleIds, setRoleIds] = useState<string[] | null>(null);
  const [error, setError] = useState('');
  const canRename = can('settings.users.invite');
  const canRoles = can('settings.roles.manage');
  const currentName = member ? member.displayName || member.fullName : '';
  const shownName = name ?? currentName;
  const selected = roleIds ?? member?.roles.map((r) => r.id) ?? [];

  const close = () => {
    setName(null);
    setRoleIds(null);
    setError('');
    onClose();
  };
  const save = async () => {
    if (!member) return;
    const body: UpdateMember = {};
    if (canRename && name !== null && name.trim() !== currentName) {
      if (!name.trim()) return setError('Add their name.');
      body.displayName = name.trim();
    }
    if (canRoles && roleIds !== null) {
      if (roleIds.length === 0) return setError('Pick at least one role.');
      body.roleIds = roleIds;
    }
    if (!body.displayName && !body.roleIds) return close();
    try {
      await update.mutateAsync({ memberId: member.id, ...body });
      toast(`${body.displayName ?? currentName} updated`);
      close();
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'last_admin'
          ? 'Someone must keep a role that can edit roles, such as Owner.'
          : e instanceof Error
            ? e.message
            : 'Could not save.',
      );
    }
  };

  return (
    <Dialog
      open={!!member}
      onClose={close}
      title={`Edit ${currentName}`}
      actions={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      {canRename && (
        <Field label="Name" hint="How they appear in the calendar and lists.">
          {(id) => (
            <Input
              id={id}
              value={shownName}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
            />
          )}
        </Field>
      )}
      {canRoles && (
        <RolePicker
          roles={roles.data}
          selected={selected}
          onChange={(ids) => {
            setRoleIds(ids);
            setError('');
          }}
        />
      )}
      {error && (
        <div role="alert" className="text-xs font-semibold text-danger-fg">
          {error}
        </div>
      )}
    </Dialog>
  );
}

/** The API returns the invite link once and sends nothing itself: share it from the device. */
function InviteShare({ created }: { created: CreatedInvite }) {
  const toast = useToast();
  const { invite, inviteUrl } = created;
  const text = `You're invited to ATP Clinic OS as ${invite.roles.map((r) => r.name).join(', ')}. Set your password here: ${inviteUrl}`;
  const canShare = typeof navigator.share === 'function';
  return (
    <>
      <p className="m-0 text-sm">
        Invite for <b>{invite.displayName}</b> is ready. It works once and expires in 7 days. This
        is the only time the link is shown.
      </p>
      <div
        className="border-2 border-ink bg-white px-3 py-2 font-mono text-xs break-all"
        aria-label="Invite link"
      >
        {inviteUrl}
      </div>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <Button
            icon={Share2}
            onClick={() =>
              void navigator.share({ title: 'ATP Clinic OS invite', text }).catch(() => {})
            }
          >
            Share
          </Button>
        )}
        <a
          href={`https://wa.me/${(invite.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-2 border-2 border-ink px-4 text-sm font-semibold text-ink no-underline hover:bg-accent-100 hover:text-ink"
        >
          <MessageCircle aria-hidden size={17} />
          WhatsApp
        </a>
        <Button
          icon={Copy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(inviteUrl);
              toast('Invite link copied');
            } catch {
              toast('Copy failed. Select the link and copy it.');
            }
          }}
        >
          Copy link
        </Button>
      </div>
    </>
  );
}
