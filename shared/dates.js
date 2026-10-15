// KL date helpers. Dates are 'YYYY-MM-DD' strings; arithmetic uses Date.UTC
// so the host timezone never matters.

export const TZ = 'Asia/Kuala_Lumpur';

const DAY_MS = 86400000;

/** @param {string} date @returns {number} UTC midnight ms */
function toMs(date) {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** @param {number} ms @returns {string} */
function fromMs(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's date in Kuala Lumpur. @param {Date} [now] @returns {string} */
export function todayKL(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** @param {string} date @param {number} n @returns {string} */
export function addDays(date, n) {
  return fromMs(toMs(date) + n * DAY_MS);
}

/** Inclusive range; [] when from > to. @param {string} from @param {string} to @returns {string[]} */
export function dateRange(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Monday of the ISO week containing date. @param {string} date @returns {string} */
export function weekStart(date) {
  const dow = (new Date(toMs(date)).getUTCDay() + 6) % 7; // Mon=0
  return addDays(date, -dow);
}

/** ISO week key, e.g. '2026-W41'. @param {string} date @returns {string} */
export function isoWeekKey(date) {
  const thursday = addDays(weekStart(date), 3);
  const year = Number(thursday.slice(0, 4));
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((toMs(thursday) - jan1) / DAY_MS / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** @param {string} date @returns {string} e.g. '2026-10' */
export function monthKey(date) {
  return date.slice(0, 7);
}

/**
 * Log edit window: date <= today, and either the same month as today or the
 * previous month while today's day-of-month <= 7.
 * @param {string} date @param {string} today @returns {boolean}
 */
export function isEditableDate(date, today) {
  if (date > today) return false;
  if (monthKey(date) === monthKey(today)) return true;
  const day = Number(today.slice(8, 10));
  if (day > 7) return false;
  const prevMonthLast = addDays(`${monthKey(today)}-01`, -1);
  return monthKey(date) === monthKey(prevMonthLast);
}
