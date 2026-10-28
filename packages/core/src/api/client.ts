import createClient, { type Middleware } from 'openapi-fetch';
import { config } from '../lib/env';
import { supabase } from '../lib/supabase';
import { ApiError, NetworkError } from './errors';
import type { paths } from './schema';

const CLINIC_KEY = 'atp.clinicId';

/** Clinic chosen in the picker; sent as `x-clinic-id` (only needed for multi-clinic users). */
export const clinicChoice = {
  get: (): string | null => {
    try {
      return localStorage.getItem(CLINIC_KEY);
    } catch {
      return null;
    }
  },
  set: (id: string | null) => {
    try {
      if (id) localStorage.setItem(CLINIC_KEY, id);
      else localStorage.removeItem(CLINIC_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

const auth: Middleware = {
  async onRequest({ request, schemaPath }) {
    if (schemaPath.startsWith('/v1/') && !schemaPath.startsWith('/v1/public/')) {
      const { data } = await supabase().auth.getSession();
      if (data.session) request.headers.set('Authorization', `Bearer ${data.session.access_token}`);
      const clinicId = clinicChoice.get();
      if (clinicId) request.headers.set('x-clinic-id', clinicId);
    }
    return request;
  },
};

/** fetch rejects with TypeError when the network is down; surface that as a retryable NetworkError. */
const fetchWithNetworkError = async (input: Request): Promise<Response> => {
  try {
    return await fetch(input);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new NetworkError();
  }
};

/** Typed client for endpoints published in ../atp-backend/contracts/openapi.json. */
export const http = createClient<paths>({ baseUrl: config.apiUrl, fetch: fetchWithNetworkError });
http.use(auth);

type Result<T> = { data?: T; error?: unknown; response: Response };

/** Returns `data` or throws ApiError with the contract's error code. */
export async function unwrap<T>(call: Promise<Result<T>>): Promise<T> {
  const { data, error, response } = await call;
  if (response.ok) return data as T;
  const body = error as { error?: { code?: string; message?: string } } | undefined;
  throw new ApiError(
    response.status,
    body?.error?.message ?? response.statusText ?? 'Request failed',
    body?.error?.code,
  );
}
