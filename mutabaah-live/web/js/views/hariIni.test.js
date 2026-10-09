import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getAmalan: vi.fn(), getLogs: vi.fn(), saveLog: vi.fn() };
});

import { ApiError, getAmalan, getLogs, saveLog } from '../api.js';
import { hariIniRoute, rangeFor } from './hariIni.js';
import { setSession, clearSession } from '../session.js';

const TODAY = '2026-10-09'; // Friday; ISO week 2026-10-05 .. 2026-10-11
const EDITABLE_FROM = '2026-10-01';

const base = { description: '', unit: '', icon: 'star', active: true, createdOn: '2026-01-01', deactivatedOn: null };
/** One active item of each inputType, plus a deactivated one. */
const AMALAN = [
  { ...base, id: 1, code: '01', name: 'Tilawah <b>Al-Quran</b>', description: 'Sasaran "5" muka surat', freq: 'harian', inputType: 'count', targetVal: 5, unit: 'm/s', icon: 'menu_book', sort: 0 },
  { ...base, id: 2, code: '02', name: 'Solat Fardhu Berjamaah', freq: 'harian', inputType: 'prayers', targetVal: 5, unit: 'waktu', icon: 'mosque', sort: 1 },
  { ...base, id: 3, code: '03', name: 'Solat Dhuha', freq: 'harian', inputType: 'check', targetVal: 1, icon: 'light_mode"><img src=x>', sort: 2 },
  { ...base, id: 4, code: '04', name: 'Wirid Lama', freq: 'harian', inputType: 'check', targetVal: 1, sort: 3, active: false, deactivatedOn: '2026-10-05' },
];
const PERIOD_AMALAN = [
  ...AMALAN.slice(0, 1),
  { ...base, id: 10, code: '10', name: "Ma'thurat Sughra", freq: 'mingguan', inputType: 'check', targetVal: 2, sort: 4 },
  { ...base, id: 11, code: '11', name: 'Riadah', freq: 'mingguan', inputType: 'count', targetVal: 3, unit: 'sesi', sort: 5 },
  { ...base, id: 17, code: '17', name: 'Berpuasa Sunat', freq: 'bulanan', inputType: 'check', targetVal: 1, sort: 6 },
];

const logsResponse = (logs = [], today = TODAY, editableFrom = EDITABLE_FROM) => ({ logs, today, editableFrom });
const log = (date, values, notes = null) => ({ date, values, notes, updatedAt: `${date}T01:00:00.000Z` });

/** Runs load → render → init like the router does. Returns { data, leave }. */
async function mount(hash = '') {
  const params = new URLSearchParams(hash);
  const data = await hariIniRoute.load(params);
  document.body.innerHTML = `<main id="app-main">${hariIniRoute.render(data)}</main>`;
  const leave = hariIniRoute.init(data);
  return { data, leave };
}

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const plus = (id) => $(`[data-action="stepper"][data-key="${id}"][data-delta="1"]`);
const pill = () => $('#save-pill');

beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  setSession({ user: { id: 2, name: 'Ahmad <i>Faiz</i>', email: 'f@u.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'Usrah An-Nur', naqibName: null }, role: 'member' });
  window.showToast = vi.fn();
  history.replaceState(null, '', '#hari-ini');
  getAmalan.mockResolvedValue(AMALAN);
  getLogs.mockResolvedValue(logsResponse([log(TODAY, { 1: 1, 3: true })]));
  saveLog.mockImplementation(async (date, body) => log(date, body.values ?? {}, body.notes ?? null));
});
afterEach(() => {
  vi.clearAllTimers(); // drop debounced saves scheduled by the test
  vi.useRealTimers();
  localStorage.clear();
});

describe('rangeFor', () => {
  it('covers the ISO week and the month of activeDate, up to today', () => {
    expect(rangeFor('2026-10-09', '2026-10-09')).toEqual({ from: '2026-10-01', to: '2026-10-09' });
    // week of 2026-10-01 starts on Mon 2026-09-28
    expect(rangeFor('2026-10-01', '2026-10-20')).toEqual({ from: '2026-09-28', to: '2026-10-20' });
    // past month: whole month (and the week reaching into the next month), capped at today
    expect(rangeFor('2026-09-29', '2026-10-03')).toEqual({ from: '2026-09-01', to: '2026-10-03' });
    expect(rangeFor('2026-08-10', '2026-10-09')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });
});

describe('hariIniRoute.load', () => {
  it('is a member route', () => {
    expect(hariIniRoute.roles).toEqual(['member']);
  });

  it('defaults activeDate to the server today and fetches the week + month range', async () => {
    const data = await hariIniRoute.load(new URLSearchParams());
    expect(data.activeDate).toBe(TODAY);
    expect(data.today).toBe(TODAY);
    expect(data.editableFrom).toBe(EDITABLE_FROM);
    expect(data.amalan).toEqual(AMALAN);
    expect(data.logs).toHaveLength(1);
    expect(getLogs).toHaveBeenLastCalledWith('2026-10-01', '2026-10-09');
  });

  it('uses ?tarikh= and clamps a future or invalid date to today', async () => {
    expect((await hariIniRoute.load(new URLSearchParams('tarikh=2026-10-06'))).activeDate).toBe('2026-10-06');
    expect((await hariIniRoute.load(new URLSearchParams('tarikh=2026-10-20'))).activeDate).toBe(TODAY);
    expect((await hariIniRoute.load(new URLSearchParams('tarikh=2026-02-30'))).activeDate).toBe(TODAY);
    expect((await hariIniRoute.load(new URLSearchParams('tarikh=semalam'))).activeDate).toBe(TODAY);
  });

  it('refetches when the browser clock disagrees with the server today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T04:00:00Z')); // browser thinks it is November
    const data = await hariIniRoute.load(new URLSearchParams());
    expect(data.activeDate).toBe(TODAY);
    expect(getLogs).toHaveBeenCalledTimes(2);
    expect(getLogs).toHaveBeenLastCalledWith('2026-10-01', '2026-10-09');
  });
});

