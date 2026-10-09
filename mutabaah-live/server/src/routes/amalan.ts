import type { FastifyInstance } from 'fastify';
import { eq, asc } from 'drizzle-orm';
import { amalan } from '../db/schema.js';
import { requireUser } from '../auth/guards.js';
import { AppError, MESSAGES } from '../errors.js';

/** The caller's usrah id (from their active membership); admins without one get 403. */
export function usrahIdOf(req: { membership: { usrahId: number } | null }): number {
  if (!req.membership) throw new AppError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
  return req.membership.usrahId;
}

export async function amalanRoutes(app: FastifyInstance) {
  app.get('/amalan', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    return app.db
      .select({
        id: amalan.id,
        code: amalan.code,
        name: amalan.name,
        description: amalan.description,
        freq: amalan.freq,
        inputType: amalan.inputType,
        targetVal: amalan.targetVal,
        unit: amalan.unit,
        icon: amalan.icon,
        sort: amalan.sort,
        active: amalan.active,
        createdOn: amalan.createdOn,
        deactivatedOn: amalan.deactivatedOn,
      })
      .from(amalan)
      .where(eq(amalan.usrahId, usrahId))
      .orderBy(asc(amalan.sort), asc(amalan.id))
      .all();
  });
}
