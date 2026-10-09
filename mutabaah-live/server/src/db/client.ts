import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

export type Db = BetterSQLite3Database<typeof schema>;
export type NewAmalan = typeof schema.amalan.$inferInsert;
export type Amalan = typeof schema.amalan.$inferSelect;

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');

export function openDb(url: string): Db {
  let path = url;
  if (path !== ':memory:') {
    if (path.startsWith('file:')) path = path.slice('file:'.length);
    mkdirSync(dirname(resolve(path)), { recursive: true });
  }
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export function migrateDb(db: Db): void {
  migrate(db, { migrationsFolder });
}

/** Closes the underlying better-sqlite3 connection. */
export function closeDb(db: Db): void {
  (db as Db & { $client: Database.Database }).$client.close();
}
