/*
 * Shared by every ATP app: the API contract and client, sign-in and session, permissions, and the
 * sign-in screens. App data (finance, patients) stays in each app's own `api`.
 */
export * from './types';
export type { components, paths } from './api/schema';
export { http, unwrap, clinicChoice } from './api/client';
export { ApiError, NetworkError } from './api/errors';
export * from './api/session';
export { auth } from './api/auth';
export * from './lib/env';
export * from './lib/supabase';
export * from './lib/dates';
export * from './lib/money';
export { useOnline } from './lib/online';
export { isIos, isIosSafari, isStandalone } from './lib/pwa';
export { InstallHint, InstallSteps } from './pwa/InstallHint';
export * from './session';
export { Providers, makeQueryClient } from './Providers';
export { BrandProvider, useBrand, type Brand } from './brand';
export { AccountPage } from './auth/AccountPage';
export { AuthGate } from './auth/AuthGate';
export { AuthLayout } from './auth/AuthLayout';
export { ClinicPicker } from './auth/ClinicPicker';
export { InvitePage } from './auth/InvitePage';
export { LoginPage } from './auth/LoginPage';
