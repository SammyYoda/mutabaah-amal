import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { guidance, guidanceReads, guidanceReplies, memberships, users } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { requireNaqib, requireUser } from '../auth/guards.js';
import { AppError, MESSAGES, zodFields } from '../errors.js';
import { usrahIdOf } from './amalan.js';
import { notify } from '../services/notify.js';

export const GUIDANCE_CATEGORIES = ['peribadi', 'tilawah', 'qiamullail', 'riadah'] as const;

const createSchema = z.strictObject({
  toUserId: z.number().int().positive().nullable(),
  category: z.enum(GUIDANCE_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  reference: z.string().trim().max(500).nullish(),
});
const replySchema = z.strictObject({ body: z.string().trim().min(1).max(2000) });

type GuidanceRow = typeof guidance.$inferSelect;

export type GuidanceItem = {
  id: number; category: string; title: string; body: string; reference: string | null;
  toUserId: number | null; toName: string | null; fromName: string; createdAt: string; read: boolean;
  replies: { id: number; userName: string; body: string; createdAt: string }[];
};

/** Serializes guidance rows in a constant number of queries. Rows keep their given order. */
export function serializeGuidance(db: Db, rows: GuidanceRow[], viewerId: number): GuidanceItem[] {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const replies = db.select().from(guidanceReplies).where(inArray(guidanceReplies.guidanceId, ids)).all()
    .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime() || x.id - y.id);
  const reads = new Set(
    db.select().from(guidanceReads)
      .where(and(inArray(guidanceReads.guidanceId, ids), eq(guidanceReads.userId, viewerId))).all().map((r) => r.guidanceId),
  );
  const userIds = [...new Set([...rows.flatMap((r) => [r.fromUserId, r.toUserId]), ...replies.map((r) => r.userId)].filter((x): x is number => x != null))];
  const names = new Map(db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)).all().map((u) => [u.id, u.name]));
  const repliesBy = new Map<number, GuidanceItem['replies']>();
  for (const r of replies) {
    const list = repliesBy.get(r.guidanceId) ?? [];
    list.push({ id: r.id, userName: names.get(r.userId) ?? '', body: r.body, createdAt: r.createdAt.toISOString() });
    repliesBy.set(r.guidanceId, list);
  }
  return rows.map((r) => ({
    id: r.id, category: r.category, title: r.title, body: r.body, reference: r.reference,
    toUserId: r.toUserId, toName: r.toUserId == null ? null : (names.get(r.toUserId) ?? null),
    fromName: names.get(r.fromUserId) ?? '', createdAt: r.createdAt.toISOString(),
    read: reads.has(r.id) || r.fromUserId === viewerId, replies: repliesBy.get(r.id) ?? [],
  }));
}

export async function guidanceRoutes(app: FastifyInstance): Promise<void> {
  const db = app.db;
  const notFound = () => new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
  const activeMembers = (usrahId: number, role: 'naqib' | 'member') =>
    db.select({ id: memberships.userId }).from(memberships)
      .where(and(eq(memberships.usrahId, usrahId), eq(memberships.role, role), isNull(memberships.removedAt))).all().map((m) => m.id);

  /** Item visible to caller in their current usrah, else 404. */
  function visibleItem(req: { user: { id: number }; membership: { usrahId: number; role: 'naqib' | 'member' } | null }, rawId: string): GuidanceRow {
    const usrahId = usrahIdOf(req as any);
    const id = /^\d{1,15}$/.test(rawId) ? Number(rawId) : NaN;
    const item = Number.isNaN(id) ? undefined : db.select().from(guidance).where(and(eq(guidance.id, id), eq(guidance.usrahId, usrahId))).get();
    if (!item) throw notFound();
    if (req.membership!.role !== 'naqib' && item.toUserId !== null && item.toUserId !== req.user.id) throw notFound();
    return item;
  }

  app.get('/guidance', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    const scope = req.membership!.role === 'naqib'
      ? eq(guidance.usrahId, usrahId)
      : and(eq(guidance.usrahId, usrahId), or(isNull(guidance.toUserId), eq(guidance.toUserId, req.user.id)));
    const rows = db.select().from(guidance).where(scope).orderBy(desc(guidance.createdAt), desc(guidance.id)).all();
    return serializeGuidance(db, rows, req.user.id);
  });

  app.post('/guidance', { preHandler: requireNaqib }, async (req, reply) => {
    const usrahId = usrahIdOf(req);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(parsed.error));
    const d = parsed.data;
    if (d.toUserId !== null) {
      if (!activeMembers(usrahId, 'member').includes(d.toUserId)) throw notFound();
    }
    const now = app.now();
    const row = db.transaction((tx) => {
      const created = tx.insert(guidance).values({
        usrahId, fromUserId: req.user.id, toUserId: d.toUserId, category: d.category, title: d.title,
        body: d.body, reference: d.reference || null, createdAt: now,
      }).returning().get();
      const recipients = d.toUserId !== null ? [d.toUserId] : activeMembers(usrahId, 'member');
      for (const uid of recipients) notify(tx as unknown as Db, uid, 'guidance', `Bimbingan baharu: ${d.title}`, '#bimbingan', now);
      return created;
    });
    return reply.status(201).send(serializeGuidance(db, [row], req.user.id)[0]);
  });

  app.post('/guidance/:id/replies', { preHandler: requireUser }, async (req, reply) => {
    const usrahId = usrahIdOf(req);
    const item = visibleItem(req, (req.params as { id: string }).id);
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(parsed.error));
    const now = app.now();
    const isNaqib = req.membership!.role === 'naqib';
    const row = db.transaction((tx) => {
      const created = tx.insert(guidanceReplies).values({ guidanceId: item.id, userId: req.user.id, body: parsed.data.body, createdAt: now }).returning().get();
      const recipients = isNaqib ? (item.toUserId !== null ? [item.toUserId] : activeMembers(usrahId, 'member')) : activeMembers(usrahId, 'naqib');
      for (const uid of recipients.filter((u) => u !== req.user.id)) {
        notify(tx as unknown as Db, uid, 'guidance_reply', `${req.user.name} membalas bimbingan: ${item.title}`, '#bimbingan', now);
      }
      return created;
    });
    return reply.status(201).send({ id: row.id, userName: req.user.name, body: row.body, createdAt: row.createdAt.toISOString() });
  });

  app.post('/guidance/:id/read', { preHandler: requireUser }, async (req, reply) => {
    const item = visibleItem(req, (req.params as { id: string }).id);
    db.insert(guidanceReads).values({ guidanceId: item.id, userId: req.user.id, readAt: app.now() }).onConflictDoNothing().run();
    return reply.status(204).send();
  });
}
