import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { users, usrah } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { hashPassword, verifyPassword, getDummyHash } from '../auth/password.js';
import {
  createSession,
  deleteSession,
  getActiveMembership,
  revokeUserSessions,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  type ActiveMembership,
  type User,
} from '../auth/sessions.js';
import { setSessionCookie, clearSessionCookie } from '../auth/cookie.js';
import { requireUser } from '../auth/guards.js';

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

const WRONG_CREDENTIALS = 'Emel atau kata laluan salah';

export const LOGIN_RATE_LIMIT = { max: 10, timeWindow: '15 minutes' };

const LoginBody = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(1024),
});

const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(8).max(1024),
});

/** The GET /api/auth/me payload. */
export function mePayload(db: Db, user: User, membership: ActiveMembership | null) {
  const u = membership
    ? db.select({ id: usrah.id, name: usrah.name }).from(usrah).where(eq(usrah.id, membership.usrahId)).get()
    : undefined;
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin: user.isAdmin,
      mustChangePassword: user.mustChangePassword,
    },
    usrah: u ?? null,
    role: membership?.role ?? null,
  };
}

export async function authRoutes(app: FastifyInstance) {
  await getDummyHash(); // warm up so the first unknown-email login isn't measurably slower
  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          ...LOGIN_RATE_LIMIT,
          hook: 'preHandler', // body is parsed by then, so the key can include the email
          keyGenerator: (req) => {
            const email = (req.body as { email?: unknown } | undefined)?.email;
            return `${req.ip}|${typeof email === 'string' ? normaliseEmail(email) : ''}`;
          },
        },
      },
    },
    async (req, reply) => {
      const body = LoginBody.parse(req.body);
      const email = normaliseEmail(body.email);
      const user = app.db.select().from(users).where(eq(users.email, email)).get();
      // Always run one argon2 verify so unknown emails take as long as wrong passwords.
      const ok = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), body.password);
      if (!user || !ok) throw new AppError(401, 'UNAUTHENTICATED', WRONG_CREDENTIALS);

      const now = app.now();
      const token = createSession(app.db, user.id, now);
      setSessionCookie(reply, token, new Date(now.getTime() + SESSION_TTL_MS));
      return mePayload(app.db, user, getActiveMembership(app.db, user.id));
    },
  );

  // Not guarded: logging out always succeeds and clears the cookie.
  app.post('/logout', async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (raw) deleteSession(app.db, raw);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get('/me', { preHandler: requireUser }, async (req) => mePayload(app.db, req.user, req.membership));

  app.post('/change-password', { preHandler: requireUser }, async (req) => {
    const body = ChangePasswordBody.parse(req.body);
    if (!(await verifyPassword(req.user.passwordHash, body.currentPassword))) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Kata laluan semasa salah', {
        currentPassword: 'Kata laluan semasa salah',
      });
    }
    const passwordHash = await hashPassword(body.newPassword);
    app.db.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, req.user.id)).run();
    revokeUserSessions(app.db, req.user.id, req.cookies[SESSION_COOKIE]);
    return { ok: true };
  });
}
