import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Button, Field, Input, Panel, SectionHeader, useToast } from '@atp/ui';
import { auth } from '../api/auth';
import { useAuthedSession, useSession } from '../session';

const MIN_PASSWORD = 8;

const FormError = ({ children }: { children: ReactNode }) => (
  <div role="alert" className="text-[13px] font-semibold text-danger-fg">
    {children}
  </div>
);

/**
 * `/account` in every app: own name (PATCH /v1/me), password (Supabase Auth), sign out.
 * `children` adds app settings, e.g. notifications in ATP Patients.
 */
export function AccountPage({
  children,
  onSignOut,
}: {
  children?: ReactNode;
  /** Runs before signing out, e.g. to drop this device's notifications. */
  onSignOut?: () => Promise<void>;
}) {
  const session = useAuthedSession();
  const { signOut } = useSession();
  const navigate = useNavigate();
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3 border-2 border-ink bg-white px-4 py-3">
        <Avatar initials={session.user.initials} filled size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{session.user.fullName}</div>
          <div className="text-sm text-neutral-700">
            {session.roleLabel} · {session.clinicName}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await onSignOut?.().catch(() => undefined);
            await signOut();
            navigate('/login');
          }}
        >
          Sign out
        </Button>
      </div>
      <NameForm />
      <PasswordForm />
      {children}
    </div>
  );
}

function NameForm() {
  const session = useAuthedSession();
  const { updateName } = useSession();
  const toast = useToast();
  const [name, setName] = useState(session.user.fullName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return setError('Enter your name.');
    setBusy(true);
    setError('');
    try {
      await updateName(name.trim());
      toast('Name saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Your name" className="flex flex-col gap-3">
      <SectionHeader title="Your name" />
      <Panel className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Field label="Name" hint="Shown on entries, appointments and the team list.">
            {(id) => (
              <Input
                id={id}
                value={name}
                autoComplete="name"
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
              />
            )}
          </Field>
          {error && <FormError>{error}</FormError>}
          <Button
            type="submit"
            className="self-start"
            disabled={busy || name.trim() === session.user.fullName}
          >
            Save name
          </Button>
        </form>
      </Panel>
    </section>
  );
}

function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!current) return setError('Enter your current password.');
    if (next.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (next !== confirm) return setError('The new passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await auth.changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast('Password changed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the password. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string,
    hint?: string,
  ) => (
    <Field label={label} hint={hint}>
      {(id) => (
        <Input
          id={id}
          type="password"
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => {
            set(e.target.value);
            setError('');
          }}
        />
      )}
    </Field>
  );
  return (
    <section aria-label="Password" className="flex flex-col gap-3">
      <SectionHeader title="Password" />
      <Panel className="p-4">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {field('Current password', current, setCurrent, 'current-password')}
          {field(
            'New password',
            next,
            setNext,
            'new-password',
            `At least ${MIN_PASSWORD} characters.`,
          )}
          {field('Repeat new password', confirm, setConfirm, 'new-password')}
          {error && <FormError>{error}</FormError>}
          <Button type="submit" variant="primary" className="self-start" disabled={busy}>
            Change password
          </Button>
        </form>
      </Panel>
    </section>
  );
}
