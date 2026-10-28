import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Field, Input, Loading, useToast } from '@atp/ui';
import { auth } from '../api/auth';
import { ApiError } from '../api/errors';
import { useSession } from '../session';
import type { InvitePreview } from '../types';
import { AuthLayout } from './AuthLayout';

const CLOSED: Record<Exclude<InvitePreview['status'], 'pending'>, string> = {
  expired: 'This invite has expired. Ask an Owner to send a new one.',
  accepted: 'This invite was already used. Sign in instead.',
  revoked: 'This invite was cancelled. Ask an Owner for a new one.',
};

/** `/invite/:token` (link from POST /v1/invites). `?token=` is accepted too. */
export function InvitePage() {
  const params = useParams();
  const [search] = useSearchParams();
  const token = params.token ?? search.get('token') ?? '';
  const { session, acceptInvite } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const invite = useQuery({
    queryKey: ['invite', token],
    queryFn: () => auth.getInvite(token),
    enabled: !!token,
    retry: false,
  });
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  const join = async (fullName: string) => {
    if (!fullName.trim()) return setError('Enter your name.');
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    setError('');
    try {
      await acceptInvite(token, { fullName: fullName.trim(), password });
      navigate('/', { replace: true });
      toast(`Welcome to ${invite.data?.clinicName ?? 'the clinic'}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'account_exists') {
        setNeedsSignIn(true);
        setError('You already have an account. Sign in first, then open this link again.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not join. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const loadError =
    invite.error instanceof ApiError
      ? invite.error.message
      : invite.error
        ? 'Could not load this invite. Check your connection.'
        : '';

  return (
    <AuthLayout
      mobileLogo={<img src="/atp-mark.svg" alt="" className="mb-7 h-14 self-start" />}
      panel={
        <div className="max-w-[460px] text-[44px] leading-[1.05] font-extrabold">
          Welcome to the team.
        </div>
      }
    >
      {invite.isPending ? (
        <Loading label="Loading invite" />
      ) : loadError || !invite.data ? (
        <InviteClosed message={loadError || 'This invite link is not valid.'} />
      ) : invite.data.status !== 'pending' ? (
        <InviteClosed message={CLOSED[invite.data.status]} />
      ) : (
        <>
          <div className="mb-2 text-[11px] font-bold tracking-[.08em] text-accent-700 uppercase">
            Invitation
          </div>
          <h1 className="mb-2.5 text-[32px]">Set your password</h1>
          <div className="mb-6 border-2 border-ink bg-white px-4 py-3.5 text-[15px] leading-normal">
            You're invited to <b>{invite.data.clinicName}</b> as{' '}
            <b>{invite.data.roles.join(', ')}</b>.
            {session && (
              <div className="mt-1 text-[13px] text-neutral-700">
                Joining as {session.user.fullName}, who is signed in on this device.
              </div>
            )}
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void join(name ?? invite.data.displayName);
            }}
          >
            <Field label="Your name">
              {(id) => (
                <Input
                  id={id}
                  value={name ?? invite.data.displayName}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              )}
            </Field>
            <Field label={invite.data.signInWith === 'email' ? 'Email' : 'Phone'}>
              {(id) => <Input id={id} value={invite.data.identifierHint} disabled />}
            </Field>
            <Field
              label={session ? 'Your password' : 'New password'}
              hint={
                session
                  ? 'Confirms it is you.'
                  : "At least 8 characters. You'll stay signed in on this device."
              }
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete={session ? 'current-password' : 'new-password'}
                />
              )}
            </Field>
            {error && (
              <div role="alert" className="text-[13px] font-semibold text-danger-fg">
                {error}{' '}
                {needsSignIn && (
                  <Link to="/login" state={{ from: `/invite/${token}` }}>
                    Sign in
                  </Link>
                )}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              trailingIcon={ArrowRight}
              disabled={busy}
            >
              Join {invite.data.clinicName}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

function InviteClosed({ message }: { message: string }) {
  return (
    <>
      <h1 className="mb-3 text-[32px]">Invite unavailable</h1>
      <p className="mb-6 text-[15px]">{message}</p>
      <Link to="/login" className="text-sm underline">
        Go to sign in
      </Link>
    </>
  );
}
