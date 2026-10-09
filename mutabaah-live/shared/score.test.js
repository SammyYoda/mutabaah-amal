import { isActiveOn, dayValue, isDayMet, periodValue, dailyScore, periodScore, statusBand, PRAYERS } from './score.js';

const mk = (id, freq, inputType, targetVal, extra = {}) => ({
  id, freq, inputType, targetVal, createdOn: '2026-01-01', deactivatedOn: null, ...extra,
});
const tilawah = mk(1, 'harian', 'count', 5);
const dhuha = mk(2, 'harian', 'check', 1, { deactivatedOn: '2026-10-05' });
const solat = mk(3, 'harian', 'prayers', 5);
const qiam = mk(4, 'mingguan', 'check', 1);
const riadah = mk(5, 'mingguan', 'count', 3);
const infaq = mk(6, 'bulanan', 'check', 2);
const list = [tilawah, dhuha, solat, qiam];
const log = (date, values) => ({ date, values });
const all5 = { subuh: true, zohor: true, asar: true, maghrib: true, isya: true };

test('PRAYERS order', () => {
  expect(PRAYERS).toEqual(['subuh', 'zohor', 'asar', 'maghrib', 'isya']);
});

test('isActiveOn respects createdOn and deactivatedOn', () => {
  expect(isActiveOn(dhuha, '2026-10-04')).toBe(true);
  expect(isActiveOn(dhuha, '2026-10-05')).toBe(false);
  expect(isActiveOn(tilawah, '2025-12-31')).toBe(false);
  expect(isActiveOn(tilawah, '2026-01-01')).toBe(true);
});

test('dayValue by input type', () => {
  expect(dayValue(tilawah, 7)).toBe(7);
  expect(dayValue(tilawah, undefined)).toBe(0);
  expect(dayValue(dhuha, true)).toBe(1);
  expect(dayValue(dhuha, undefined)).toBe(0);
  expect(dayValue(solat, { subuh: true, zohor: false, asar: true })).toBe(2);
  expect(dayValue(solat, undefined)).toBe(0);
});

test('isDayMet by input type', () => {
  expect(isDayMet(tilawah, 5)).toBe(true);
  expect(isDayMet(tilawah, 4)).toBe(false);
  expect(isDayMet(dhuha, true)).toBe(true);
  expect(isDayMet(solat, { subuh: true, zohor: true, asar: true, maghrib: true, isya: false })).toBe(false);
  expect(isDayMet(solat, all5)).toBe(true);
  expect(isDayMet(tilawah, undefined)).toBe(false);
});

test('periodValue by input type', () => {
  expect(periodValue(riadah, [log('2026-09-28', { 5: 1 }), log('2026-09-30', { 5: 2 })])).toBe(3);
  expect(periodValue(qiam, [log('2026-09-28', { 4: true }), log('2026-09-29', { 4: false }), log('2026-09-30', { 4: true })])).toBe(2);
  const p = mk(9, 'mingguan', 'prayers', 5);
  expect(periodValue(p, [log('2026-09-28', { 9: all5 }), log('2026-09-29', { 9: { subuh: true } })])).toBe(1);
});

test('dailyScore counts only harian items active that day', () => {
  expect(dailyScore(list, log('2026-10-04', { [tilawah.id]: 5, [dhuha.id]: true }), '2026-10-04')).toEqual({ met: 2, total: 3, percentage: 67 });
  expect(dailyScore(list, log('2026-10-05', { [tilawah.id]: 5 }), '2026-10-05')).toEqual({ met: 1, total: 2, percentage: 50 });
  expect(dailyScore(list, null, '2026-10-05').met).toBe(0);
  expect(dailyScore([qiam], null, '2026-10-05')).toEqual({ met: 0, total: 0, percentage: 0 });
});

