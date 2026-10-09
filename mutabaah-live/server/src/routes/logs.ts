import type { FastifyInstance } from 'fastify';
import { and, asc, eq, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { amalan, dailyLogs } from '../db/schema.js';
import { requireUser } from '../auth/guards.js';
import { AppError, MESSAGES, zodFields } from '../errors.js';
import { usrahIdOf } from './amalan.js';
import { PRAYERS } from '../../../shared/score.js';
import { addDays, isEditableDate, todayKL } from '../../../shared/dates.js';

export const LOG_LOCKED_MESSAGE = 'Log bulan ini sudah dikunci';
const MAX_SPAN_DAYS = 400;

/** True for a real calendar date written YYYY-MM-DD (2026-02-30 is not). */
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === s;
}

/** First editable date: previous month's 1st while day-of-month <= 7, else this month's 1st. */
export function editableFromOf(today: string): string {
  const first = `${today.slice(0, 7)}-01`;
  if (Number(today.slice(8, 10)) > 7) return first;
  return `${addDays(first, -1).slice(0, 7)}-01`;
}

const PrayersSchema = z
  .object(Object.fromEntries((PRAYERS as string[]).map((p) => [p, z.boolean()])) as Record<string, z.ZodBoolean>)
  .strict();

type AmalanLite = { id: number; inputType: 'count' | 'check' | 'prayers' };

/** Zod schema for a `values` object, built from the usrah's amalan (all of them, incl. deactivated). Keys are string ids. */
export function buildValuesSchema(items: AmalanLite[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const a of items) {
    shape[String(a.id)] =
      a.inputType === 'count' ? z.number().int().min(0).max(100000)
      : a.inputType === 'check' ? z.boolean()
      : PrayersSchema;
  }
  return z.object(shape).partial().strict();
}

type LogRow = typeof dailyLogs.$inferSelect;
export function serializeLog(row: LogRow) {
  return { date: row.date, values: row.values, notes: row.notes, updatedAt: row.updatedAt.toISOString() };
}

const DateParam = z.string();
const Query = z.object({ from: z.string(), to: z.string() });
const Body = z
  .object({ values: z.record(z.string(), z.unknown()).optional(), notes: z.string().max(2000).optional() })
  .refine((b) => b.values !== undefined || b.notes !== undefined, { message: 'values atau notes diperlukan' });

export async function logRoutes(app: FastifyInstance) {
  app.get('/logs', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(parsed.error));
    const { from, to } = parsed.data;
    const fields: Record<string, string> = {};
    if (!isRealDate(from)) fields.from = 'Tarikh tidak sah';
    if (!isRealDate(to)) fields.to = 'Tarikh tidak sah';
    if (Object.keys(fields).length) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, fields);
    if (from > to) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, { from: 'Tarikh mula selepas tarikh akhir' });
    if (addDays(from, MAX_SPAN_DAYS - 1) < to) {
      throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, { to: 'Julat terlalu panjang' });
    }
    const rows = app.db
      .select()
      .from(dailyLogs)
      .where(and(eq(dailyLogs.userId, req.user.id), eq(dailyLogs.usrahId, usrahId), gte(dailyLogs.date, from), lte(dailyLogs.date, to)))
      .orderBy(asc(dailyLogs.date))
      .all();
    const today = todayKL(app.now());
    return { logs: rows.map(serializeLog), today, editableFrom: editableFromOf(today) };
  });

  app.put('/logs/:date', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    const date = DateParam.parse((req.params as { date: string }).date);
    if (!isRealDate(date)) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, { date: 'Tarikh tidak sah' });
    const now = app.now();
    if (!isEditableDate(date, todayKL(now))) throw new AppError(403, 'LOG_LOCKED', LOG_LOCKED_MESSAGE);

    const parsed = Body.safeParse(req.body ?? {});
    if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(parsed.error));
    const body = parsed.data;

    const items = app.db
      .select({ id: amalan.id, inputType: amalan.inputType })
      .from(amalan)
      .where(eq(amalan.usrahId, usrahId))
      .all();
    let incoming: Record<string, unknown> = {};
    if (body.values !== undefined) {
      const known = new Set(items.map((a) => String(a.id)));
      const unknown = Object.keys(body.values).find((k) => !known.has(k));
      if (unknown !== undefined) {
        throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, { [`values.${unknown}`]: 'Amalan tidak dikenali' });
      }
      const v = buildValuesSchema(items).safeParse(body.values);
      if (!v.success) {
        const fields: Record<string, string> = {};
        for (const [k, msg] of Object.entries(zodFields(v.error))) fields[`values.${k}`] = msg;
        throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, fields);
      }
      incoming = v.data as Record<string, unknown>;
    }

    const saved = app.db.transaction((tx) => {
      const existing = tx
        .select()
        .from(dailyLogs)
        .where(and(eq(dailyLogs.userId, req.user.id), eq(dailyLogs.date, date)))
        .get();
      const values = { ...(existing?.values ?? {}), ...incoming };
      const notes = body.notes !== undefined ? body.notes : (existing?.notes ?? null);
      if (existing) {
        return tx
          .update(dailyLogs)
          .set({ values, notes, updatedAt: now, usrahId })
          .where(eq(dailyLogs.id, existing.id))
          .returning()
          .get();
      }
      return tx.insert(dailyLogs).values({ userId: req.user.id, usrahId, date, values, notes, updatedAt: now }).returning().get();
    });
    return serializeLog(saved);
  });
}
