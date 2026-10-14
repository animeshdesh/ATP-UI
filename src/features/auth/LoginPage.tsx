import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { api } from '@/api';
import { useSession } from '@/app/session';
import { Button, Field, Input, Segmented, useToast } from '@/components/ui';
import type { RoleKey } from '@/domain/types';
import { AuthLayout } from './AuthLayout';

const DEV_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'therapist', label: 'Therapist' },
  { value: 'frontdesk', label: 'Front desk' },
] as const;

const inputCls = 'min-h-12 text-base';

export function LoginPage() {
  const { session, signIn } = useSession();
  const location = useLocation();
  const toast = useToast();
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(true);
  const [devRole, setDevRole] = useState<Exclude<RoleKey, 'ca'>>('owner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  // Signing in sets the session; this redirect then returns the user to where they started.
  if (session) return <Navigate to={from} replace />;

  const submit = async () => {
    if (!contact.trim() || !password) return setError('Enter your phone or email and password.');
    setBusy(true);
    try {
      await signIn(devRole);
    } catch {
      setError('Wrong phone, email or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      mobileLogo={<img src="/atp-logo.svg" alt="ATP Rehab" className="mb-8 h-24 self-start" />}
      panel={
        <div>
          <div className="max-w-[460px] text-[44px] leading-[1.05] font-extrabold">
            Every rupee in and out of the clinic, in one place.
          </div>
          <div className="mt-3.5 text-sm">Lane No. 2, Bhagyoday Colony, Karvenagar, Pune</div>
        </div>
      }
    >
      <h1 className="mb-1.5 text-[34px]">Sign in</h1>
      <div className="mb-7 text-sm text-neutral-700">ATP Rehab Clinic OS · staff only</div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Phone or email">
          {(id) => (
            <Input
              id={id}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="username"
              inputMode="email"
              placeholder="+91 98220 41736"
              className={inputCls}
            />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <Input
              id={id}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          )}
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.target.checked)}
            className="size-5 accent-accent"
          />
          Keep me signed in on this device
        </label>
        {import.meta.env.DEV && (
          <div className="flex flex-col gap-1.5 border-2 border-dashed border-neutral-500 p-2.5">
            <div className="kicker">Dev only · sign in as</div>
            <Segmented
              label="Dev role"
              block
              options={DEV_ROLES}
              value={devRole}
              onChange={setDevRole}
            />
          </div>
        )}
        {error && (
          <div role="alert" className="text-[13px] font-semibold text-danger-fg">
            {error}
          </div>
        )}
        <Button type="submit" variant="primary" size="lg" trailingIcon={ArrowRight} disabled={busy}>
          Sign in
        </Button>
        <Button
          size="lg"
          icon={Mail}
          className="justify-start text-[15px]"
          onClick={async () => {
            if (!contact.includes('@')) return setError('Enter your email to get a magic link.');
            setError('');
            await api.sendMagicLink(contact);
            toast(`Magic link sent to ${contact}`);
          }}
        >
          Email me a magic link instead
        </Button>
        <Link to="/invite" className="py-1.5 text-sm underline">
          Have an invite? Set your password
        </Link>
      </form>
      <div className="mt-9 border-t-2 border-divider pt-3.5 text-xs text-neutral-600">
        Built by Avyanta Labs for ATP Rehab
      </div>
    </AuthLayout>
  );
}
