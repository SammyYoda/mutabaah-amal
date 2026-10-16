/**
 * View: Ahli - Hari Ini (daily Mutaba'ah tracker).
 *
 * Renders the usrah's own amalan list (cards by inputType: count → stepper, check → toggle,
 * prayers → five-prayer row), grouped by freq, for `activeDate` (`#hari-ini?tarikh=YYYY-MM-DD`,
 * default: the server's today). Changes update the page at once and are saved with a debounced
 * PUT /api/logs/:date carrying only the changed keys. Days before the server's `editableFrom`
 * are read-only.
 *
 * Every API string (amalan name/description/unit/icon, user/usrah names) goes through escapeHtml;
 * notes are set on the textarea via `.value`.
 */

import { getAmalan, getLogs, saveLog } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml } from '../util.js';
import { TZ, todayKL, addDays, dateRange, weekStart, monthKey } from '@shared/dates.js';
import { PRAYERS, dailyScore, dayValue, isActiveOn, isDayMet, periodValue } from '@shared/score.js';
import { createSaveQueue } from './hariIni/saveQueue.js';

const DAY_SHORT = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
const DAY_FULL = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
const PRAYER_LABELS = { subuh: 'Subuh', zohor: 'Zohor', asar: 'Asar', maghrib: 'Maghrib', isya: "Isya'" };
const SAVE_FAILED = 'Gagal disimpan — cuba lagi';
const RESTORED = 'Perubahan belum disimpan dipulihkan';
const LOG_LOCKED_MESSAGE = 'Log bulan ini sudah dikunci'; // same text as the server's 403 LOG_LOCKED
const SAVE_DELAY_MS = 800;
const RING = 125.6; // circumference of the r=20 progress rings

const GROUPS = [
  { freq: 'harian', no: 1, title: 'Amalan Harian', icon: 'wb_sunny', subtitle: 'Tunjang istiqamah harian peribadi muslim', badge: 'Sasaran Yaumi' },
  { freq: 'mingguan', no: 2, title: 'Amalan Mingguan', icon: 'date_range', subtitle: 'Kemajuan kumulatif minggu ini (Isnin – Ahad)', badge: 'Kitaran Mingguan' },
  { freq: 'bulanan', no: 3, title: 'Amalan Bulanan', icon: 'event_repeat', subtitle: 'Kemajuan kumulatif bulan ini', badge: 'Sasaran Bulanan' },
];

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** @param {unknown} s */
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
const dow = (d) => new Date(`${d}T00:00:00Z`).getUTCDay();
const dayNum = (d) => Number(d.slice(8, 10));
const monthName = (d) => MONTHS[Number(d.slice(5, 7)) - 1];
const minDate = (a, b) => (a < b ? a : b);
const maxDate = (a, b) => (a > b ? a : b);

/** Last day of date's month. @param {string} d */
function monthEnd(d) {
  const next = monthKey(addDays(`${monthKey(d)}-28`, 4));
  return addDays(`${next}-01`, -1);
}

/**
 * Logs needed to show activeDate: its ISO week (strip + mingguan progress) and its month (bulanan
 * progress), capped at today.
 * @param {string} activeDate @param {string} today
 */
export function rangeFor(activeDate, today) {
  const ws = weekStart(activeDate);
  const from = minDate(ws, `${monthKey(activeDate)}-01`);
  const end = maxDate(addDays(ws, 6), monthEnd(activeDate));
  return { from, to: minDate(end, today) };
}

/** 'HH:MM' in Kuala Lumpur. @param {string} [iso] */
function clockKL(iso) {
  const d = iso ? new Date(iso) : new Date();
  const when = Number.isNaN(d.getTime()) ? new Date() : d;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(when);
}

// ---------------------------------------------------------------------------
// Unsaved edits kept in localStorage after a failed leave (R32)
// ---------------------------------------------------------------------------

/** @param {unknown} userId @param {string} date */
export const pendingKey = (userId, date) => `mutabaah:pending:${userId}:${date}`;

/** @param {string} key @returns {{ values: Record<string, unknown>, notes?: string } | null} */
function readPending(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const p = JSON.parse(raw);
    const ok = p && typeof p === 'object' && p.values && typeof p.values === 'object' && !Array.isArray(p.values) &&
      (p.notes === undefined || typeof p.notes === 'string');
    if (!ok) throw new Error('bad pending entry');
    return p.notes === undefined ? { values: p.values } : { values: p.values, notes: p.notes };
  } catch {
    removePending(key);
    return null;
  }
}

/** @param {string} key @param {{ values: Record<string, unknown>, notes?: string }} snap */
function writePending(key, snap) {
  if (!Object.keys(snap.values).length && snap.notes === undefined) return removePending(key);
  try {
    localStorage.setItem(key, JSON.stringify(snap));
  } catch {
    /* storage full or blocked: nothing more we can do */
  }
}

