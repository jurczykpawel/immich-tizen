import { defineConfig } from 'vitest/config';

// Tests that need the real TV (developer mode on, sdb connected). Run with `pnpm test:tv`.
export default defineConfig({
  test: { environment: 'node', include: ['test-tv/**/*.test.ts'], testTimeout: 180000, hookTimeout: 180000, fileParallelism: false },
});
