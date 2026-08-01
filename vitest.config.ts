import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      // Public package imports must work in tests before any dist files exist on a clean checkout.
      '@xr-school/simulation-schema': fileURLToPath(
        new URL('./packages/simulation-schema/src/index.ts', import.meta.url),
      ),
      '@xr-school/simulation-runtime': fileURLToPath(
        new URL('./packages/simulation-runtime/src/index.ts', import.meta.url),
      ),
      '@xr-school/evaluation-engine': fileURLToPath(
        new URL('./packages/evaluation-engine/src/index.ts', import.meta.url),
      ),
      '@xr-school/simulation-content/node': fileURLToPath(
        new URL('./packages/simulation-content/src/node.ts', import.meta.url),
      ),
      '@xr-school/simulation-content': fileURLToPath(
        new URL('./packages/simulation-content/src/index.ts', import.meta.url),
      ),
      '@xr-school/simulation-web': fileURLToPath(
        new URL('./packages/simulation-web/src/index.ts', import.meta.url),
      ),
      '@': fileURLToPath(new URL('./apps/web', import.meta.url)),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    reporter: ['verbose'],
  },
});
