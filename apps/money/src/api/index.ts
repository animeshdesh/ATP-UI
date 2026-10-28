/*
 * Single data-access surface for the UI. Feature code imports `api` and the query hooks,
 * never the mock or the HTTP client directly.
 * Sign-in and session come from `@atp/core` (`auth`). Every finance level (L3 ledger … L7 reports)
 * and the RBAC admin screens come from the real API when `authMode === 'supabase'`, else from
 * contract-shaped in-memory mocks (tests, or working without the backend; D-012). The mocks follow
 * the signed-in role (core's `setMockRole`).
 */
import { auth, authMode, http } from '@atp/core';
import { mockL2 } from '@atp/core/mock';
import { mockFinance } from './mock/finance';
import { mockLedger } from './mock/ledger';
import { realL2 } from './real';

/** Real API in supabase mode, else the mocks. */
const data = authMode === 'supabase' ? realL2 : { ...mockL2, ...mockLedger, ...mockFinance };

export const api = {
  ...data,
  ...auth,
  async health() {
    const { data, error } = await http.GET('/health');
    if (error) throw new Error('API unreachable');
    return data;
  },
};

export { ApiError, NetworkError } from '@atp/core';
