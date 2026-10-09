import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, migrateDb, closeDb } from './db/client.js';
import { buildApp } from './app.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'file:./data/mutabaah.db';
const PORT = Number(process.env.PORT ?? 3001);
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:3000';
const HOST = process.env.HOST ?? '0.0.0.0';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/web');
const staticDir = process.env.NODE_ENV === 'production' && existsSync(webDir) ? webDir : undefined;

const db = openDb(DATABASE_URL);
migrateDb(db);

const app = buildApp({ db, appOrigin: APP_ORIGIN, staticDir, logger: true });

try {
  await app.listen({ port: PORT, host: HOST });
  if (process.env.NODE_ENV === 'production' && !staticDir) {
    app.log.warn(`${webDir} not found — run "npm run build"; serving /api only`);
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await app.close();
    closeDb(db);
    process.exit(0);
  });
}