test('amalan created mid-period not expected before createdOn', () => {
  const a = mk(1, 'harian', 'count', 5, { createdOn: '2026-10-05' });
  const logs = ['05', '06', '07'].map((d) => log(`2026-10-${d}`, { 1: 5 }));
  expect(periodScore([a], logs, { from: '2026-10-01', to: '2026-10-07', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 3, expected: 3, percentage: 100 });
});

test('weekly item aggregates across the week', () => {
  const logs = [log('2026-09-28', { 5: 1 }), log('2026-09-30', { 5: 2 })];
  expect(periodScore([riadah], logs, { from: '2026-09-28', to: '2026-10-04', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 1, expected: 1, percentage: 100 });
});

test('completed unmet week counts as expected', () => {
  expect(periodScore([riadah], [log('2026-09-28', { 5: 1 })], { from: '2026-09-28', to: '2026-10-04', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 0, expected: 1, percentage: 0 });
});

test('in-progress week counts only if already met', () => {
  const opts = { from: '2026-10-05', to: '2026-10-11', today: '2026-10-07', joinedOn: '2026-01-01' };
  expect(periodScore([qiam], [], opts)).toEqual({ met: 0, expected: 0, percentage: 0 });
  expect(periodScore([qiam], [log('2026-10-06', { 4: true })], opts)).toEqual({ met: 1, expected: 1, percentage: 100 });
});

test('logs in any order and outside the range are handled', () => {
  const logs = [log('2026-10-02', { 5: 2 }), log('2026-09-20', { 5: 9 }), log('2026-09-28', { 5: 1 })];
  expect(periodScore([riadah], logs, { from: '2026-09-28', to: '2026-10-04', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 1, expected: 1, percentage: 100 });
});

test('monthly item aggregates over calendar month, in-progress rule applies', () => {
  const logs = [log('2026-09-03', { 6: true }), log('2026-09-20', { 6: true })];
  expect(periodScore([infaq], logs, { from: '2026-09-01', to: '2026-10-09', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 1, expected: 1, percentage: 100 });
});

test('joinedOn trims the period', () => {
  const twoMetDays = [log('2026-10-08', { 1: 5 }), log('2026-10-09', { 1: 5 })];
  expect(periodScore([tilawah], twoMetDays, { from: '2026-09-12', to: '2026-10-09', today: '2026-10-09', joinedOn: '2026-10-08' }))
    .toEqual({ met: 2, expected: 2, percentage: 100 });
});

test('future days and empty ranges', () => {
  expect(periodScore([tilawah], [], { from: '2026-10-10', to: '2026-10-16', today: '2026-10-09', joinedOn: '2026-01-01' }))
    .toEqual({ met: 0, expected: 0, percentage: 0 });
  expect(periodScore([tilawah], [], { from: '2026-10-08', to: '2026-10-12', today: '2026-10-09', joinedOn: '2026-01-01' }).expected).toBe(2);
});

test.each([[80, 'A'], [79, 'B'], [60, 'B'], [59, 'C'], [0, 'C']])('statusBand(%i) = %s', (p, l) => {
  expect(statusBand(p).level).toBe(l);
});
test('statusBand labels', () => {
  expect(statusBand(90).label).toBe('Teguh (Level A)');
  expect(statusBand(70).label).toBe('Sederhana (Level B)');
  expect(statusBand(10).label).toBe('Perlu Perhatian (Level C)');
});

describe('whole-period judging (R6)', () => {
  const base = { today: '2026-10-09', joinedOn: '2026-01-01' };
  test('rolling window with mid-week start judges the whole edge week', () => {
    const logs = [log('2026-09-08', { 5: 3 }), log('2026-09-13', { 5: 1 })];
    // W37 (09-07..13) 3+1>=3 met; W38..W40 empty+completed -> expected; W41 in progress unmet -> excluded
    expect(periodScore([riadah], logs, { from: '2026-09-12', to: '2026-10-09', ...base }))
      .toEqual({ met: 1, expected: 4, percentage: 25 });
  });
  test('logs in the same week but outside from/to still count', () => {
    expect(periodScore([riadah], [log('2026-09-29', { 5: 3 })], { from: '2026-10-02', to: '2026-10-04', ...base }))
      .toEqual({ met: 1, expected: 1, percentage: 100 });
  });
  test('joined partway through a completed week: unmet not expected, met counted', () => {
    const opts = { from: '2026-09-28', to: '2026-10-04', today: '2026-10-09', joinedOn: '2026-10-01' };
    expect(periodScore([riadah], [], opts)).toEqual({ met: 0, expected: 0, percentage: 0 });
    expect(periodScore([riadah], [log('2026-10-02', { 5: 3 }), log('2026-09-29', { 5: 9 })], opts))
      .toEqual({ met: 1, expected: 1, percentage: 100 });
  });
  test('mingguan item deactivated mid-week is judged by activity on the last evaluation day', () => {
    const q = mk(4, 'mingguan', 'check', 1, { deactivatedOn: '2026-10-02' });
    const opts = { from: '2026-09-28', to: '2026-10-04', ...base };
    expect(periodScore([q], [], opts)).toEqual({ met: 0, expected: 0, percentage: 0 });
    const q2 = mk(4, 'mingguan', 'check', 1, { deactivatedOn: '2026-10-05' });
    expect(periodScore([q2], [], opts)).toEqual({ met: 0, expected: 1, percentage: 0 });
  });
  test('completed unmet month is expected; in-progress month is not', () => {
    const inf = mk(6, 'bulanan', 'check', 2);
    expect(periodScore([inf], [log('2026-09-03', { 6: true })], { from: '2026-09-01', to: '2026-10-09', ...base }))
      .toEqual({ met: 0, expected: 1, percentage: 0 });
  });
});
