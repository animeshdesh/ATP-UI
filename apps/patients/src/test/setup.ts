import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { resetMockL2 } from '@atp/core/mock';
import { resetMockPatients } from '@/api/mock/patients';

configure({ asyncUtilTimeout: 3000 });

// Wed 28 Oct 2026, 10:20 IST (the design's sample day). Fake only Date so timers stay real.
vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-28T04:50:00Z') });

beforeEach(() => {
  resetMockL2();
  resetMockPatients();
  localStorage.clear();
});
afterEach(() => cleanup());
