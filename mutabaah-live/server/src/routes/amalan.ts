import type { FastifyInstance } from 'fastify';
import { and, eq, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { amalan, dailyLogs } from '../db/schema.js';
import { requireUser, requireNaqib } from '../auth/guards.js';
import { AppError, MESSAGES, zodFields } from '../errors.js';
import { todayKL } from '../../../shared/dates.js';

type AmalanRow = typeof amalan.$inferSelect;
/** The public shape of an amalan item (GET /api/amalan, POST/PATCH/DELETE responses). */
export function serializeAmalan(r: AmalanRow) {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    freq: r.freq,
    inputType: r.inputType,
    targetVal: r.targetVal,
    unit: r.unit,
    icon: r.icon,
    sort: r.sort,
    active: r.active,
    createdOn: r.createdOn,
    deactivatedOn: r.deactivatedOn,
  };
}

export const INPUT_TYPE_LOCKED = 'Jenis input tidak boleh diubah kerana sudah ada rekod';
export const FREQ_LOCKED = 'Kekerapan tidak boleh diubah kerana sudah ada rekod';
const PRAYERS_TARGET = 'Sasaran solat mesti antara 1 dan 5';

/** 'prayers' items count prayed waktu (max 5), so their target must be 1-5 (M-2). */
function checkPrayersTarget(inputType: string, targetVal: number) {
  if (inputType === 'prayers' && (targetVal < 1 || targetVal > 5)) {
    throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, { targetVal: PRAYERS_TARGET });
  }
}

const Fields = {
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  freq: z.enum(['harian', 'mingguan', 'bulanan']),
  inputType: z.enum(['count', 'check', 'prayers']),
  targetVal: z.number().int().min(1).max(100000),
  unit: z.string().trim().min(1).max(50),
  icon: z.string().trim().min(1).max(50),
  sort: z.number().int().min(0).max(100000),
};
const CreateBody = z
  .object({ ...Fields, code: Fields.code.optional(), description: Fields.description.optional(), icon: Fields.icon.optional(), sort: Fields.sort.optional() })
  .strict();
const PatchBody = z.object({ ...Fields, active: z.boolean() }).partial().strict();

function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new AppError(400, 'VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(r.error));
  return r.data;
}

/** The usrah's amalan row for a path id, or 404 (also for other usrahs' ids). */
function findOwn(app: FastifyInstance, usrahId: number, rawId: string): AmalanRow {
  const id = /^\d{1,15}$/.test(rawId) ? Number(rawId) : NaN;
  const row = Number.isNaN(id)
    ? undefined
    : app.db.select().from(amalan).where(and(eq(amalan.id, id), eq(amalan.usrahId, usrahId))).get();
  if (!row) throw new AppError(404, 'NOT_FOUND', MESSAGES.NOT_FOUND);
  return row;
}

/** The caller's usrah id (from their active membership); admins without one get 403. */
export function usrahIdOf(req: { membership: { usrahId: number } | null }): number {
  if (!req.membership) throw new AppError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
  return req.membership.usrahId;
}

export const ALREADY_ACTIVE = 'Amalan ini sudah aktif';

/**
 * Re-activation (R31): the deactivated row keeps its [createdOn, deactivatedOn) window so past scores
 * never change; a NEW row (same code and fields, plus any fields in the same PATCH) starts today.
 */
function reactivate(app: FastifyInstance, existing: AmalanRow, changes: Partial<typeof amalan.$inferInsert>): AmalanRow {
  return app.db.transaction((tx) => {
    if (existing.code != null) {
      const live = tx
        .select({ id: amalan.id })
        .from(amalan)
        .where(and(eq(amalan.usrahId, existing.usrahId), eq(amalan.code, existing.code), eq(amalan.active, true)))
        .get();
      if (live) throw new AppError(409, 'CONFLICT', ALREADY_ACTIVE);
    }
    const { id: _id, ...copy } = existing;
    return tx
      .insert(amalan)
      .values({ ...copy, ...changes, active: true, createdOn: todayKL(app.now()), deactivatedOn: null })
      .returning()
      .get();
  });
}