describe('hariIniRoute.render', () => {
  it('renders one stepper, one toggle and one five-prayer row; skips deactivated items', async () => {
    await mount();
    expect($$('[data-action="stepper"][data-delta="1"]')).toHaveLength(1);
    expect($$('[data-action="toggle-task"]')).toHaveLength(1);
    expect($$('[data-prayer-row]')).toHaveLength(1);
    expect($$('[data-action="toggle-prayer"]')).toHaveLength(5);
    expect(document.body.textContent).not.toContain('Wirid Lama');
    expect(plus(1).dataset.max).toBe('50');
    expect($('[data-value-for="1"]').textContent).toBe('1');
    expect($('[data-action="toggle-task"][data-key="3"]').textContent).toContain('Selesai');
  });

  it('escapes API strings (name, description, icon) and puts notes in via .value', async () => {
    getLogs.mockResolvedValue(logsResponse([log(TODAY, {}, '</textarea><script>alert(1)</script>')]));
    await mount();
    const html = $('#app-main').innerHTML;
    expect(html).not.toContain('<b>Al-Quran</b>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<i>Faiz</i>');
    expect(document.body.textContent).toContain('Tilawah <b>Al-Quran</b>');
    expect($('#daily-notes').value).toBe('</textarea><script>alert(1)</script>');
  });

  it('shows the daily score from dailyScore (harian items only)', async () => {
    getLogs.mockResolvedValue(logsResponse([log(TODAY, { 1: 5, 3: true })]));
    await mount();
    expect($('#daily-score-pct').textContent).toBe('67%');
    expect($('#daily-score-fraction').textContent).toBe('2 / 3');
  });

  it('shows "x / target minggu ini" and "bulan ini" progress for mingguan/bulanan items', async () => {
    vi.useFakeTimers(); // the toggle below schedules a save; keep its timer inside this test
    getAmalan.mockResolvedValue(PERIOD_AMALAN);
    getLogs.mockResolvedValue(
      logsResponse([
        log('2026-10-02', { 10: true, 11: 4, 17: true }), // last week: not in this week's totals
        log('2026-10-06', { 10: true, 11: 1 }),
        log(TODAY, { 11: 1 }),
      ]),
    );
    await mount();
    expect($('[data-progress-for="10"]').textContent).toBe('1 / 2 minggu ini');
    expect($('[data-progress-for="11"]').textContent).toBe('2 / 3 minggu ini');
    expect($('[data-progress-for="17"]').textContent).toBe('1 / 1 bulan ini');
    $('[data-action="toggle-task"][data-key="10"]').click();
    expect($('[data-progress-for="10"]').textContent).toBe('2 / 2 minggu ini');
  });

  it('shows the empty state when no amalan is active on activeDate', async () => {
    getAmalan.mockResolvedValue([AMALAN[3]]);
    await mount();
    expect(document.body.textContent).toContain('Tiada amalan aktif untuk tarikh ini.');
    expect($$('[data-action="stepper"]')).toHaveLength(0);
  });

  it('days before editableFrom are read-only with a "Dikunci" badge', async () => {
    getLogs.mockResolvedValue(logsResponse([log('2026-09-29', { 1: 3 })]));
    await mount('tarikh=2026-09-29');
    expect(document.body.textContent).toContain('Dikunci');
    const inputs = $$('[data-action="stepper"], [data-action="toggle-task"], [data-action="toggle-prayer"], #daily-notes');
    // item 4 is still active on 09-29 (deactivated from 10-05): 2 stepper buttons + 2 toggles + 5 prayers + notes
    expect(inputs.length).toBe(2 + 2 + 5 + 1);
    for (const el of inputs) expect(el.disabled).toBe(true);
    plus(1).click();
    expect($('[data-value-for="1"]').textContent).toBe('3');
  });

  it('the week strip links to #hari-ini?tarikh= and disables future days', async () => {
    await mount();
    const days = $$('.day-strip-btn');
    expect(days.map((b) => b.dataset.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
    expect(days[5].disabled).toBe(true);
    expect(days[6].disabled).toBe(true);
    expect(days[4].disabled).toBe(false);
    days[1].click();
    expect(window.location.hash).toBe('#hari-ini?tarikh=2026-10-06');
  });
});

describe('hariIniRoute saving', () => {
  it('two stepper clicks within 800 ms → one saveLog with only the changed key', async () => {
    vi.useFakeTimers();
    await mount();
    plus(1).click();
    vi.advanceTimersByTime(500);
    plus(1).click();
    expect($('[data-value-for="1"]').textContent).toBe('3');
    expect(saveLog).not.toHaveBeenCalled();
    vi.advanceTimersByTime(799);
    expect(saveLog).not.toHaveBeenCalled();
    expect(pill().textContent).not.toContain('Menyimpan');
    await vi.advanceTimersByTimeAsync(1);
    expect(saveLog).toHaveBeenCalledTimes(1);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { values: { 1: 3 } });
    expect(pill().textContent).toMatch(/Disimpan \d\d:\d\d/);
  });

  it('updates the ring immediately on change', async () => {
    vi.useFakeTimers();
    getLogs.mockResolvedValue(logsResponse([log(TODAY, { 1: 4 })]));
    await mount();
    expect($('#daily-score-pct').textContent).toBe('0%');
    plus(1).click();
    expect($('#daily-score-pct').textContent).toBe('33%');
  });

  it('shows "Menyimpan…" while the request is in flight', async () => {
    vi.useFakeTimers();
    let resolve;
    saveLog.mockImplementation(() => new Promise((r) => (resolve = r)));
    await mount();
    $('[data-action="toggle-task"][data-key="3"]').click();
    await vi.advanceTimersByTimeAsync(800);
    expect(pill().textContent).toContain('Menyimpan…');
    resolve(log(TODAY, { 3: false }));
    await vi.waitFor(() => expect(pill().textContent).toContain('Disimpan'));
  });

  it('prayer toggles send the whole prayers object for that amalan', async () => {
    vi.useFakeTimers();
    await mount();
    $('[data-action="toggle-prayer"][data-prayer="subuh"]').click();
    $('[data-action="toggle-prayer"][data-prayer="isya"]').click();
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenCalledWith(TODAY, {
      values: { 2: { subuh: true, zohor: false, asar: false, maghrib: false, isya: true } },
    });
    expect($('[data-prayer-count-for="2"]').textContent).toContain('2 / 5');
  });

  it('a rejected saveLog shows "Gagal disimpan — cuba lagi"; clicking it retries the pending keys', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'Tiada sambungan ke pelayan — cuba lagi.'));
    await mount();
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    expect(pill().textContent).toContain('Gagal disimpan — cuba lagi');
    pill().click();
    await vi.waitFor(() => expect(saveLog).toHaveBeenCalledTimes(2));
    expect(saveLog).toHaveBeenLastCalledWith(TODAY, { values: { 1: 2 } });
    await vi.waitFor(() => expect(pill().textContent).toMatch(/Disimpan \d\d:\d\d/));
  });

  it('a retry after failure keeps newer edits and sends the union of keys', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'Ralat'));
    await mount();
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    $('[data-action="toggle-task"][data-key="3"]').click();
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenLastCalledWith(TODAY, { values: { 1: 2, 3: false } });
  });

  it('LOG_LOCKED → toast with the server message and the page turns read-only', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(403, 'LOG_LOCKED', 'Log bulan ini sudah dikunci'));
    await mount();
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    expect(window.showToast).toHaveBeenCalledWith('Log bulan ini sudah dikunci', 'error');
    expect(plus(1).disabled).toBe(true);
    expect($('#daily-notes').disabled).toBe(true);
    expect(document.body.textContent).toContain('Dikunci');
  });

  it('notes save on blur (immediately, notes only)', async () => {
    vi.useFakeTimers();
    await mount();
    const ta = $('#daily-notes');
    ta.value = 'Alhamdulillah';
    ta.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(0);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { notes: 'Alhamdulillah' });
    ta.dispatchEvent(new Event('blur')); // unchanged → no second save
    await vi.advanceTimersByTimeAsync(1000);
    expect(saveLog).toHaveBeenCalledTimes(1);
  });

  it('the leave hook flushes a pending save before navigation', async () => {
    vi.useFakeTimers();
    const { leave } = await mount();
    expect(leave).toBeTypeOf('function');
    plus(1).click();
    $('#daily-notes').value = 'belum blur';
    await leave();
    expect(saveLog).toHaveBeenCalledTimes(1);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { values: { 1: 2 }, notes: 'belum blur' });
    await vi.advanceTimersByTimeAsync(2000);
    expect(saveLog).toHaveBeenCalledTimes(1); // the debounce timer was cancelled
  });

  it('a failed flush on leave toasts "Gagal disimpan — cuba lagi" and still resolves', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValue(new ApiError(0, 'NETWORK', 'x'));
    const { leave } = await mount();
    plus(1).click();
    await expect(leave()).resolves.toBeUndefined();
    expect(window.showToast).toHaveBeenCalledWith('Gagal disimpan — cuba lagi', 'error');
  });

  it('the leave hook does nothing when nothing is pending', async () => {
    const { leave } = await mount();
    await leave();
    expect(saveLog).not.toHaveBeenCalled();
  });
});

