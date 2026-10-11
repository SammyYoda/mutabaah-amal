import type { FastifyInstance, FastifyRequest } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, MESSAGES } from '../errors.js';
import { users, usrah, memberships, naqibInvites } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { hashPassword, verifyPassword, getDummyHash } from '../auth/password.js';
import {
  createSession,
  hashToken,
  deleteSession,
  getActiveMembership,
  revokeUserSessions,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  type ActiveMembership,
  type User,
} from '../auth/sessions.js';
import { setSessionCookie, clearSessionCookie } from '../auth/cookie.js';
import { DEVICE_COOKIE, DEVICE_TTL_MS, createDeviceToken, setDeviceCookie, trustedDeviceHash } from '../auth/devices.js';
import { requireUser } from '../auth/guards.js';
import { notify } from '../services/notify.js';

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

const WRONG_CREDENTIALS = 'Emel atau kata laluan salah';
const NO_MEMBERSHIP = 'Anda bukan lagi ahli mana-mana usrah. Sila hubungi naqib anda.';

export const SIGNUP_RATE_LIMIT = { max: 10, timeWindow: '1 hour' };
const BAD_CODE = 'Kod jemputan tidak sah';
const DUPLICATE_EMAIL = 'Emel sudah didaftarkan';

export const LOGIN_RATE_LIMIT = { max: 10, timeWindow: '15 minutes' };
/** Per session (keyed on the sid hash), so a hijacked session can't brute-force the current password. */
export const CHANGE_PASSWORD_RATE_LIMIT = { max: 10, timeWindow: '15 minutes' };
/** IP-independent cap per normalised email (R30): a spoofed or rotating client IP can't buy more guesses. */
export const LOGIN_EMAIL_RATE_LIMIT = { max: 20, timeWindow: '1 hour' };
/** Replaces the per-email cap for a login from a trusted device of that account (lockout resistance). */
export const LOGIN_DEVICE_RATE_LIMIT = { max: 20, timeWindow: '1 hour' };

const loginEmailOf = (req: FastifyRequest) => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? normaliseEmail(email) : '';
};
const loginEmailKey = (req: FastifyRequest) => `email|${loginEmailOf(req)}`;

const LoginBody = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(1024),
});

const SignupBody = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30).optional(),
    password: z.string().min(8).max(1024),
    inviteCode: z.string().trim().min(1).max(32).optional(),
    naqibInvite: z.string().trim().min(1).max(200).optional(),
  })
  .refine((b) => (b.inviteCode === undefined) !== (b.naqibInvite === undefined), {
    message: 'Sila berikan kod jemputan atau pautan jemputan naqib sahaja',
    path: ['inviteCode'],
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
  // The usrah's (first active) naqib, shown in the web header's privacy line.
  const naqib = u
    ? db
        .select({ name: users.name })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(memberships.usrahId, u.id), eq(memberships.role, 'naqib'), isNull(memberships.removedAt)))
        .orderBy(memberships.id)
        .limit(1)
        .get()
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
    usrah: u ? { ...u, naqibName: naqib?.name ?? null } : null,
    role: membership?.role ?? null,
  };
}

