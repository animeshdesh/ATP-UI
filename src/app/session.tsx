import { createContext, use, useMemo, type ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { qk, useSessionQuery } from '@/api/queries';
import type { PermissionKey, RoleKey, Scope, Session } from '@/domain/types';

interface SessionValue {
  session: Session | null;
  loading: boolean;
  /** True when the user has the permission at `own` scope or wider. */
  can: (key: PermissionKey, min?: Exclude<Scope, 'none'>) => boolean;
  signIn: (role?: Exclude<RoleKey, 'ca'>) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Swap the cached session and drop every other query, so nothing from the previous user leaks.
 * `qc.clear()` is not used: it would detach the live session observer.
 */
export function replaceSession(qc: QueryClient, session: Session | null) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.session[0] });
  qc.setQueryData(qk.session, session);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isPending } = useSessionQuery();
  const value = useMemo<SessionValue>(() => {
    const session = data ?? null;
    return {
      session,
      loading: isPending,
      can: (key, min = 'own') => {
        const s = session?.permissions[key] ?? 'none';
        return min === 'all' ? s === 'all' : s !== 'none';
      },
      signIn: async (role) => {
        replaceSession(qc, await api.signIn(role));
      },
      signOut: async () => {
        await api.signOut();
        replaceSession(qc, null);
      },
    };
  }, [data, isPending, qc]);
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