/** @param {string} key */
function removePending(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/**
 * @param {URLSearchParams} params
 * @returns {Promise<{ amalan: any[], logs: any[], today: string, editableFrom: string, activeDate: string,
 *   explicitDate: boolean, restored: { values: Record<string, unknown>, notes?: string } | null, droppedLocked: boolean }>}
 */
async function load(params) {
  const tarikh = params.get('tarikh');
  const wanted = isDate(tarikh) ? /** @type {string} */ (tarikh) : null;
  // The browser clock is only a guess for the first request; today/editableFrom come from the server.
  const guessToday = todayKL();
  const guessActive = wanted ?? guessToday;
  const guess = rangeFor(guessActive, maxDate(guessActive, guessToday));
  const [amalan, first] = await Promise.all([getAmalan(), getLogs(guess.from, guess.to)]);
  const { today, editableFrom } = first;
  const activeDate = wanted && wanted <= today ? wanted : today;
  const need = rangeFor(activeDate, today);
  let logs = first.logs;
  if (need.from < guess.from || need.to > guess.to) logs = (await getLogs(need.from, need.to)).logs;

  // Edits a failed leave flush kept for this user + date (R32); never replayed into a locked date.
  const userId = getSession()?.user?.id;
  let restored = null;
  let droppedLocked = false;
  if (userId != null) {
    const key = pendingKey(userId, activeDate);
    const pending = readPending(key);
    if (pending && (activeDate < editableFrom || activeDate > today)) {
      removePending(key);
      droppedLocked = true;
    } else {
      restored = pending;
    }
  }
  return { amalan, logs, today, editableFrom, activeDate, explicitDate: wanted !== null, restored, droppedLocked };
}

/** Mutable page state built from the loaded data (render and init each build their own). */
function makeState(data) {
  /** @type {Map<string, {date: string, values: Record<string, any>, notes: string|null, updatedAt?: string}>} */
  const logs = new Map();
  for (const l of data.logs ?? []) logs.set(l.date, { ...l, values: { ...(l.values ?? {}) } });
  if (!logs.has(data.activeDate)) logs.set(data.activeDate, { date: data.activeDate, values: {}, notes: null });
  if (data.restored) {
    const cur = /** @type {any} */ (logs.get(data.activeDate));
    cur.values = { ...cur.values, ...data.restored.values };
    if (data.restored.notes !== undefined) cur.notes = data.restored.notes;
  }
  const items = (data.amalan ?? []).filter((a) => isActiveOn(a, data.activeDate));
  return {
    amalan: data.amalan ?? [],
    items,
    logs,
    today: data.today,
    editableFrom: data.editableFrom,
    activeDate: data.activeDate,
    readOnly: data.activeDate < data.editableFrom || data.activeDate > data.today,
  };
}

const currentLog = (st) => st.logs.get(st.activeDate);
const rawOf = (st, a) => currentLog(st).values[String(a.id)];

/** Logs of the week (mingguan) or month (bulanan) containing activeDate. */
function periodLogs(st, freq) {
  const [from, to] =
    freq === 'mingguan'
      ? [weekStart(st.activeDate), addDays(weekStart(st.activeDate), 6)]
      : [`${monthKey(st.activeDate)}-01`, monthEnd(st.activeDate)];
  return [...st.logs.values()].filter((l) => l.date >= from && l.date <= to);
}

/** Progress shown on an item: today's value for harian, the period total otherwise. */
function progressOf(st, a) {
  const value = a.freq === 'harian' ? dayValue(a, rawOf(st, a)) : periodValue(a, periodLogs(st, a.freq));
  const met = a.freq === 'harian' ? isDayMet(a, rawOf(st, a)) : value >= a.targetVal;
  return { value, met };
}

function weeklySummary(st) {
  const items = st.items.filter((a) => a.freq === 'mingguan');
  const logs = periodLogs(st, 'mingguan');
  const met = items.filter((a) => periodValue(a, logs) >= a.targetVal).length;
  return { met, total: items.length, percentage: items.length ? Math.round((met / items.length) * 100) : 0 };
}

// ---------------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------------

const dash = (pct) => (RING - (RING * pct) / 100).toFixed(1);
const dailyLabel = (s) =>
  s.total === 0 ? 'Tiada amalan harian' : s.percentage >= 80 ? 'Sasaran Tercapai' : s.percentage >= 60 ? 'Prestasi Stabil' : 'Perlu Perhatian';
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const dis = (st) => (st.readOnly ? ' disabled' : '');
const INPUT_STATE = 'disabled:opacity-60 disabled:cursor-not-allowed';
const ON = 'bg-primary-container text-on-primary';
const OFF = 'bg-surface-container-high text-on-surface';

function dateHeading(d, today) {
  return `${DAY_FULL[dow(d)]}, ${dayNum(d)} ${monthName(d)} ${d.slice(0, 4)}${d === today ? ' (Hari Ini)' : ''}`;
}

function titleBlock(st, a, n) {
  const target = num(a.targetVal);
  const desc = a.description ? a.description : `Sasaran ${target} ${a.unit ?? ''}`.trim();
  let progress = '';
  if (a.freq !== 'harian') {
    const { value } = progressOf(st, a);
    const period = a.freq === 'mingguan' ? 'minggu ini' : 'bulan ini';
    progress = `<span class="block font-label-sm text-label-sm text-primary-container font-medium text-xs mt-0.5" data-progress-for="${escapeHtml(a.id)}">${value} / ${target} ${period}</span>`;
  }
  return `
    <div class="flex items-center gap-space-sm min-w-0">
      <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0" title="${n}">
        <span class="material-symbols-outlined text-[16px]">${escapeHtml(a.icon || 'task_alt')}</span>
      </span>
      <div class="min-w-0">
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">${escapeHtml(a.name)}</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">${escapeHtml(desc)}</p>
        ${progress}
      </div>
    </div>`;
}

function chip(text, good, extraCls = '', attrs = '') {
  return `<span class="px-space-sm py-1 rounded ${good ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold text-xs shrink-0 ${extraCls}"${attrs}>${text}</span>`;
}

function countCard(st, a, n) {
  const id = escapeHtml(a.id);
  const target = num(a.targetVal);
  const value = dayValue(a, rawOf(st, a));
  const { value: pv, met } = progressOf(st, a);
  const stepBtn = (delta, icon, label) => `
        <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold ${INPUT_STATE}" data-action="stepper" data-key="${id}" data-delta="${delta}" data-min="0" data-max="${target * 10}" type="button" aria-label="${label}"${dis(st)}>
          <span class="material-symbols-outlined text-[18px]">${icon}</span>
        </button>`;
  return `
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md interactive-card" data-card-for="${id}">
      <div class="flex items-start justify-between gap-space-sm">
        ${titleBlock(st, a, n)}
        ${chip(met ? 'Tercapai' : `${pv}/${target}`, met)}
      </div>
      <div class="flex items-center justify-between bg-surface-container-low p-space-xs rounded-lg">
        <span class="font-body-sm text-body-sm text-on-surface-variant pl-space-sm text-sm">${a.freq === 'harian' ? 'Kiraan:' : 'Hari ini:'}</span>
        <div class="flex items-center gap-space-sm">
          ${stepBtn(-1, 'remove', 'Kurangkan')}
          <div class="flex items-baseline gap-1 px-space-xs">
            <input class="w-14 text-center bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none font-numeral-counter text-numeral-counter text-on-surface font-bold text-lg tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${INPUT_STATE}" type="number" inputmode="numeric" min="0" max="${target * 10}" step="1" value="${value}" data-action="count-input" data-key="${id}" data-value-for="${id}" aria-label="Kiraan"${dis(st)}>
            <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">/ ${target} ${escapeHtml(a.unit ?? '')}</span>
          </div>
          ${stepBtn(1, 'add', 'Tambah')}
        </div>
      </div>
    </div>`;
}

function checkCard(st, a, n) {
  const id = escapeHtml(a.id);
  const on = rawOf(st, a) === true;
  return `
    <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card" data-card-for="${id}">
      ${titleBlock(st, a, n)}
      <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${on ? ON : OFF} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm shrink-0 ${INPUT_STATE}" data-action="toggle-task" data-key="${id}" aria-pressed="${on}" type="button"${dis(st)}>
        <span class="material-symbols-outlined text-[20px]">${on ? 'check_box' : 'check_box_outline_blank'}</span>
        <span>${on ? 'Selesai' : 'Tanda'}</span>
      </button>
    </div>`;
}

function prayersCard(st, a, n) {
  const id = escapeHtml(a.id);
  const raw = rawOf(st, a);
  const done = raw && typeof raw === 'object' ? raw : {};
  const count = dayValue(a, raw);
  const met = isDayMet(a, raw);
  const buttons = PRAYERS.map((p) => {
    const on = done[p] === true;
    return `
        <button class="min-h-[44px] px-space-sm py-2 rounded-lg ${on ? ON : OFF} font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer font-semibold text-xs sm:text-sm ${INPUT_STATE}" data-action="toggle-prayer" data-key="${id}" data-prayer="${p}" aria-pressed="${on}" type="button"${dis(st)}>
          <span class="material-symbols-outlined text-[18px]">${on ? 'check_circle' : 'radio_button_unchecked'}</span>
          <span>${PRAYER_LABELS[p]}</span>
        </button>`;
  }).join('');
  return `
    <div class="md:col-span-2 bg-surface-container-lowest rounded-xl p-space-md md:p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md interactive-card" data-card-for="${id}">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
        ${titleBlock(st, a, n)}
        ${chip(`${count} / ${PRAYERS.length} Waktu Selesai`, met, 'self-start sm:self-auto', ` data-prayer-count-for="${id}"`)}
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-space-sm" data-prayer-row>${buttons}
      </div>
    </div>`;
}

function cardHtml(st, a) {
  const n = st.items.indexOf(a) + 1;
  if (a.inputType === 'prayers') return prayersCard(st, a, n);
  if (a.inputType === 'count') return countCard(st, a, n);
  return checkCard(st, a, n);
}

function groupsHtml(st) {
  const groups = GROUPS.map((g) => ({ ...g, items: st.items.filter((a) => a.freq === g.freq) })).filter((g) => g.items.length);
  const tabs = groups
    .map(
      (g, i) => `
        <button class="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-full ${i === 0 ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors'} font-label-lg text-label-lg whitespace-nowrap text-sm font-semibold cursor-pointer" data-action="scroll-to" data-target="seksyen-${g.freq}" type="button">
          <span class="material-symbols-outlined text-[18px]">${g.icon}</span>
          ${g.title} (${g.items.length})
        </button>`,
    )
    .join('');
  const sections = groups
    .map(
      (g, i) => `
        <section class="flex flex-col gap-space-md" id="seksyen-${g.freq}">
          <div class="flex items-center justify-between pb-space-xs">
            <div class="flex items-center gap-space-sm">
              <div class="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-primary-container">
                <span class="material-symbols-outlined text-[20px]">${g.icon}</span>
              </div>
              <div>
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">${i + 1}. ${g.title}</h2>
                <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">${g.subtitle}</p>
              </div>
            </div>
            <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold text-xs">${g.badge}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            ${g.items.map((a) => cardHtml(st, a)).join('')}
          </div>
        </section>`,
    )
    .join('');
  return `
    <div class="flex items-center gap-space-xs mb-space-lg overflow-x-auto pb-1 sticky top-16 z-20 bg-background/90 backdrop-blur-sm py-2">${tabs}
    </div>
    <div class="flex flex-col gap-space-xl pb-space-lg">${sections}
    </div>`;
}

function emptyHtml() {
  return `
    <div class="bg-surface-container-lowest rounded-xl p-space-xl shadow-sm border border-outline-variant/30 text-center mb-space-lg" data-empty-state>
      <span class="material-symbols-outlined text-4xl text-on-surface-variant">event_busy</span>
      <p class="font-body-md text-body-md text-on-surface-variant mt-space-sm">Tiada amalan aktif untuk tarikh ini.</p>
    </div>`;
}

function stripCell(st, d) {
  const log = st.logs.get(d);
  const hasData = !!log && Object.keys(log.values ?? {}).length > 0;
  const pct = hasData ? dailyScore(st.amalan, log, d).percentage : 0;
  const isActive = d === st.activeDate;
  const future = d > st.today;
  const locked = d < st.editableFrom;
  const cls = isActive
    ? 'bg-primary-container text-on-primary shadow-md ring-2 ring-primary-container ring-offset-2'
    : future
      ? 'bg-surface-container-low/40 text-on-surface opacity-40 cursor-not-allowed'
      : hasData
        ? 'bg-surface-container-low hover:bg-surface-container text-on-surface cursor-pointer'
        : 'bg-surface-container-low/60 hover:bg-surface-container text-on-surface opacity-75 cursor-pointer';
  return `
    <button class="day-strip-btn group flex flex-col items-center justify-between p-2 sm:p-space-sm rounded-lg transition-all ${cls}" data-action="day" data-date="${d}" type="button" aria-current="${isActive ? 'date' : 'false'}" title="${escapeHtml(dateHeading(d, st.today))}${locked ? ' — Dikunci' : ''}"${future ? ' disabled' : ''}>
      <span class="font-label-sm text-label-sm ${isActive ? 'text-on-primary font-bold' : 'text-on-surface-variant'} inline-flex items-center gap-0.5">${DAY_SHORT[dow(d)]}${locked ? '<span class="material-symbols-outlined text-[11px]">lock</span>' : ''}</span>
      <span class="font-headline-sm text-headline-sm ${isActive ? 'text-on-primary font-bold' : 'text-on-surface'} my-0.5 text-base sm:text-lg">${dayNum(d)}</span>
      <div class="w-full bg-black/10 h-1.5 rounded-full overflow-hidden mt-1">
        <div class="${isActive ? 'bg-white' : 'bg-success-amal'} h-full rounded-full transition-all" data-strip-bar style="width: ${pct}%"></div>
      </div>
      <span class="font-label-sm text-label-sm mt-1 text-[11px] font-semibold ${isActive ? 'text-on-primary' : 'text-on-surface-variant'}" data-strip-pct>${hasData ? `${pct}%` : '-'}</span>
    </button>`;
}

function renderView(data) {
  const st = makeState(data);
  const me = getSession();
  const score = dailyScore(st.amalan, currentLog(st), st.activeDate);
  const weekly = weeklySummary(st);
  const ws = weekStart(st.activeDate);
  const days = dateRange(ws, addDays(ws, 6));
  const last = days[6];
  const prevWeek = addDays(st.activeDate, -7);
  const nextWeekStart = addDays(ws, 7);
  const nextWeek = minDate(addDays(st.activeDate, 7), st.today);
  const navBtn = (date, icon, label, disabled) =>
    `<button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" data-action="day" data-date="${date}" type="button" aria-label="${label}"${disabled ? ' disabled' : ''}>
       <span class="material-symbols-outlined text-[18px]">${icon}</span>
     </button>`;

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg" id="hari-ini-root">
      <div class="flex flex-col w-full">

        <!-- Header: date, status pills, score rings, week strip -->
        <div class="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md md:p-space-xl shadow-sm mb-space-lg border border-outline-variant/30">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">

            <div class="flex flex-col gap-space-xs">
              <div class="flex items-center gap-space-xs flex-wrap">
                <span class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold">
                  <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">calendar_today</span>
                  ${st.activeDate === st.today ? 'Hari Ini' : 'Log Retrospektif'}
                </span>
                <span class="${st.readOnly ? '' : 'hidden '}inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-md text-label-md font-semibold" data-lock-badge title="Log di luar tempoh suntingan — paparan sahaja">
                  <span class="material-symbols-outlined text-[15px]">lock</span>
                  Dikunci
                </span>
                <button class="${st.readOnly ? 'hidden ' : ''}inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm ml-space-xs transition-all" id="save-pill" data-state="idle" type="button">
                  <span class="material-symbols-outlined text-[14px] text-success-amal">cloud_done</span>
                  <span>Disimpan automatik</span>
                </button>
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface mt-space-xs tracking-tight text-2xl md:text-3xl font-bold">${dateHeading(st.activeDate, st.today)}</h1>
              <p class="font-body-md text-body-md text-on-surface-variant">
                Sesi Muhasabah Harian${me?.user?.name ? ` • Ahli: <span class="font-medium text-on-surface">${escapeHtml(me.user.name)}</span>` : ''}
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-2 gap-space-md shrink-0">
              <!-- Daily score ring -->
              <div class="bg-surface-container-low rounded-lg p-space-md flex items-center gap-space-md shadow-sm border border-outline-variant/30">
                <div class="relative w-14 h-14 flex items-center justify-center">
                  <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 48 48">
                    <circle class="text-surface-container-highest fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4.5"></circle>
                    <circle id="daily-progress-ring" class="text-success-amal fill-none progress-ring-circle" cx="24" cy="24" r="20" stroke="currentColor" stroke-dasharray="${RING}" stroke-dashoffset="${dash(score.percentage)}" stroke-linecap="round" stroke-width="4.5"></circle>
                  </svg>
                  <span class="absolute font-numeral-counter text-numeral-counter text-on-surface font-bold text-sm" id="daily-score-pct">${score.percentage}%</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px] font-semibold">Skor Harian</span>
                  <span class="font-headline-sm text-headline-sm text-on-surface font-bold text-base" id="daily-score-fraction">${score.met} / ${score.total}</span>
                  <span class="font-label-sm text-label-sm text-success-amal font-semibold" id="daily-score-badge">${dailyLabel(score)}</span>
                </div>
              </div>

              <!-- Weekly items ring -->
              <div class="bg-surface-container-low rounded-lg p-space-md flex items-center gap-space-md shadow-sm border border-outline-variant/30">
                <div class="relative w-14 h-14 flex items-center justify-center">
                  <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 48 48">
                    <circle class="text-surface-container-highest fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4.5"></circle>
                    <circle id="weekly-progress-ring" class="text-primary-container fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-dasharray="${RING}" stroke-dashoffset="${dash(weekly.percentage)}" stroke-linecap="round" stroke-width="4.5"></circle>
                  </svg>
                  <span class="absolute font-numeral-counter text-numeral-counter text-on-surface font-bold text-sm" id="weekly-score-pct">${weekly.total ? `${weekly.percentage}%` : '-'}</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px] font-semibold">Minggu Ini</span>
                  <span class="font-headline-sm text-headline-sm text-on-surface font-bold text-base" id="weekly-score-fraction">${weekly.met} / ${weekly.total}</span>
                  <span class="font-label-sm text-label-sm text-primary font-semibold">Amalan Mingguan</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 7-day strip -->
          <div class="mt-space-lg pt-space-md border-t border-outline-variant/20">
            <div class="flex items-center justify-between gap-space-sm mb-space-xs">
              <span class="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 font-semibold">
                <span class="material-symbols-outlined text-[16px]">history_toggle_off</span>
                Jalur Mingguan (pilih hari untuk semak atau log retrospektif):
              </span>
              <div class="flex items-center gap-1 shrink-0">
                ${navBtn(prevWeek, 'chevron_left', 'Minggu sebelumnya', false)}
                <span class="font-label-sm text-label-sm text-primary-container font-semibold">${dayNum(days[0])} ${monthName(days[0])} – ${dayNum(last)} ${monthName(last)} ${last.slice(0, 4)}</span>
                ${navBtn(nextWeek, 'chevron_right', 'Minggu berikutnya', nextWeekStart > st.today)}
              </div>
            </div>
            <div class="grid grid-cols-7 gap-space-xs sm:gap-space-sm mt-2">
              ${days.map((d) => stripCell(st, d)).join('')}
            </div>
          </div>
        </div>

        ${st.items.length ? groupsHtml(st) : emptyHtml()}

        <!-- Catatan Muhasabah (value set in init via .value) -->
        <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30">
          <div class="flex items-center gap-space-sm mb-space-sm">
            <span class="material-symbols-outlined text-primary-container text-[20px]">edit_note</span>
            <div>
              <h3 class="font-label-md text-label-md text-on-surface font-semibold text-sm">Catatan Muhasabah Harian</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Tulis refleksi, syukur, atau cabaran hari ini</p>
            </div>
          </div>
          <textarea id="daily-notes" maxlength="2000" class="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-space-md text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container resize-none h-20 transition-colors ${INPUT_STATE}" placeholder="Alhamdulillah, hari ini..."${dis(st)}></textarea>
        </div>

        <!-- Sticky save dock -->
        <div class="sticky bottom-6 z-30 mx-auto w-full max-w-xl mt-space-lg">
          <div class="bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-space-sm px-space-md shadow-xl flex items-center justify-between gap-space-md border border-outline-variant/40">
            <div class="flex items-center gap-space-sm min-w-0">
              <div class="w-9 h-9 rounded-full bg-orange-surface flex items-center justify-center text-ikram-orange shrink-0">
                <span class="material-symbols-outlined text-[20px]">${st.readOnly ? 'lock' : 'auto_awesome'}</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-label-md text-label-md text-on-surface truncate font-semibold text-sm" data-dock-title>${st.readOnly ? 'Log dikunci — paparan sahaja' : 'Perubahan disimpan automatik'}</span>
                <span class="font-label-sm text-label-sm text-primary-container truncate font-medium text-xs">${me?.usrah?.name ? escapeHtml(me.usrah.name) : 'Usrah anda'}</span>
              </div>
            </div>
            <button class="min-h-[44px] px-space-lg rounded-lg bg-ikram-orange text-white hover:bg-orange-vibrant font-label-lg text-label-lg shrink-0 flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer font-bold text-sm ${INPUT_STATE}" id="btn-save-manual" data-action="save-now" type="button"${dis(st)}>
              <span class="material-symbols-outlined text-[18px]">save</span>
              <span>Simpan Mutaba'ah</span>
            </button>
          </div>
        </div>

      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------------

