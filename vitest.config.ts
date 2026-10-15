import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', globals: true, environment: 'node', include: ['shared/**/*.test.js'] } },
      { test: { name: 'server', globals: true, environment: 'node', include: ['server/test/**/*.test.ts'] } },
      {
        // '@shared' mirrors the alias in web/vite.config.js
        resolve: { alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) } },
        test: { name: 'web', globals: true, environment: 'jsdom', include: ['web/**/*.test.js'] },
      },
    ],
  },
});
