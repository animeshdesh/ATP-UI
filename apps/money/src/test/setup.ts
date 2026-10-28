import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetMockDb } from '@/api/mock/server';
import { resetOutbox } from '@/offline/outbox';
import { setOnline } from './network';

// Mock API latency (80–400 ms) chains across refetches; 1 s flakes when files run in parallel.
configure({ asyncUtilTimeout: 3000 });

// Mock data is dated around Wed 14 Oct 2026 (IST). Fake only Date so timers stay real.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-14T06:00:00Z') });

beforeEach(async () => {
  resetMockDb();
  setOnline(true);
  await resetOutbox();
});
afterEach(() => cleanup());
