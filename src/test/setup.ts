import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { resetMockDb } from '@/api/mock/server';

beforeEach(() => resetMockDb());
afterEach(() => cleanup());
