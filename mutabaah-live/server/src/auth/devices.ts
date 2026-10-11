import { randomBytes } from 'node:crypto';
import { and, eq, gt, lte } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';
import type { Db } from '../db/client.js';
import { deviceTokens, users } from '../db/schema.js';
import { hashToken } from './sessions.js';

/**
 * Trusted-device cookie (OWASP "device cookies"): set after a successful login and kept across logouts.
 * A login that presents a valid one for the same account is limited per device instead of per email,
 * so someone who only knows the email can't lock the member out of their usual browser.
 */
export const DEVICE_COOKIE = 'did';
export const DEVICE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/** Creates a device token for the user (pruning their expired ones) and returns the raw token. */
export function createDeviceToken(db: Db, userId: number, now: Date): string {
  const raw = randomBytes(32).toString('base64url');
  db.delete(deviceTokens).where(and(eq(deviceTokens.userId, userId), lte(deviceTokens.expiresAt, now))).run();
  db.insert(deviceTokens)
    .values({ userId, tokenHash: hashToken(raw), expiresAt: new Date(now.getTime() + DEVICE_TTL_MS), createdAt: now })
    .run();
  return raw;
}

/** The token's hash if rawToken is an unexpired device token belonging to the account with this (normalised) email. */
export function trustedDeviceHash(db: Db, rawToken: string | undefined, email: string, now: Date): string | null {
  if (!rawToken || !email) return null;
  const tokenHash = hashToken(rawToken);
  const row = db
    .select({ id: deviceTokens.id })
    .from(deviceTokens)
    .innerJoin(users, eq(users.id, deviceTokens.userId))
    .where(and(eq(deviceTokens.tokenHash, tokenHash), eq(users.email, email), gt(deviceTokens.expiresAt, now)))
    .get();
  return row ? tokenHash : null;
}

export function setDeviceCookie(reply: FastifyReply, rawToken: string, expiresAt: Date): void {
  reply.setCookie(DEVICE_COOKIE, rawToken, {
    path: '/api/auth', // only login needs it
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}
