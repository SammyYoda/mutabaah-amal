import type { FastifyInstance } from 'fastify';
import { and, eq, inArray, isNull, max, sql } from 'drizzle-orm';
import { z } from 'zod';
import { dailyLogs, memberships, usrah, users } from '../db/schema.js';
import { requireNaqib, requireUser } from '../auth/guards.js';
import { AppError, MESSAGES, zodFields } from '../errors.js';
import { usrahIdOf } from './amalan.js';
import { serializeLog } from './logs.js';
import { loadScoring, toScoreAmalan, toScoreLogs } from '../services/loadScoring.js';
import {
  buildAlerts, buildKpis, byCategory, heatmap, initialsOf, memberMetrics, scoreOver, statusOf, weeklySeries, windows,
  type MemberCtx,
} from '../services/analytics.js';
import { addDays, todayKL, weekStart } from '../../../shared/dates.js';

const WeeksQuery = (def: number) =>
  z.object({ weeks: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(12)).optional().default(def as any) });

/** Monthly periods are judged whole, so logs must be loaded back to the first of the earliest month. */
const loadFromOf = (from: string) => `${from.slice(0, 7)}-01`;

export async function analyticsRoutes(app: FastifyInstance) {
  function parseWeeks(query: unknown, def: number): number {
    const parsed = WeeksQuery(def).safeParse(query ?? {});
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(parsed.error));
    return Number(parsed.data.weeks);
  }

  /** Active role=member roster of a usrah (removed members excluded). */
  function memberRows(usrahId: number) {
    return app.db
      .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.usrahId, usrahId), eq(memberships.role, 'member'), isNull(memberships.removedAt)))
      .orderBy(users.name, users.id)
      .all();
  }

  app.get('/me/analytics', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    const weeks = parseWeeks(req.query, 8);
    const today = todayKL(app.now());
    const from = [addDays(today, -59), addDays(weekStart(today), -7 * (weeks - 1)), windows(today).last4w.from].sort()[0];
    const s = loadScoring(app.db, usrahId, [req.user.id], loadFromOf(from), today);
    const ctx: MemberCtx = {
      today,
      joinedOn: s.joinedOnByUser.get(req.user.id) ?? today,
      amalan: s.amalan.map(toScoreAmalan),
      logs: toScoreLogs(s.logsByUser.get(req.user.id) ?? []),
    };
    return { weekly: weeklySeries(ctx, weeks), heatmap: heatmap(ctx), byCategory: byCategory(ctx, s.amalan), status: statusOf(ctx) };
  });

  app.get('/usrah/summary', { preHandler: requireNaqib }, async (req) => {
    const usrahId = usrahIdOf(req);
    const today = todayKL(app.now());
    const w = windows(today);
    const u = app.db.select({ id: usrah.id, name: usrah.name }).from(usrah).where(eq(usrah.id, usrahId)).get();
    if (!u) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    const members = memberRows(usrahId);
    const ids = members.map((m) => m.id);
    const s = loadScoring(app.db, usrahId, ids, loadFromOf(w.prev4w.from), today);
    const lastLogs = ids.length
      ? app.db
          .select({ userId: dailyLogs.userId, last: max(dailyLogs.date) })
          .from(dailyLogs)
          .where(and(eq(dailyLogs.usrahId, usrahId), inArray(dailyLogs.userId, ids)))
          .groupBy(dailyLogs.userId)
          .all()
      : [];
    const lastByUser = new Map(lastLogs.map((r) => [r.userId, r.last]));
    const amalan = s.amalan.map(toScoreAmalan);
    const logDates = new Map<number, Set<string>>();
    const roster = members.map((m) => {
      const rows = s.logsByUser.get(m.id) ?? [];
      logDates.set(m.id, new Set(rows.map((r) => r.date)));
      const ctx: MemberCtx = { today, joinedOn: s.joinedOnByUser.get(m.id) ?? today, amalan, logs: toScoreLogs(rows) };
      return { ...memberMetrics(m.id, m.name, ctx, rows), lastLogDate: lastByUser.get(m.id) ?? null };
    });
    return {
      usrah: { id: u.id, name: u.name, memberCount: members.length },
      kpis: buildKpis(roster),
      roster: roster.map((m) => ({
        id: m.id, name: m.name, initials: m.initials, percentage4w: m.percentage4w, level: m.level, lastLogDate: m.lastLogDate,
      })),
      alerts: buildAlerts(roster, logDates, today),
    };
  });

  app.get('/usrah/matrix', { preHandler: requireNaqib }, async (req) => {
    const usrahId = usrahIdOf(req);
    const weeks = parseWeeks(req.query, 4);
    const today = todayKL(app.now());
    const from = addDays(weekStart(today), -7 * (weeks - 1));
    const members = memberRows(usrahId);
    const s = loadScoring(app.db, usrahId, members.map((m) => m.id), loadFromOf(from), today);
    const active = s.amalan.filter((a) => a.createdOn <= today && (a.deactivatedOn == null || today < a.deactivatedOn));
    const activeScore = active.map(toScoreAmalan);
    const all = s.amalan.map(toScoreAmalan);
    return {
      amalan: active.map((a) => ({ id: a.id, code: a.code, name: a.name })),
      rows: members.map((m) => {
        const ctx: MemberCtx = { today, joinedOn: s.joinedOnByUser.get(m.id) ?? today, amalan: all, logs: toScoreLogs(s.logsByUser.get(m.id) ?? []) };
        const cells: Record<string, number> = {};
        for (const a of activeScore) {
          const r = scoreOver(ctx, from, today, [a]);
          if (r.expected > 0) cells[String(a.id)] = r.percentage;
        }
        return { memberId: m.id, name: m.name, cells, average: scoreOver(ctx, from, today, activeScore).percentage };
      }),
    };
  });

  app.get('/members/:id', { preHandler: requireNaqib }, async (req) => {
    const usrahId = usrahIdOf(req);
    const rawId = (req.params as { id: string }).id;
    const id = /^\d{1,15}$/.test(rawId) ? Number(rawId) : NaN;
    const member = Number.isNaN(id) ? undefined : memberRows(usrahId).find((m) => m.id === id);
    if (!member) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
    const today = todayKL(app.now());
    const from = addDays(weekStart(today), -49);
    const s = loadScoring(app.db, usrahId, [id], loadFromOf(from), today);
    const rows = s.logsByUser.get(id) ?? [];
    const ctx: MemberCtx = { today, joinedOn: s.joinedOnByUser.get(id) ?? today, amalan: s.amalan.map(toScoreAmalan), logs: toScoreLogs(rows) };
    const recentFrom = addDays(today, -13);
    return {
      member: { id, name: member.name, email: member.email, phone: member.phone, initials: initialsOf(member.name), joinedOn: ctx.joinedOn },
      status: statusOf(ctx),
      weekly: weeklySeries(ctx, 8),
      recentLogs: rows.filter((l) => l.date >= recentFrom && l.date <= today).map(serializeLog),
      guidance: [],
    };
  });
}
