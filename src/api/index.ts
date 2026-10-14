/*
 * Single data-access surface for the UI. Feature code imports `api` and the query hooks,
 * never the mock or the HTTP client directly.
 * - L2 (auth, roles, members, invites, audit) and L3 (ledger, categories, recurring, people):
 *   real API when `authMode === 'supabase'`, else contract-shaped mocks (tests).
 * - L4–L7 (settlement, dashboard aggregates, budgets, reports): in-memory mock until their
 *   contracts land (D-012). Those mocks follow the signed-in role via `setMockRole`.
 */
import type { ClinicPick, Session } from '@/domain/types';
import { authMode } from '@/lib/env';
import { http } from './client';
import { mockL2, setMockRole } from './mock/l2';
import { mockLedger } from './mock/ledger';
import { mockServer } from './mock/server';
import { realL2 } from './real';

/** L2 + L3 come from the real API in supabase mode (they share realL2), else from the mocks. */
const l2 =
  authMode === 'supabase' ? realL2 : { ...mockL2, ...mockLedger, chooseClinic: mockL2.getSession };

/** Keep the mock ledger's identity in step with whoever is signed in. */
const track = <T extends Session | ClinicPick | null>(s: T): T => {
  if (s && 'role' in s) setMockRole(s.role);
  return s;
};

export const api = {
  ...mockServer,
  ...l2,
  getSession: async () => track(await l2.getSession()),
  signIn: async (v: Parameters<typeof mockL2.signIn>[0]) => track(await l2.signIn(v)),
  acceptInvite: async (token: string, v: { fullName: string; password: string }) =>
    track(await l2.acceptInvite(token, v)),
  chooseClinic: async (id: string) => track(await l2.chooseClinic(id)),
  signOut: async () => {
    await l2.signOut();
    setMockRole(null);
  },
  async health() {
    const { data, error } = await http.GET('/health');
    if (error) throw new Error('API unreachable');
    return data;
  },
};

export { ApiError, NetworkError } from './errors';
