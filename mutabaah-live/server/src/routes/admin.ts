import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError, MESSAGES } from '../errors.js';
import { users, usrah, naqibInvites } from '../db/schema.js';
import { requireAdmin } from '../auth/guards.js';
import { hashPassword, randomTempPassword } from '../auth/password.js';
import { hashToken, revokeUserSessions } from '../auth/sessions.js';
import { createUsrah } from '../services/usrah.js';
import { todayKL } from '../../../shared/dates.js';

export const NAQIB_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const NameBody = z.object({ name: z.string().trim().min(1).max(100) });
const IdParam = z.object({ id: z.coerce.number().int().positive() });

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.post('/usrah', async (req, reply) => {
    const { name } = NameBody.parse(req.body);
    const created = createUsrah(app.db, name, todayKL(app.now()));
    return reply.status(201).send({ id: created.id, name, inviteCode: created.inviteCode });
  });

  app.get('/usrah', async () => {
    const naqibName = sql<string | null>`(select u.name from memberships m join users u on u.id = m.user_id
      where m.usrah_id = usrah.id and m.role = 'naqib' and m.removed_at is null order by m.id limit 1)`;
    // Same correlated subquery as naqibName: the active naqib with the lowest membership id.
    const naqibId = sql<number | null>`(select m.user_id from memberships m
      where m.usrah_id = usrah.id and m.role = 'naqib' and m.removed_at is null order by m.id limit 1)`;
    const memberCount = sql<number>`(select count(*) from memberships m
      where m.usrah_id = usrah.id and m.removed_at is null)`;
    return app.db
      .select({ id: usrah.id, name: usrah.name, inviteCode: usrah.inviteCode, memberCount, naqibId, naqibName })
      .from(usrah)
      .orderBy(usrah.id)
      .all();
  });

  app.patch('/usrah/:id', async (req) => {
    const { id } = IdParam.parse(req.params);
    const { name } = NameBody.parse(req.body);
    const row = app.db.update(usrah).set({ name }).where(eq(usrah.id, id)).returning().get();
    if (!row) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    return { id: row.id, name: row.name, inviteCode: row.inviteCode };
  });

  app.post('/usrah/:id/naqib-invite', async (req, reply) => {
    const { id } = IdParam.parse(req.params);
    const row = app.db.select({ id: usrah.id }).from(usrah).where(eq(usrah.id, id)).get();
    if (!row) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(app.now().getTime() + NAQIB_INVITE_TTL_MS);
    app.db
      .insert(naqibInvites)
      .values({ usrahId: id, tokenHash: hashToken(token), expiresAt, createdBy: req.user.id })
      .run();
    return reply.status(201).send({ link: `${app.appOrigin}/#daftar?jemputan=${token}`, expiresAt: expiresAt.toISOString() });
  });

  app.post('/users/:id/reset-password', async (req) => {
    const { id } = IdParam.parse(req.params);
    const temporaryPassword = randomTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const res = app.db.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, id)).returning().get();
    if (!res) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    revokeUserSessions(app.db, id);
    return { temporaryPassword };
  });
}
