/*
 * Single data-access surface for the UI. Feature code imports `api` and the query hooks,
 * never the mock or the HTTP client directly. Endpoints not yet in the backend contract are
 * served by the in-memory mock (src/api/mock/server.ts); swap them to `http` as levels land.
 */
import { http } from './client';
import { mockServer } from './mock/server';

export const api = {
  ...mockServer,
  async health() {
    const { data, error } = await http.GET('/health');
    if (error) throw new Error('API unreachable');
    return data;
  },
};

export { ApiError, NetworkError } from './mock/server';