export async function amalanRoutes(app: FastifyInstance) {
  app.get('/amalan', { preHandler: requireUser }, async (req) => {
    const usrahId = usrahIdOf(req);
    return app.db
      .select()
      .from(amalan)
      .where(eq(amalan.usrahId, usrahId))
      .orderBy(asc(amalan.sort), asc(amalan.id))
      .all()
      .map(serializeAmalan);
  });

  app.post('/amalan', { preHandler: requireNaqib }, async (req, reply) => {
    const usrahId = usrahIdOf(req);
    const b = parseBody(CreateBody, req.body);
    checkPrayersTarget(b.inputType, b.targetVal);
    const today = todayKL(app.now());
    const row = app.db.transaction((tx) => {
      const all = tx.select({ code: amalan.code, sort: amalan.sort }).from(amalan).where(eq(amalan.usrahId, usrahId)).all();
      const maxCode = all.reduce((m, a) => (a.code && /^\d+$/.test(a.code) ? Math.max(m, Number(a.code)) : m), 0);
      const maxSort = all.reduce((m, a) => Math.max(m, a.sort), -1);
      return tx
        .insert(amalan)
        .values({
          usrahId,
          code: b.code ?? String(maxCode + 1).padStart(2, '0'),
          name: b.name,
          description: b.description ?? '',
          freq: b.freq,
          inputType: b.inputType,
          targetVal: b.targetVal,
          unit: b.unit,
          icon: b.icon ?? 'check_circle',
          sort: b.sort ?? maxSort + 1,
          active: true,
          createdOn: today,
        })
        .returning()
        .get();
    });
    return reply.status(201).send(serializeAmalan(row));
  });

  app.patch('/amalan/:id', { preHandler: requireNaqib }, async (req) => {
    const usrahId = usrahIdOf(req);
    const existing = findOwn(app, usrahId, (req.params as { id: string }).id);
    const b = parseBody(PatchBody, req.body);
    if (b.inputType !== undefined || b.targetVal !== undefined) {
      checkPrayersTarget(b.inputType ?? existing.inputType, b.targetVal ?? existing.targetVal);
    }
    // Once any log holds a value for this amalan, its input type and frequency are fixed.
    const isUsed = () =>
      !!app.db
        .select({ id: dailyLogs.id })
        .from(dailyLogs)
        .where(and(eq(dailyLogs.usrahId, usrahId), sql`json_extract(${dailyLogs.values}, '$."' || ${String(existing.id)} || '"') IS NOT NULL`))
        .get();
    if (b.inputType !== undefined && b.inputType !== existing.inputType && isUsed()) throw new AppError(409, 'CONFLICT', INPUT_TYPE_LOCKED);
    if (b.freq !== undefined && b.freq !== existing.freq && isUsed()) throw new AppError(409, 'CONFLICT', FREQ_LOCKED);
    const { active, ...rest } = b;
    if (active === true && !existing.active) return serializeAmalan(reactivate(app, existing, rest));
    const set: Partial<typeof amalan.$inferInsert> = { ...rest };
    if (active === false && existing.active) {
      set.active = false;
      set.deactivatedOn = todayKL(app.now());
    }
    if (Object.keys(set).length === 0) return serializeAmalan(existing);
    return serializeAmalan(app.db.update(amalan).set(set).where(eq(amalan.id, existing.id)).returning().get());
  });

  app.delete('/amalan/:id', { preHandler: requireNaqib }, async (req) => {
    const existing = findOwn(app, usrahIdOf(req), (req.params as { id: string }).id);
    if (!existing.active) return serializeAmalan(existing);
    return serializeAmalan(
      app.db.update(amalan).set({ active: false, deactivatedOn: todayKL(app.now()) }).where(eq(amalan.id, existing.id)).returning().get(),
    );
  });
}
