import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'shared', globals: true, environment: 'node', include: ['shared/**/*.test.js'] } },
      { test: { name: 'server', globals: true, environment: 'node', include: ['server/test/**/*.test.ts'] } },
      { test: { name: 'web', globals: true, environment: 'jsdom', include: ['web/**/*.test.js'] } },
    ],
  },
});
