import { createContext, use, useEffect, useMemo, type ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { qk, useSessionQuery } from '@/api/queries';
import type { ClinicPick, PermissionKey, RoleKey, Scope, Session } from '@/domain/types';
import { authMode } from '@/lib/env';
import { supabase } from '@/lib/supabase';

type SessionData = Session | ClinicPick | null;

interface SessionValue {
  session: Session | null;
  /** Signed in, but no active clinic yet (multi-clinic user): show the picker. */
  clinicPick: ClinicPick | null;
  loading: boolean;
  /** Set when loading the session failed, e.g. a deactivated member. */
  error: Error | null;
  /** True when the user has the permission at `own` scope or wider. */
  can: (key: PermissionKey, min?: Exclude<Scope, 'none'>) => boolean;
  signIn: (v: { identifier: string; password: string; devRole?: RoleKey }) => Promise<void>;
  acceptInvite: (token: string, v: { fullName: string; password: string }) => Promise<void>;
  chooseClinic: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

const userOf = (s: SessionData | undefined) =>
  s && 'permissions' in s ? `${s.user.key}:${s.clinicId}` : s ? `pick:${s.userName}` : null;

/**
 * Swap the cached session. When the user (or clinic) changes, reset every other query so nothing
 * from the previous user leaks. Reset, not remove: mounted screens refetch instead of being left
 * observing a removed query. Same user (e.g. the auth-state event and sign-in both loading
 * /v1/me) changes nothing else.
 */
export function replaceSession(qc: QueryClient, session: SessionData) {
  const changed = userOf(qc.getQueryData<SessionData>(qk.session)) !== userOf(session);
  qc.setQueryData(qk.session, session);
  if (changed) void qc.resetQueries({ predicate: (q) => q.queryKey[0] !== qk.session[0] });
}

const isSession = (s: SessionData | undefined): s is Session => !!s && 'permissions' in s;

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending, error } = useSessionQuery();

  // Magic-link callbacks, refreshes in other tabs, and remote sign-outs arrive here.
  useEffect(() => {
    if (authMode !== 'supabase') return;
    const { data: sub } = supabase().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Through replaceSession so a different user (e.g. another tab) resets cached data.
        api
          .getSession()
          .then((next) => replaceSession(qc, next))
          .catch(() => qc.invalidateQueries({ queryKey: qk.session }));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const value = useMemo<SessionValue>(() => {
    const session = isSession(data) ? data : null;
    return {
      session,
      clinicPick: data && !isSession(data) ? data : null,
      loading: isPending,
      error: error ?? null,
      can: (key, min = 'own') => {
        const s = session?.permissions[key] ?? 'none';
        return min === 'all' ? s === 'all' : s !== 'none';
      },
      signIn: async (v) => replaceSession(qc, await api.signIn(v)),
      acceptInvite: async (token, v) => replaceSession(qc, await api.acceptInvite(token, v)),
      chooseClinic: async (id) => replaceSession(qc, await api.chooseClinic(id)),
      signOut: async () => {
        await api.signOut();
        replaceSession(qc, null);
      },
    };
  }, [data, isPending, error, qc]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const v = use(SessionContext);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}

/** For screens behind the auth guard. */
export function useAuthedSession(): Session {
  const { session } = useSession();
  if (!session) throw new Error('No session');
  return session;
}
