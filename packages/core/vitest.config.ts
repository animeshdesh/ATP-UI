import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'jsdom', env: { VITE_AUTH: 'mock' } },
});
