import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Loading } from '@atp/ui';
import { NetworkError } from '../api/errors';
import { sessionKey, useSession } from '../session';
import { ClinicPicker } from './ClinicPicker';

/** Renders `children` only with a session; otherwise loading, clinic picker, or sign-in. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { session, clinicPick, loading, error } = useSession();
  const location = useLocation();
  if (loading)
    return (
      <div className="p-6">
        <Loading />
      </div>
    );
  if (clinicPick) return <ClinicPicker pick={clinicPick} />;
  if (!session && error instanceof NetworkError) return <Unreachable />;
  if (!session)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, ...(error ? { error: error.message } : {}) }}
      />
    );
  return children;
}

/** Signed in, but the API can't be reached and nothing is cached: don't bounce to sign-in. */
function Unreachable() {
  const qc = useQueryClient();
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-4 p-6">
      <img src="/atp-mark.svg" alt="" className="h-12" />
      <h1 className="text-[28px]">Can't reach the clinic server</h1>
      <p className="m-0 max-w-[420px] text-[15px] text-neutral-700">
        Check your internet connection. You're still signed in; try again in a moment.
      </p>
      <Button variant="primary" onClick={() => void qc.invalidateQueries({ queryKey: sessionKey })}>
        Try again
      </Button>
    </div>
  );
}
