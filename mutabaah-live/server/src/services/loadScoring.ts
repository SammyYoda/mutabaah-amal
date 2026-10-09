import { and, asc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';
import { amalan, dailyLogs, memberships } from '../db/schema.js';
import type { Db } from '../db/client.js';
import { todayKL } from '../../../shared/dates.js';

export type AmalanRow = typeof amalan.$inferSelect;
export type LogRow = typeof dailyLogs.$inferSelect;
/** Shape consumed by shared/score.js. */
export type ScoreLog = { date: string; values: Record<string, any> };

/**
 * Loads everything the scoring code needs with a constant number of queries:
 * the usrah's amalan (all, incl. deactivated), the users' logs in this usrah within [from, to],
 * and each user's active-membership join date (KL).
 */
export function loadScoring(db: Db, usrahId: number, userIds: number[], from: string, to: string) {
  const amalanRows = db.select().from(amalan).where(eq(amalan.usrahId, usrahId)).orderBy(asc(amalan.sort), asc(amalan.id)).all();
  const logsByUser = new Map<number, LogRow[]>();
  const joinedOnByUser = new Map<number, string>();
  for (const id of userIds) logsByUser.set(id, []);
  if (userIds.length === 0) return { amalan: amalanRows, logsByUser, joinedOnByUser };

  const logs = db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.usrahId, usrahId), inArray(dailyLogs.userId, userIds), gte(dailyLogs.date, from), lte(dailyLogs.date, to)))
    .orderBy(asc(dailyLogs.date))
    .all();
  for (const l of logs) logsByUser.get(l.userId)?.push(l);

  const ms = db
    .select({ userId: memberships.userId, joinedAt: memberships.joinedAt })
    .from(memberships)
    .where(and(eq(memberships.usrahId, usrahId), inArray(memberships.userId, userIds), isNull(memberships.removedAt)))
    .all();
  for (const m of ms) joinedOnByUser.set(m.userId, todayKL(m.joinedAt));
  return { amalan: amalanRows, logsByUser, joinedOnByUser };
}

export const toScoreAmalan = (a: AmalanRow) => ({
  id: a.id,
  freq: a.freq,
  inputType: a.inputType,
  targetVal: a.targetVal,
  createdOn: a.createdOn,
  deactivatedOn: a.deactivatedOn,
});

export const toScoreLogs = (rows: LogRow[]): ScoreLog[] => rows.map((l) => ({ date: l.date, values: l.values as Record<string, any> }));
