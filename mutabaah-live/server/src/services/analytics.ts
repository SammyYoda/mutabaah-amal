import { addDays, dateRange, isoWeekKey, weekStart } from '../../../shared/dates.js';
import { dailyScore, periodScore, statusBand, PRAYERS } from '../../../shared/score.js';
import { toScoreAmalan, toScoreLogs, type AmalanRow, type LogRow } from './loadScoring.js';

type SA = ReturnType<typeof toScoreAmalan>;
type SL = ReturnType<typeof toScoreLogs>;

export const initialsOf = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => Array.from(w)[0]!.toUpperCase()).join('');

const mean = (xs: number[]) => (xs.length === 0 ? 0 : Math.round(xs.reduce((s, x) => s + x, 0) / xs.length));

/** A log row is a real entry if any value is set (count > 0, check true, any prayer true) or it has notes (M-4). */
export function hasEntry(row: Pick<LogRow, 'values' | 'notes'>): boolean {
  if (typeof row.notes === 'string' && row.notes.trim() !== '') return true;
  const values = row.values && typeof row.values === 'object' ? Object.values(row.values as Record<string, unknown>) : [];
  return values.some((v) =>
    typeof v === 'number' ? v > 0 : v === true ? true : !!v && typeof v === 'object' && PRAYERS.some((p) => (v as Record<string, unknown>)[p] === true),
  );
}

export type MemberCtx = { today: string; joinedOn: string; amalan: SA[]; logs: SL };

export function windows(today: string) {
  const ws = weekStart(today);
  return {
    last4w: { from: addDays(ws, -21), to: today },
    thisWeek: { from: ws, to: today },
    prev4w: { from: addDays(ws, -28), to: addDays(ws, -1) },
  };
}

export function scoreOver(ctx: MemberCtx, from: string, to: string, items: SA[] = ctx.amalan) {
  return periodScore(items, ctx.logs, { from, to, today: ctx.today, joinedOn: ctx.joinedOn });
}

export function statusOf(ctx: MemberCtx) {
  const w = windows(ctx.today);
  const r = scoreOver(ctx, w.last4w.from, w.last4w.to);
  if (r.expected === 0) return { percentage: 0, level: null as string | null, label: 'Baru' };
  return { percentage: r.percentage, ...statusBand(r.percentage) };
}

/** N weekly points, oldest first; the current week is clipped to today. expected 0 = no data yet (e.g. before joining). */
export function weeklySeries(ctx: MemberCtx, n: number) {
  const ws = weekStart(ctx.today);
  const out: { week: string; start: string; percentage: number; expected: number }[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const start = addDays(ws, -7 * k);
    const end = addDays(start, 6) < ctx.today ? addDays(start, 6) : ctx.today;
    const r = scoreOver(ctx, start, end);
    out.push({ week: isoWeekKey(start), start, percentage: r.percentage, expected: r.expected });
  }
  return out;
}

/** 60 KL days ending today, oldest first; days before joining have percentage null. */
export function heatmap(ctx: MemberCtx, days = 60) {
  const byDate = new Map(ctx.logs.map((l) => [l.date, l]));
  return dateRange(addDays(ctx.today, -(days - 1)), ctx.today).map((date) => ({
    date,
    percentage: date < ctx.joinedOn ? null : dailyScore(ctx.amalan, byDate.get(date) ?? null, date).percentage,
  }));
}

/** One entry per amalan active today, scored over the last 4 ISO weeks. */
export function byCategory(ctx: MemberCtx, rows: AmalanRow[]) {
  const w = windows(ctx.today);
  return rows
    .filter((a) => a.createdOn <= ctx.today && (a.deactivatedOn == null || ctx.today < a.deactivatedOn))
    .map((a) => {
      const s = scoreOver(ctx, w.last4w.from, w.last4w.to, [toScoreAmalan(a)]);
      return { amalanId: a.id, name: a.name, met: s.met, expected: s.expected, percentage: s.percentage };
    });
}

