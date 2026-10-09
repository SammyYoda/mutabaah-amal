import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { amalan, usrah } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { DEFAULT_AMALAN } from '../db/defaultAmalan.js';

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** Member invite code, format AAA-9999 (no O/0/I/1). */
export function generateInviteCode(): string {
  let s = '';
  for (let i = 0; i < 3; i++) s += LETTERS[randomInt(LETTERS.length)];
  s += '-';
  for (let i = 0; i < 4; i++) s += DIGITS[randomInt(DIGITS.length)];
  return s;
}

function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
  return typeof code === 'string' && code.startsWith('SQLITE_CONSTRAINT');
}

/** Replaces the stored invite code with a fresh unique one and returns it. */
export function regenerateInviteCode(db: Db, usrahId: number): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateInviteCode();
    try {
      db.update(usrah).set({ inviteCode: code }).where(eq(usrah.id, usrahId)).run();
      return code;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error('could not generate a unique invite code');
}

/** Creates a usrah with the 17 default amalan (createdOn = today, YYYY-MM-DD). */
export function createUsrah(db: Db, name: string, today: string): { id: number; inviteCode: string } {
  return db.transaction((tx) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const inviteCode = generateInviteCode();
      // check first: a failed insert inside the transaction is avoided entirely
      if (tx.select({ id: usrah.id }).from(usrah).where(eq(usrah.inviteCode, inviteCode)).get()) continue;
      const id = tx.insert(usrah).values({ name, inviteCode, createdAt: new Date() }).returning().get().id;
      tx.insert(amalan).values(DEFAULT_AMALAN.map((a) => ({ ...a, usrahId: id, createdOn: today }))).run();
      return { id, inviteCode };
    }
    throw new Error('could not generate a unique invite code');
  });
}
