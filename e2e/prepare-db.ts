// Recreates an E2E database from scratch (migrated + one admin). Usage: tsx e2e/prepare-db.ts <path>
import { rmSync } from 'node:fs';
import { openDb, migrateDb, closeDb } from '../server/src/db/client.js';
import { createAdmin } from '../server/src/cli/create-admin.js';
import { ADMIN } from './constants.js';

const path = process.argv[2];
if (!path) throw new Error('usage: prepare-db.ts <db path>');
for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
const db = openDb(`file:${path}`);
migrateDb(db);
await createAdmin(db, ADMIN);
closeDb(db);
