import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, lte, ne } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { memberships, sessions, users } from '../db/schema.js';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RENEW_BELOW_MS = 15 * 24 * 60 * 60 * 1000;

export type User = typeof users.$inferSelect;
export type ActiveMembership = {
  id: number;
  usrahId: number;
  role: 'naqib' | 'member';
  joinedAt: Date;
};
export type ResolvedSession = {
  user: User;
  membership: ActiveMembership | null;
  expiresAt: Date;
  /** true when this call slid expiresAt forward (the cookie should be re-sent). */
  renewed: boolean;
};

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

/** Creates a session row and returns the raw token (only its SHA-256 hash is stored). Sweeps expired sessions. */
export function createSession(db: Db, userId: number, now: Date): string {
  const raw = randomBytes(32).toString('base64url');
  db.delete(sessions).where(lte(sessions.expiresAt, now)).run();
  db.insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      createdAt: now,
    })
    .run();
  return raw;
}

export function getActiveMembership(db: Db, userId: number): ActiveMembership | null {
  const row = db
    .select({ id: memberships.id, usrahId: memberships.usrahId, role: memberships.role, joinedAt: memberships.joinedAt })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), isNull(memberships.removedAt)))
    .get();
  return row ?? null;
}

/**
 * Looks up a session by raw token. Expired sessions are deleted and yield null.
 * When fewer than 15 days remain, expiresAt slides to now + 30 days.
 */
export function resolveSession(db: Db, rawToken: string, now: Date): ResolvedSession | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const session = db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash)).get();
  if (!session) return null;
  if (session.expiresAt.getTime() <= now.getTime()) {
    db.delete(sessions).where(eq(sessions.id, session.id)).run();
    return null;
  }
  const user = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!user) return null;

  let expiresAt = session.expiresAt;
  let renewed = false;
  if (expiresAt.getTime() - now.getTime() < RENEW_BELOW_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    db.update(sessions).set({ expiresAt }).where(eq(sessions.id, session.id)).run();
    renewed = true;
  }
  return { user, membership: getActiveMembership(db, user.id), expiresAt, renewed };
}

export function deleteSession(db: Db, rawToken: string): void {
  db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken))).run();
}

/** Deletes all of a user's sessions, optionally keeping the one identified by `exceptRawToken`. */
export function revokeUserSessions(db: Db, userId: number, exceptRawToken?: string): void {
  const where = exceptRawToken
    ? and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(exceptRawToken)))
    : eq(sessions.userId, userId);
  db.delete(sessions).where(where).run();
}
