import { http, HttpResponse } from 'msw';
import type { components } from '@atp/core';

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4553';

/** Handlers for endpoints in contracts/openapi.json, typed from the generated schema. */
export const handlers = [
  http.get(`${base}/health`, () =>
    HttpResponse.json<components['schemas']['HealthResponse']>({
      status: 'ok',
      db: 'ok',
      uptimeSec: 1,
    }),
  ),
];
