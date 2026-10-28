/*
 * Single data-access surface for the patients app. Sign-in and session come from `@atp/core`.
 * Patients, calendar, requests and payments use the real API (backend L9–L12) when
 * `authMode === 'supabase'`, else the contract-shaped in-memory mock (tests, or no backend; D-012).
 */
import { auth, authMode, http } from '@atp/core';
import { mockPatients } from './mock/patients';
import { realPatients } from './real';

const data: typeof realPatients = authMode === 'supabase' ? realPatients : mockPatients;

export const api = {
  ...auth,
  ...data,
  async health() {
    const { data, error } = await http.GET('/health');
    if (error) throw new Error('API unreachable');
    return data;
  },
};

export { ApiError, NetworkError } from '@atp/core';
