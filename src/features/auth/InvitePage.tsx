import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '@/api';
import { replaceSession } from '@/app/session';
import { Button, Field, Input, Loading, useToast } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { data: invite, isPending } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => api.getInvite(token),
  });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (password.length < 8) return setError('Use at least 8 characters.');
    setBusy(true);
    try {
      const session = await api.acceptInvite({ token, name: name ?? invite?.name ?? '', password });
      replaceSession(qc, session);
      navigate('/', { replace: true });
      toast(`Welcome, ${session.user.fullName.split(' ').slice(0, 2).join(' ')}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      mobileLogo={<img src="/atp-mark.svg" alt="" className="mb-7 h-14 self-start" />}
      panel={
        <div className="max-w-[460px] text-[44px] leading-[1.05] font-extrabold">
          Welcome to the team.
        </div>
      }
    >
      {isPending || !invite ? (
        <Loading label="Loading invite" />
      ) : (
        <>
          <div className="mb-2 text-[11px] font-bold tracking-[.08em] text-accent-700 uppercase">
            Invitation
          </div>
          <h1 className="mb-2.5 text-[32px]">Set your password</h1>
          <div className="mb-6 border-2 border-ink bg-white px-4 py-3.5 text-[15px] leading-normal">
            {invite.invitedBy} added you to <b>{invite.clinicName}</b> as <b>{invite.role}</b>.
          </div>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void join();
            }}
          >
            <Field label="Your name">
              {(id) => (
                <Input
                  id={id}
                  value={name ?? invite.name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="text-base"
                />
              )}
            </Field>
            <Field label="Phone">
              {(id) => <Input id={id} value={invite.contact} disabled className="text-base" />}
            </Field>
            <Field
              label="New password"
              hint="At least 8 characters. You'll stay signed in on this device."
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
                  autoComplete="new-password"
                  className="text-base"
                />
              )}
            </Field>
            {error && (
              <div role="alert" className="text-[13px] font-semibold text-danger-fg">
                {error}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              trailingIcon={ArrowRight}
              disabled={busy}
            >
              Join {invite.clinicName}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