describe('Hari Ini full flow (fake server)', () => {
  it('stepper + toggle + prayer → one PUT with only those keys → re-render shows saved values', async () => {
    vi.useFakeTimers();
    /** @type {Map<string, any>} */
    const db = new Map([[TODAY, log(TODAY, { 1: 1, 3: false, 99: 7 }, 'lama')]]);
    getLogs.mockImplementation(async (from, to) => logsResponse([...db.values()].filter((l) => l.date >= from && l.date <= to)));
    saveLog.mockImplementation(async (date, body) => {
      const prev = db.get(date) ?? log(date, {}, null);
      const next = { ...prev, values: { ...prev.values, ...(body.values ?? {}) }, notes: body.notes ?? prev.notes };
      db.set(date, next);
      return next;
    });

    await mount();
    plus(1).click();
    plus(1).click();
    $('[data-action="toggle-task"][data-key="3"]').click();
    for (const p of ['subuh', 'zohor', 'asar', 'maghrib', 'isya']) $(`[data-action="toggle-prayer"][data-prayer="${p}"]`).click();
    await vi.advanceTimersByTimeAsync(800);

    expect(saveLog).toHaveBeenCalledTimes(1);
    expect(saveLog.mock.calls[0][1]).toEqual({
      values: { 1: 3, 3: true, 2: { subuh: true, zohor: true, asar: true, maghrib: true, isya: true } },
    });
    expect(db.get(TODAY).values[99]).toBe(7); // untouched key preserved by the merge

    await mount(); // reload from the "server"
    expect($('[data-value-for="1"]').textContent).toBe('3');
    expect($('[data-action="toggle-task"][data-key="3"]').textContent).toContain('Selesai');
    expect($$('[data-action="toggle-prayer"]').every((b) => b.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect($('#daily-score-pct').textContent).toBe('67%'); // tilawah 3 / 5 unmet; prayers + dhuha met → 2/3
  });
});

const PENDING_KEY = `mutabaah:pending:2:${TODAY}`;
const stored = (key = PENDING_KEY) => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
};

describe('Hari Ini unsaved edits survive a failed leave (R32)', () => {
  it('a failed leave flush stores the pending values + notes; the next load replays, saves and clears them', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValue(new ApiError(0, 'NETWORK', 'Tiada sambungan'));
    const { leave } = await mount();
    plus(1).click();
    $('#daily-notes').value = 'belum disimpan';
    await leave();
    expect(stored()).toEqual({ values: { 1: 2 }, notes: 'belum disimpan' });

    saveLog.mockReset();
    saveLog.mockImplementation(async (date, body) => log(date, body.values ?? {}, body.notes ?? null));
    window.showToast.mockClear();
    await mount(); // server still has { 1: 1, 3: true }
    expect($('[data-value-for="1"]').textContent).toBe('2'); // merged over the server log
    expect($('#daily-notes').value).toBe('belum disimpan');
    expect(window.showToast).toHaveBeenCalledWith('Perubahan belum disimpan dipulihkan', 'info');
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { values: { 1: 2 }, notes: 'belum disimpan' });
    await vi.waitFor(() => expect(stored()).toBeNull());
  });

  it('a leave flush the router gives up on (timeout) has already stored the pending values', async () => {
    vi.useFakeTimers();
    saveLog.mockImplementation(() => new Promise(() => {})); // never settles
    const { leave } = await mount();
    plus(1).click();
    void leave({ timedOut: false });
    await vi.advanceTimersByTimeAsync(0);
    expect(stored()).toEqual({ values: { 1: 2 } });
  });

  it('a successful leave flush leaves nothing in localStorage', async () => {
    vi.useFakeTimers();
    const { leave } = await mount();
    plus(1).click();
    await leave();
    expect(saveLog).toHaveBeenCalledTimes(1);
    expect(stored()).toBeNull();
  });

  it('inputs are disabled while the leave hook is flushing, so no edit is captured and then dropped', async () => {
    vi.useFakeTimers();
    let resolve;
    saveLog.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { leave } = await mount();
    plus(1).click();
    const done = leave();
    await vi.advanceTimersByTimeAsync(0);
    expect(plus(1).disabled).toBe(true);
    expect($('[data-action="toggle-task"][data-key="3"]').disabled).toBe(true);
    expect($('[data-action="toggle-prayer"][data-prayer="subuh"]').disabled).toBe(true);
    expect($('#daily-notes').disabled).toBe(true);
    expect($('#btn-save-manual').disabled).toBe(true);
    plus(1).click(); // ignored
    expect($('[data-value-for="1"]').textContent).toBe('2');
    resolve(log(TODAY, { 1: 2 }));
    await done;
    expect(saveLog).toHaveBeenCalledTimes(1);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { values: { 1: 2 } });
  });

  it('never replays into a locked date: the key is dropped with the LOG_LOCKED message', async () => {
    const old = '2026-09-20'; // before editableFrom
    localStorage.setItem(`mutabaah:pending:2:${old}`, JSON.stringify({ values: { 1: 4 } }));
    getLogs.mockResolvedValue(logsResponse([]));
    await mount(`tarikh=${old}`);
    expect(stored(`mutabaah:pending:2:${old}`)).toBeNull();
    expect(window.showToast).toHaveBeenCalledWith('Log bulan ini sudah dikunci', 'error');
    expect($('[data-value-for="1"]').textContent).toBe('0');
    expect(saveLog).not.toHaveBeenCalled();
  });

  it("another user's stored edits are not replayed", async () => {
    localStorage.setItem(`mutabaah:pending:99:${TODAY}`, JSON.stringify({ values: { 1: 4 } }));
    await mount();
    expect($('[data-value-for="1"]').textContent).toBe('1');
    expect(window.showToast).not.toHaveBeenCalled();
    expect(stored(`mutabaah:pending:99:${TODAY}`)).not.toBeNull();
  });

  it('corrupt stored JSON is ignored and removed', async () => {
    localStorage.setItem(PENDING_KEY, '{nope');
    await mount();
    expect($('[data-value-for="1"]').textContent).toBe('1');
    expect(stored()).toBeNull();
  });

  it('the beforeunload flush uses fetch keepalive', async () => {
    vi.useFakeTimers();
    await mount();
    plus(1).click();
    window.dispatchEvent(new Event('beforeunload'));
    await vi.advanceTimersByTimeAsync(0);
    expect(saveLog).toHaveBeenCalledWith(TODAY, { values: { 1: 2 } }, { keepalive: true });
  });
});

