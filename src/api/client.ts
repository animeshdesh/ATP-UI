import createClient from 'openapi-fetch';
import type { paths } from './schema';

/** Typed client for endpoints published in ../atp-backend/contracts/openapi.json. */
export const http = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
});
