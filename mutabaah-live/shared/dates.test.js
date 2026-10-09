import { todayKL, addDays, dateRange, isoWeekKey, weekStart, monthKey, isEditableDate } from './dates.js';
test('todayKL uses UTC+8', () => {
  expect(todayKL(new Date('2026-10-08T16:30:00Z'))).toBe('2026-10-09');
  expect(todayKL(new Date('2026-10-08T15:59:59Z'))).toBe('2026-10-08');
});
test('addDays crosses month and year', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
});
test('dateRange inclusive', () => {
  expect(dateRange('2026-10-30', '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  expect(dateRange('2026-10-02', '2026-10-01')).toEqual([]);
});
test('ISO weeks', () => {
  expect(isoWeekKey('2026-10-09')).toBe('2026-W41');
  expect(isoWeekKey('2027-01-01')).toBe('2026-W53');
  expect(weekStart('2026-10-11')).toBe('2026-10-05');
});
test('monthKey', () => expect(monthKey('2026-10-09')).toBe('2026-10'));
test.each([
  ['2026-10-09', '2026-10-09', true],
  ['2026-10-10', '2026-10-09', false],  // future
  ['2026-10-01', '2026-10-09', true],   // same month
  ['2026-09-30', '2026-10-07', true],   // grace: day 7
  ['2026-09-01', '2026-10-07', true],
  ['2026-09-30', '2026-10-08', false],  // grace over
  ['2026-08-31', '2026-10-03', false],  // two months back
  ['2025-12-31', '2026-01-05', true],   // grace across year
])('isEditableDate(%s, today=%s) = %s', (d, t, ok) => expect(isEditableDate(d, t)).toBe(ok));