describe('Hari Ini non-retryable save errors (R32)', () => {
  it('a 400 VALIDATION_ERROR drops the offending keys with the server message; the rest and later saves go through', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'Data tidak sah', { 'values.1': 'Nilai tidak sah' }));
    await mount();
    plus(1).click();
    $('[data-action="toggle-task"][data-key="3"]').click();
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenNthCalledWith(1, TODAY, { values: { 1: 2, 3: false } });
    expect(window.showToast).toHaveBeenCalledWith('Data tidak sah', 'error');
    await vi.advanceTimersByTimeAsync(800); // the valid key is re-sent on its own
    expect(saveLog).toHaveBeenNthCalledWith(2, TODAY, { values: { 3: false } });
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenNthCalledWith(3, TODAY, { values: { 1: 3 } });
    await vi.waitFor(() => expect(pill().textContent).toMatch(/Disimpan \d\d:\d\d/));
    expect(saveLog).toHaveBeenCalledTimes(3);
  });

  it('a 400 without field details drops the whole batch (not re-queued forever)', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(400, 'VALIDATION_ERROR', 'Data tidak sah'));
    const { leave } = await mount();
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    expect(window.showToast).toHaveBeenCalledWith('Data tidak sah', 'error');
    await vi.advanceTimersByTimeAsync(5000);
    expect(saveLog).toHaveBeenCalledTimes(1);
    $('[data-action="toggle-task"][data-key="3"]').click();
    await vi.advanceTimersByTimeAsync(800);
    expect(saveLog).toHaveBeenLastCalledWith(TODAY, { values: { 3: false } });
    await leave();
    expect(saveLog).toHaveBeenCalledTimes(2);
    expect(stored()).toBeNull();
  });

  it('network and 5xx failures keep the keys for a retry', async () => {
    vi.useFakeTimers();
    saveLog.mockRejectedValueOnce(new ApiError(503, 'INTERNAL', 'Ralat'));
    const { leave } = await mount();
    plus(1).click();
    await vi.advanceTimersByTimeAsync(800);
    await leave();
    expect(saveLog).toHaveBeenLastCalledWith(TODAY, { values: { 1: 2 } });
    expect(saveLog).toHaveBeenCalledTimes(2);
  });
});
