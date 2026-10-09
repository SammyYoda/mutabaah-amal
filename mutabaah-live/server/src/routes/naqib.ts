import type { FastifyInstance } from 'fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { users, usrah, memberships } from '../db/schema.js';
import { requireNaqib } from '../auth/guards.js';
import { AppError, MESSAGES } from '../errors.js';
import { hashPassword, randomTempPassword } from '../auth/password.js';
import { revokeUserSessions } from '../auth/sessions.js';
import { regenerateInviteCode } from '../services/usrah.js';
import { usrahIdOf } from './amalan.js';

const NOT_ALLOWED = 'Tindakan ini tidak dibenarkan';

export async function naqibRoutes(app: FastifyInstance) {
  const inviteLink = (code: string) => `${app.appOrigin}/#daftar?kod=${code}`;

  app.get('/usrah/invite-code', { preHandler: requireNaqib }, async (req) => {
    const u = app.db.select({ inviteCode: usrah.inviteCode }).from(usrah).where(eq(usrah.id, usrahIdOf(req))).get();
    if (!u) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    return { inviteCode: u.inviteCode, link: inviteLink(u.inviteCode) };
  });

  app.post('/usrah/invite-code/regenerate', { preHandler: requireNaqib }, async (req) => {
    const code = regenerateInviteCode(app.db, usrahIdOf(req));
    return { inviteCode: code, link: inviteLink(code) };
  });

  /** The active membership of a user in the caller's usrah, or 404. */
  function findMember(usrahId: number, rawId: string) {
    const id = /^\d{1,15}$/.test(rawId) ? Number(rawId) : NaN;
    const m = Number.isNaN(id)
      ? undefined
      : app.db
          .select({ userId: memberships.userId, role: memberships.role })
          .from(memberships)
          .where(and(eq(memberships.userId, id), eq(memberships.usrahId, usrahId), isNull(memberships.removedAt)))
          .get();
    if (!m) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    return m;
  }

  app.post('/members/:id/reset-password', { preHandler: requireNaqib }, async (req) => {
    const m = findMember(usrahIdOf(req), (req.params as { id: string }).id);
    if (m.role !== 'member') throw new AppError(403, 'FORBIDDEN', NOT_ALLOWED);
    const temporaryPassword = randomTempPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    app.db.transaction((tx) => {
      tx.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, m.userId)).run();
    });
    revokeUserSessions(app.db, m.userId);
    return { temporaryPassword };
  });

  app.delete('/members/:id', { preHandler: requireNaqib }, async (req, reply) => {
    const usrahId = usrahIdOf(req);
    const m = findMember(usrahId, (req.params as { id: string }).id);
    if (m.userId === req.user.id || m.role !== 'member') throw new AppError(403, 'FORBIDDEN', NOT_ALLOWED);
    app.db
      .update(memberships)
      .set({ removedAt: app.now() })
      .where(and(eq(memberships.userId, m.userId), eq(memberships.usrahId, usrahId), isNull(memberships.removedAt)))
      .run();
    revokeUserSessions(app.db, m.userId);
    return reply.status(204).send();
  });
}
