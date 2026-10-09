import type { FastifyInstance } from 'fastify';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { notifications } from '../db/schema.js';
import { requireUser } from '../auth/guards.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/notifications', { preHandler: requireUser }, async (req) => {
    const rows = app.db.select().from(notifications).where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(50).all();
    return rows.map((n) => ({ id: n.id, type: n.type, text: n.text, link: n.link, createdAt: n.createdAt.toISOString(), read: n.readAt !== null }));
  });

  app.post('/notifications/read-all', { preHandler: requireUser }, async (req, reply) => {
    app.db.update(notifications).set({ readAt: app.now() })
      .where(and(eq(notifications.userId, req.user.id), isNull(notifications.readAt))).run();
    return reply.status(204).send();
  });
}