/** Escapes a value for use inside a double-quoted attribute selector. */
const attrSel = (v) => String(v).replace(/["\\]/g, '\\$&');

const PILL = {
  idle: ['cloud_done', 'text-success-amal', ''],
  saving: ['sync', 'text-primary-container animate-spin', ''],
  saved: ['cloud_done', 'text-success-amal', ''],
  error: ['error', 'text-error', 'text-error font-semibold cursor-pointer underline'],
};

/**
 * Binds handlers. Returns the router leave hook, which flushes a pending save before navigation.
 * @returns {() => Promise<void>}
 */
function initView(data) {
  const st = makeState(data);
  const root = document.getElementById('hari-ini-root');
  if (!root) return async () => {};
  const pill = /** @type {HTMLButtonElement} */ (root.querySelector('#save-pill'));
  const notesEl = /** @type {HTMLTextAreaElement} */ (root.querySelector('#daily-notes'));
  const byId = new Map(st.items.map((a) => [String(a.id), a]));
  let lastNotes = currentLog(st).notes ?? '';
  let locked = false;
  notesEl.value = lastNotes;

  /** @param {'idle'|'saving'|'saved'|'error'} kind @param {string} text */
  function setPill(kind, text) {
    const [icon, iconCls, btnCls] = PILL[kind];
    pill.dataset.state = kind;
    pill.className = `inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm ml-space-xs transition-all ${btnCls}`;
    pill.title = kind === 'error' ? 'Klik untuk cuba lagi' : '';
    pill.innerHTML = `<span class="material-symbols-outlined text-[14px] ${iconCls}">${icon}</span><span></span>`;
    /** @type {HTMLElement} */ (pill.lastElementChild).textContent = text;
  }

  /** Disables every input (log locked, or the page is being left and its last save is in flight). */
  function disableInputs() {
    st.readOnly = true;
    for (const el of root.querySelectorAll('[data-action="stepper"], [data-action="count-input"], [data-action="toggle-task"], [data-action="toggle-prayer"], [data-action="save-now"], #daily-notes')) {
      /** @type {HTMLButtonElement} */ (el).disabled = true;
    }
  }

  const userId = getSession()?.user?.id;
  const storeKey = userId != null ? pendingKey(userId, st.activeDate) : null;
  const persistPending = () => storeKey && writePending(storeKey, queue.snapshot());
  const clearPending = () => storeKey && removePending(storeKey);

  function setReadOnly() {
    disableInputs();
    root.querySelector('[data-lock-badge]')?.classList.remove('hidden');
    pill.classList.add('hidden');
    const dock = root.querySelector('[data-dock-title]');
    if (dock) dock.textContent = 'Log dikunci — paparan sahaja';
  }

  const queue = createSaveQueue({
    delay: SAVE_DELAY_MS,
    save: (body, options) => (options ? saveLog(st.activeDate, body, options) : saveLog(st.activeDate, body)),
    onState(kind, payload) {
      if (kind === 'saving') setPill('saving', 'Menyimpan…');
      else if (kind === 'saved') {
        if (payload?.updatedAt) currentLog(st).updatedAt = payload.updatedAt;
        setPill('saved', `Disimpan ${clockKL(payload?.updatedAt)}`);
        if (!queue.hasPending()) clearPending();
      } else if (payload?.code === 'LOG_LOCKED') {
        locked = true;
        queue.close();
        clearPending();
        window.showToast?.(payload.message, 'error');
        setReadOnly();
      } else if (payload?.status === 400) {
        // Not retryable: the queue dropped the offending keys (R32). Show the server's message.
        window.showToast?.(payload.message, 'error');
        if (!queue.hasPending()) setPill('idle', 'Perubahan tidak disimpan');
      } else {
        setPill('error', SAVE_FAILED);
      }
    },
  });

  if (data.droppedLocked) window.showToast?.(LOG_LOCKED_MESSAGE, 'error');
  if (data.restored && !st.readOnly) {
    for (const [k, v] of Object.entries(data.restored.values)) queue.set(k, v);
    if (data.restored.notes !== undefined) queue.setNotes(data.restored.notes);
    window.showToast?.(RESTORED, 'info');
    queue.flush().catch(() => {});
  }

  /** Re-renders the parts that depend on values: one card, the rings and today's strip cell. */
  function refresh(a, focusSel) {
    const card = root.querySelector(`[data-card-for="${attrSel(a.id)}"]`);
    if (card) {
      card.outerHTML = cardHtml(st, a);
      if (focusSel) /** @type {HTMLElement|null} */ (root.querySelector(focusSel))?.focus();
    }
    const score = dailyScore(st.amalan, currentLog(st), st.activeDate);
    root.querySelector('#daily-progress-ring')?.setAttribute('stroke-dashoffset', dash(score.percentage));
    root.querySelector('#daily-score-pct').textContent = `${score.percentage}%`;
    root.querySelector('#daily-score-fraction').textContent = `${score.met} / ${score.total}`;
    root.querySelector('#daily-score-badge').textContent = dailyLabel(score);
    const weekly = weeklySummary(st);
    root.querySelector('#weekly-progress-ring')?.setAttribute('stroke-dashoffset', dash(weekly.percentage));
    root.querySelector('#weekly-score-pct').textContent = weekly.total ? `${weekly.percentage}%` : '-';
    root.querySelector('#weekly-score-fraction').textContent = `${weekly.met} / ${weekly.total}`;
    const cell = root.querySelector(`.day-strip-btn[data-date="${st.activeDate}"]`);
    if (cell) cell.outerHTML = stripCell(st, st.activeDate);
  }

  /** @param {any} a @param {unknown} value @param {string} [focusSel] */
  function change(a, value, focusSel) {
    currentLog(st).values[String(a.id)] = value;
    queue.set(String(a.id), value);
    refresh(a, focusSel);
  }

  function captureNotes() {
    if (st.readOnly) return false;
    const text = notesEl.value.trim();
    if (text === lastNotes) return false;
    lastNotes = text;
    currentLog(st).notes = text;
    queue.setNotes(text);
    return true;
  }

  root.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-action], #save-pill'));
    if (!btn || !root.contains(btn) || /** @type {HTMLButtonElement} */ (btn).disabled) return;
    const action = btn.dataset.action;

    if (btn === pill) {
      if (pill.dataset.state === 'error' && !locked) queue.flush().catch(() => {});
      return;
    }
    if (action === 'day') {
      window.location.hash = `#hari-ini?tarikh=${btn.dataset.date}`;
      return;
    }
    if (action === 'scroll-to') {
      document.getElementById(btn.dataset.target ?? '')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (st.readOnly) return;
    if (action === 'save-now') {
      captureNotes();
      queue.flush().then(
        () => window.showToast?.('Rekod Mutaba\'ah disimpan.', 'success'),
        () => {},
      );
      return;
    }

    const a = byId.get(btn.dataset.key ?? '');
    if (!a) return;
    const key = attrSel(a.id);
    if (action === 'stepper') {
      const delta = Number(btn.dataset.delta);
      const max = Number(btn.dataset.max);
      const next = Math.max(0, Math.min(max, dayValue(a, rawOf(st, a)) + delta));
      if (next === dayValue(a, rawOf(st, a))) return;
      change(a, next, `[data-action="stepper"][data-key="${key}"][data-delta="${btn.dataset.delta}"]`);
    } else if (action === 'toggle-task') {
      change(a, rawOf(st, a) !== true, `[data-action="toggle-task"][data-key="${key}"]`);
    } else if (action === 'toggle-prayer') {
      const raw = rawOf(st, a);
      const cur = raw && typeof raw === 'object' ? raw : {};
      const waktu = btn.dataset.prayer;
      const next = Object.fromEntries(PRAYERS.map((p) => [p, p === waktu ? cur[p] !== true : cur[p] === true]));
      change(a, next, `[data-action="toggle-prayer"][data-key="${key}"][data-prayer="${waktu}"]`);
    }
  });

  /** A count typed into the stepper's field: whole number in 0 … max; junk restores the current value. */
  function commitTyped(/** @type {HTMLInputElement} */ el) {
    const a = byId.get(el.dataset.key ?? '');
    if (!a || st.readOnly || el.disabled) return;
    const current = dayValue(a, rawOf(st, a));
    const typed = el.value.trim() === '' ? NaN : Math.trunc(Number(el.value));
    if (!Number.isFinite(typed)) {
      el.value = String(current);
      return;
    }
    const next = Math.max(0, Math.min(Number(el.max), typed));
    el.value = String(next);
    if (next !== current) change(a, next);
  }

  root.addEventListener('change', (e) => {
    const el = /** @type {HTMLElement} */ (e.target);
    if (el.matches?.('[data-action="count-input"]')) commitTyped(/** @type {HTMLInputElement} */ (el));
  });
  root.addEventListener('keydown', (e) => {
    const el = /** @type {HTMLElement} */ (e.target);
    if (e.key !== 'Enter' || !el.matches?.('[data-action="count-input"]')) return;
    e.preventDefault();
    commitTyped(/** @type {HTMLInputElement} */ (el));
    /** @type {HTMLElement|null} */ (root.querySelector(`[data-action="count-input"][data-key="${attrSel(el.dataset.key ?? '')}"]`))?.blur(); // closes the phone keyboard
  });
  // Tapping the number selects it, so typing replaces it.
  root.addEventListener('focusin', (e) => {
    const el = /** @type {HTMLElement} */ (e.target);
    if (el.matches?.('[data-action="count-input"]')) /** @type {HTMLInputElement} */ (el).select();
  });

  notesEl.addEventListener('blur', () => {
    if (captureNotes()) queue.flush().catch(() => {});
  });

  const onUnload = () => {
    captureNotes();
    if (queue.hasPending()) queue.flush({ keepalive: true }).catch(() => {});
  };
  window.addEventListener('beforeunload', onUnload);

  // A tab resumed on a new day (R33): save what is pending to the day it belongs to, then reload so
  // the page shows the server's new today. Only when no ?tarikh= was given.
  const browserDayAtLoad = todayKL();
  let resuming = false;
  const onResume = () => {
    if (data.explicitDate || resuming || !root.isConnected) return; // a replaced view never acts
    const now = todayKL();
    if (now === st.today || now === browserDayAtLoad) return;
    resuming = true;
    captureNotes();
    queue
      .flush()
      .catch(() => {})
      .finally(() => window.router?.renderCurrent());
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') onResume();
  };
  /** @param {Event} e */
  const onPageShow = (e) => {
    if (/** @type {any} */ (e).persisted) onResume();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);

  /** @param {{ timedOut?: boolean }} [ctx] set by the router when it stopped waiting (it toasts then) */
  return async (ctx) => {
    window.removeEventListener('beforeunload', onUnload);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    captureNotes();
    disableInputs(); // no edit may be captured now and then dropped by close()
    if (queue.busy()) {
      persistPending(); // kept if the flush fails or the router stops waiting; cleared on success
      try {
        await queue.flush();
        clearPending();
      } catch (err) {
        if (locked) clearPending();
        else persistPending();
        if (!locked && !ctx?.timedOut && /** @type {any} */ (err)?.status !== 400) window.showToast?.(SAVE_FAILED, 'error');
      }
    }
    queue.close();
  };
}

export const hariIniRoute = {
  title: "Hari Ini | Mutaba'ah Amal",
  roles: ['member'],
  load,
  render: renderView,
  init: initView,
};
