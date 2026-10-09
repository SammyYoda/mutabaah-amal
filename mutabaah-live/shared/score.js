// Shared scoring: imported by the server (dashboards) and the browser (score ring).
import { addDays, dateRange, weekStart, monthKey } from './dates.js';

/**
 * @typedef {'subuh'|'zohor'|'asar'|'maghrib'|'isya'} Prayer
 * @typedef {{ id: number, freq: 'harian'|'mingguan'|'bulanan', inputType: 'count'|'check'|'prayers',
 *   targetVal: number, createdOn: string, deactivatedOn: string|null }} Amalan
 * @typedef {{ date: string, values: Record<string, number|boolean|Record<Prayer, boolean>> }} Log
 */

export const PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isya'];

/** Active from createdOn (inclusive) until deactivatedOn (exclusive). @param {Amalan} a @param {string} date */
export function isActiveOn(a, date) {
  return a.createdOn <= date && (a.deactivatedOn == null || date < a.deactivatedOn);
}

/** @param {Amalan} a @param {any} raw @returns {number} */
export function dayValue(a, raw) {
  if (a.inputType === 'check') return raw === true ? 1 : 0;
  if (a.inputType === 'prayers') {
    if (!raw || typeof raw !== 'object') return 0;
    return PRAYERS.filter((p) => raw[p] === true).length;
  }
  return typeof raw === 'number' ? raw : 0;
}

/** @param {Amalan} a @param {any} raw @returns {boolean} */
export function isDayMet(a, raw) {
  if (a.inputType === 'check') return raw === true;
  return dayValue(a, raw) >= a.targetVal;
}

/** @param {Amalan} a @param {Log[]} logs @returns {number} */
export function periodValue(a, logs) {
  let total = 0;
  for (const l of logs) {
    const raw = l.values?.[String(a.id)];
    if (a.inputType === 'prayers') total += dayValue(a, raw) >= a.targetVal ? 1 : 0;
    else total += dayValue(a, raw); // count: sum; check: days ticked
  }
  return total;
}

/** @param {number} met @param {number} total */
const pct = (met, total) => (total === 0 ? 0 : Math.round((met / total) * 100));

/** @param {Amalan[]} amalan @param {Log|null} log @param {string} date */
export function dailyScore(amalan, log, date) {
  const items = amalan.filter((a) => a.freq === 'harian' && isActiveOn(a, date));
  const met = items.filter((a) => isDayMet(a, log?.values?.[String(a.id)])).length;
  return { met, total: items.length, percentage: pct(met, items.length) };
}

/**
 * @param {Amalan[]} amalan @param {Log[]} logs
 * @param {{ from: string, to: string, today: string, joinedOn: string }} opts
 */
export function periodScore(amalan, logs, { from, to, today, joinedOn }) {
  const start = from > joinedOn ? from : joinedOn;
  const end = to < today ? to : today;
  if (start > end) return { met: 0, expected: 0, percentage: 0 };

  const byDate = new Map(logs.map((l) => [l.date, l]));
  const days = dateRange(start, end);
  let met = 0;
  let expected = 0;

  for (const d of days) {
    const log = byDate.get(d);
    for (const a of amalan) {
      if (a.freq !== 'harian' || !isActiveOn(a, d)) continue;
      expected++;
      if (isDayMet(a, log?.values?.[String(a.id)])) met++;
    }
  }

  const monthBounds = (d) => {
    const first = `${monthKey(d)}-01`;
    const [y, m] = first.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return [first, addDays(next, -1)];
  };
  const weekBounds = (d) => [weekStart(d), addDays(weekStart(d), 6)];

  // Weekly/monthly periods are judged whole: every period overlapping
  // [start, end], evaluated over its full days clipped only to [joinedOn, today].
  const scorePeriods = (freq, keyOf, boundsOf) => {
    const seen = new Set();
    for (const d of days) {
      const k = keyOf(d);
      if (seen.has(k)) continue;
      seen.add(k);
      const [pFirst, pLast] = boundsOf(d);
      const evalFrom = pFirst > joinedOn ? pFirst : joinedOn;
      const evalTo = pLast < today ? pLast : today;
      const evalDays = dateRange(evalFrom, evalTo);
      if (evalDays.length === 0) continue;
      const lastEval = evalDays[evalDays.length - 1];
      const pLogs = evalDays.map((x) => byDate.get(x)).filter(Boolean);
      const completed = pLast < today;
      const fullyJoined = pFirst >= joinedOn;
      for (const a of amalan) {
        if (a.freq !== freq || !isActiveOn(a, lastEval)) continue;
        if (periodValue(a, pLogs) >= a.targetVal) {
          met++;
          expected++;
        } else if (completed && fullyJoined) {
          expected++;
        }
      }
    }
  };
  scorePeriods('mingguan', weekStart, weekBounds);
  scorePeriods('bulanan', monthKey, monthBounds);

  return { met, expected, percentage: pct(met, expected) };
}

/** @param {number} percentage */
export function statusBand(percentage) {
  if (percentage >= 80) return { level: 'A', label: 'Teguh (Level A)' };
  if (percentage >= 60) return { level: 'B', label: 'Sederhana (Level B)' };
  return { level: 'C', label: 'Perlu Perhatian (Level C)' };
}