export async function authRoutes(app: FastifyInstance) {
  await getDummyHash(); // warm up so the first unknown-email login isn't measurably slower
  // A second, per-email limiter. createRateLimit (not app.rateLimit) because the route-level limiter
  // marks the request as rate-limited and a second handler of that kind would be skipped.
  const emailLimiter = typeof app.createRateLimit === 'function'
    ? app.createRateLimit({ ...LOGIN_EMAIL_RATE_LIMIT, keyGenerator: loginEmailKey })
    : undefined;
  // Login requests that carry a valid device cookie for the submitted email → that token's hash.
  const trustedDevice = new WeakMap<FastifyRequest, string>();
  const deviceLimiter = typeof app.createRateLimit === 'function'
    ? app.createRateLimit({ ...LOGIN_DEVICE_RATE_LIMIT, keyGenerator: (req) => `device|${trustedDevice.get(req)}` })
    : undefined;
  app.post(
    '/login',
    {
      preHandler: async (req) => {
        const device = trustedDeviceHash(app.db, req.cookies[DEVICE_COOKIE], loginEmailOf(req), app.now());
        if (device) trustedDevice.set(req, device);
        const limiter = device ? deviceLimiter : emailLimiter;
        if (!limiter) return;
        const r = await limiter(req);
        if (!r.isAllowed && r.isExceeded) throw new AppError(429, 'RATE_LIMITED', MESSAGES.RATE_LIMITED);
      },
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

      // Checked only after the password, so membership status isn't revealed without it.
      const membership = getActiveMembership(app.db, user.id);
      if (!user.isAdmin && !membership) throw new AppError(403, 'FORBIDDEN', NO_MEMBERSHIP);

      const now = app.now();
      const token = createSession(app.db, user.id, now);
      setSessionCookie(reply, token, new Date(now.getTime() + SESSION_TTL_MS));
      if (!trustedDevice.has(req)) {
        setDeviceCookie(reply, createDeviceToken(app.db, user.id, now), new Date(now.getTime() + DEVICE_TTL_MS));
      }
      return mePayload(app.db, user, membership);
    },
  );

  app.post('/signup', { config: { rateLimit: { ...SIGNUP_RATE_LIMIT } } }, async (req, reply) => {
    const body = SignupBody.parse(req.body);
    const email = normaliseEmail(body.email);
    const passwordHash = await hashPassword(body.password); // before the (synchronous) transaction
    const now = app.now();
    const code = body.inviteCode?.trim().toUpperCase();
    const tokenHash = body.naqibInvite ? hashToken(body.naqibInvite) : undefined;

    // Rejoin (R13): an existing non-admin user with no active membership may re-enter with their own password.
    // Verified before the (synchronous) transaction; any other failure looks like a plain duplicate email.
    const prior = app.db.select().from(users).where(eq(users.email, email)).get();
    const mayRejoin =
      !!prior &&
      !prior.isAdmin &&
      !getActiveMembership(app.db, prior.id) &&
      (await verifyPassword(prior.passwordHash, body.password));

    const userId = app.db.transaction((tx) => {
      let usrahId: number;
      let role: 'naqib' | 'member';
      let inviteId: number | undefined;
      if (code !== undefined) {
        const u = tx.select({ id: usrah.id }).from(usrah).where(eq(usrah.inviteCode, code)).get();
        if (!u) throw new AppError(400, 'VALIDATION_ERROR', BAD_CODE, { inviteCode: BAD_CODE });
        usrahId = u.id;
        role = 'member';
      } else {
        const inv = tx.select().from(naqibInvites).where(eq(naqibInvites.tokenHash, tokenHash!)).get();
        if (!inv || inv.usedAt || now.getTime() > inv.expiresAt.getTime()) {
          throw new AppError(400, 'VALIDATION_ERROR', BAD_CODE, { naqibInvite: BAD_CODE });
        }
        usrahId = inv.usrahId;
        role = 'naqib';
        inviteId = inv.id;
      }
      const dup = tx.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
      let id: number;
      if (dup) {
        // re-check inside the transaction: still the same user, still without an active membership
        const stillFree = !tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(and(eq(memberships.userId, dup.id), isNull(memberships.removedAt)))
          .get();
        if (!mayRejoin || dup.id !== prior!.id || !stillFree) {
          throw new AppError(409, 'CONFLICT', DUPLICATE_EMAIL, { email: DUPLICATE_EMAIL });
        }
        id = dup.id; // name/phone deliberately not updated
      } else {
        id = tx
          .insert(users)
          .values({ email, name: body.name, phone: body.phone || null, passwordHash, createdAt: now })
          .returning()
          .get().id;
      }
      tx.insert(memberships).values({ userId: id, usrahId, role, joinedAt: now }).run();
      if (inviteId !== undefined) tx.update(naqibInvites).set({ usedAt: now }).where(eq(naqibInvites.id, inviteId)).run();
      if (role === 'member') {
        const naqibs = tx
          .select({ userId: memberships.userId })
          .from(memberships)
          .where(and(eq(memberships.usrahId, usrahId), eq(memberships.role, 'naqib'), isNull(memberships.removedAt)))
          .all();
        for (const n of naqibs) {
          notify(tx as unknown as Db, n.userId, 'member_joined', `Ahli baru: ${prior && mayRejoin ? prior.name : body.name} telah menyertai usrah`, '#ringkasan', now);
        }
      }
      return id;
    });

    const user = app.db.select().from(users).where(eq(users.id, userId)).get()!;
    const membership = getActiveMembership(app.db, userId);
    const token = createSession(app.db, userId, now);
    setSessionCookie(reply, token, new Date(now.getTime() + SESSION_TTL_MS));
    return reply.status(201).send(mePayload(app.db, user, membership));
  });

  // Not guarded: logging out always succeeds and clears the cookie.
  app.post('/logout', async (req, reply) => {
    const raw = req.cookies[SESSION_COOKIE];
    if (raw) deleteSession(app.db, raw);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get('/me', { preHandler: requireUser }, async (req) => mePayload(app.db, req.user, req.membership));

  app.post(
    '/change-password',
    {
      preHandler: requireUser,
      config: {
        rateLimit: {
          ...CHANGE_PASSWORD_RATE_LIMIT,
          keyGenerator: (req) => `sid|${hashToken(req.cookies[SESSION_COOKIE] ?? '')}`,
        },
      },
    },
    async (req) => {
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
    },
  );
}
