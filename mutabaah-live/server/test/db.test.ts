import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, migrateDb, type Db } from '../src/db/client.js';
import { users, usrah, memberships, dailyLogs } from '../src/db/schema.js';
import { DEFAULT_AMALAN } from '../src/db/defaultAmalan.js';
import { eq } from 'drizzle-orm';

let db: Db;
const now = new Date('2026-10-09T00:00:00Z');

function addUser(email: string) {
  return db.insert(users).values({ email, name: 'X', passwordHash: 'h', createdAt: now }).returning().get();
}

beforeEach(() => {
  db = openDb(':memory:');
  migrateDb(db);
});

describe('schema', () => {
  it('rejects duplicate (userId, date) daily logs', () => {
    const u = addUser('a@x.my');
    const r = db.insert(usrah).values({ name: 'U', inviteCode: 'ABC-2345', createdAt: now }).returning().get();
    const row = { userId: u.id, usrahId: r.id, date: '2026-10-09', values: { 1: 5 }, updatedAt: now };
    db.insert(dailyLogs).values(row).run();
    expect(() => db.insert(dailyLogs).values(row).run()).toThrow();
  });

  it('allows only one active membership per user', () => {
    const u = addUser('b@x.my');
    const r1 = db.insert(usrah).values({ name: 'U1', inviteCode: 'ABC-2345', createdAt: now }).returning().get();
    const r2 = db.insert(usrah).values({ name: 'U2', inviteCode: 'ABC-2346', createdAt: now }).returning().get();
    const first = db.insert(memberships).values({ userId: u.id, usrahId: r1.id, role: 'member', joinedAt: now }).returning().get();
    expect(() => db.insert(memberships).values({ userId: u.id, usrahId: r2.id, role: 'member', joinedAt: now }).run()).toThrow();
    db.update(memberships).set({ removedAt: now }).where(eq(memberships.id, first.id)).run();
    expect(() => db.insert(memberships).values({ userId: u.id, usrahId: r2.id, role: 'member', joinedAt: now }).run()).not.toThrow();
  });

  it('enforces foreign keys', () => {
    expect(() => db.insert(memberships).values({ userId: 999, usrahId: 999, role: 'member', joinedAt: now }).run()).toThrow();
  });
});

describe('DEFAULT_AMALAN', () => {
  it('has 17 items, exactly one prayers', () => {
    expect(DEFAULT_AMALAN).toHaveLength(17);
    expect(DEFAULT_AMALAN.filter((a) => a.inputType === 'prayers')).toHaveLength(1);
    expect(DEFAULT_AMALAN.find((a) => a.inputType === 'prayers')!.targetVal).toBe(5);
    expect(DEFAULT_AMALAN.map((a) => a.sort)).toEqual([...Array(17).keys()]);
  });
});
