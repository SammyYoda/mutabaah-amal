import { defineConfig, devices } from '@playwright/test';
import { DEV_API_PORT, DEV_WEB_PORT, PROD_PORT } from './e2e/constants.js';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: [
    { name: 'dev', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${DEV_WEB_PORT}` } },
    { name: 'prod', use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${PROD_PORT}` } },
  ],
  webServer: [
    {
      // dev API: fresh DB with an admin, then the server
      command: `tsx e2e/prepare-db.ts data/e2e.db && PORT=${DEV_API_PORT} DATABASE_URL=file:./data/e2e.db APP_ORIGIN=http://localhost:${DEV_WEB_PORT} tsx server/src/index.ts`,
      url: `http://localhost:${DEV_API_PORT}/api/auth/me`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `API_URL=http://localhost:${DEV_API_PORT} vite web`,
      url: `http://localhost:${DEV_WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // production build served by Fastify
      command: `npm run build && tsx e2e/prepare-db.ts data/e2e-prod.db && NODE_ENV=production PORT=${PROD_PORT} APP_ORIGIN=http://localhost:${PROD_PORT} DATABASE_URL=file:./data/e2e-prod.db tsx server/src/index.ts`,
      url: `http://localhost:${PROD_PORT}/`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
