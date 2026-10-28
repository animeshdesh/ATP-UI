/*
 * Single data-access surface for the patients app. Sign-in and session come from `@atp/core`.
 * Patient, calendar, inquiry and package endpoints (backend L9–L12) aren't in the contract yet, so
 * every mode uses the in-memory mock, scoped by the signed-in role (D-012). Swap each area to
 * `http` as its level lands (docs/PROGRESS.md "How to swap a level").
 */
import { auth, http } from '@atp/core';
import { mockPatients } from './mock/patients';

export const api = {
  ...auth,
  ...mockPatients,
  async health() {
    const { data, error } = await http.GET('/health');
    if (error) throw new Error('API unreachable');
    return data;
  },
};

export { ApiError, NetworkError } from '@atp/core';