export type Alert = { memberId: number; name: string; kind: 'no_log_3d' | 'drop' | 'level_c'; text: string };

export type RosterEntry = {
  id: number; name: string; initials: string; percentage4w: number; level: string | null; lastLogDate: string | null;
  baru: boolean; thisWeek: number; thisWeekExpected: number; prev4w: { expected: number; percentage: number }; loggedToday: boolean; prayerPct: number; joinedOn: string;
};

/** Everything the summary needs about one member, from already-loaded data. */
export function memberMetrics(id: number, name: string, ctx: MemberCtx, logRows: LogRow[]): RosterEntry {
  const w = windows(ctx.today);
  const r4 = scoreOver(ctx, w.last4w.from, w.last4w.to);
  const p4 = r4.percentage;
  const tw = scoreOver(ctx, w.thisWeek.from, w.thisWeek.to);
  const prev = scoreOver(ctx, w.prev4w.from, w.prev4w.to);
  const prayers = ctx.amalan.filter((a) => a.inputType === 'prayers');
  const dayStart = w.last4w.from > ctx.joinedOn ? w.last4w.from : ctx.joinedOn;
  const days = dayStart > ctx.today ? 0 : dateRange(dayStart, ctx.today).length;
  let trueCount = 0;
  if (prayers.length > 0) {
    for (const l of logRows) {
      if (l.date < dayStart || l.date > ctx.today) continue;
      for (const a of prayers) {
        const raw = (l.values as any)?.[String(a.id)];
        if (raw && typeof raw === 'object') trueCount += PRAYERS.filter((p) => raw[p] === true).length;
      }
    }
  }
  return {
    id, name, initials: initialsOf(name), percentage4w: p4, level: r4.expected === 0 ? null : statusBand(p4).level,
    baru: r4.expected === 0,
    lastLogDate: null, // filled in by the route (all-time max)
    thisWeek: tw.percentage,
    thisWeekExpected: tw.expected,
    prev4w: { expected: prev.expected, percentage: prev.percentage },
    loggedToday: logRows.some((l) => l.date === ctx.today && hasEntry(l)),
    prayerPct: days > 0 && prayers.length > 0 ? (trueCount / (5 * days)) * 100 : 0,
    joinedOn: ctx.joinedOn,
  };
}

export function buildKpis(roster: RosterEntry[]) {
  return {
    avg4w: mean(roster.filter((m) => !m.baru).map((m) => m.percentage4w)),
    avgThisWeek: mean(roster.filter((m) => m.thisWeekExpected > 0).map((m) => m.thisWeek)),
    loggedToday: roster.filter((m) => m.loggedToday).length,
    prayerAvg4w: mean(roster.map((m) => m.prayerPct)),
  };
}

export function buildAlerts(roster: RosterEntry[], logDatesByUser: Map<number, Set<string>>, today: string): Alert[] {
  const alerts: Alert[] = [];
  const recent = [today, addDays(today, -1), addDays(today, -2)];
  const cutoff = addDays(today, -3);
  for (const m of roster) {
    const dates = logDatesByUser.get(m.id) ?? new Set<string>();
    if (m.joinedOn <= cutoff && !recent.some((d) => dates.has(d))) {
      alerts.push({ memberId: m.id, name: m.name, kind: 'no_log_3d', text: `${m.name} tidak merekod amalan selama 3 hari` });
    }
    if (m.prev4w.expected >= 1 && m.thisWeekExpected > 0 && m.prev4w.percentage - m.thisWeek >= 20) {
      alerts.push({ memberId: m.id, name: m.name, kind: 'drop', text: `Skor ${m.name} minggu ini menurun ${m.prev4w.percentage - m.thisWeek} mata` });
    }
    if (!m.baru && m.level === 'C') {
      alerts.push({ memberId: m.id, name: m.name, kind: 'level_c', text: `${m.name} berada di Level C (Perlu Perhatian)` });
    }
  }
  return alerts;
}
