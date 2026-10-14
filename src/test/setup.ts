import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetMockDb } from '@/api/mock/server';
import { resetOutbox } from '@/offline/outbox';
import { setOnline } from './network';

// Mock API latency (80–400 ms) chains across refetches; 1 s flakes when files run in parallel.
configure({ asyncUtilTimeout: 3000 });

beforeEach(async () => {
  resetMockDb();
  setOnline(true);
  await resetOutbox();
});
afterEach(() => cleanup());
