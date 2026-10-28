import { describe, it, expect } from 'vitest';
import { makeTestApp, seedUsrah, api, loginAs, createUser } from './helpers.js';

const KL_OCT_07 = '2026-10-07T02:00:00Z';
const KL_OCT_08 = '2026-10-08T02:00:00Z';

async function setup(now = KL_OCT_07) {
  const t = makeTestApp({ now });
  const u = await seedUsrah(t.app, t.db);
  const signup = await api(t.app).post('/api/auth/signup', { name: 'Ahmad', email: 'a@x.test', password: 'katalaluan123', inviteCode: u.inviteCode });
  expect(signup.statusCode).toBe(201);
  const cookie = await loginAs(t.app, 'a@x.test');
  const list = (await api(t.app, cookie).get('/api/amalan')).json() as any[];
  const byType = (type: string) => list.find((a) => a.inputType === type)!;
  return { ...t, u, cookie, list, count: byType('count'), check: byType('check'), prayers: byType('prayers') };
}

const ALL = { subuh: true, zohor: true, asar: false, maghrib: true, isya: false };

describe('GET /api/amalan', () => {
  it('returns own usrah items sorted, without usrahId, incl. deactivated', async () => {
    const s = await setup();
    const other = await seedUsrah(s.app, s.db, 'Lain');
    expect(s.list.length).toBeGreaterThan(5);
    expect(s.list[0]).not.toHaveProperty('usrahId');
    expect(s.list[0]).toHaveProperty('deactivatedOn');
    const sorts = s.list.map((a) => a.sort);
    expect(sorts).toEqual([...sorts].sort((a, b) => a - b));
    const otherList = (await api(s.app, other.naqib.cookie).get('/api/amalan')).json() as any[];
    const mine = new Set(s.list.map((a) => a.id));
    expect(otherList.some((a) => mine.has(a.id))).toBe(false);
  });
  it('401 without session, 403 for admin without membership', async () => {
    const s = await setup();
    expect((await api(s.app).get('/api/amalan')).statusCode).toBe(401);
    await createUser(s.db, { email: 'adm@x.test', name: 'Adm', isAdmin: true });
    const adm = await loginAs(s.app, 'adm@x.test');
    const r = await api(s.app, adm).get('/api/amalan');
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('FORBIDDEN');
    expect((await api(s.app, adm).get('/api/logs?from=2026-10-01&to=2026-10-07')).statusCode).toBe(403);
  });
});

describe('logs roundtrip and merge', () => {
  it('PUT then GET; merges keys; notes-only keeps values', async () => {
    const s = await setup();
    const c = api(s.app, s.cookie);
    const r1 = await c.put('/api/logs/2026-10-07', { values: { [s.count.id]: 5 } });
    expect(r1.statusCode).toBe(200);
    const r2 = await c.put('/api/logs/2026-10-07', { values: { [s.check.id]: true, [s.prayers.id]: ALL } });
    expect(r2.json().values).toEqual({ [s.count.id]: 5, [s.check.id]: true, [s.prayers.id]: ALL });
    const r3 = await c.put('/api/logs/2026-10-07', { notes: 'nota' });
    expect(r3.json().notes).toBe('nota');
    expect(Object.keys(r3.json().values)).toHaveLength(3);
    const r4 = await c.put('/api/logs/2026-10-07', { values: { [s.count.id]: 9 } });
    expect(r4.json().values[s.count.id]).toBe(9);
    expect(r4.json().notes).toBe('nota');
    const g = (await c.get('/api/logs?from=2026-10-01&to=2026-10-31')).json();
    expect(g.logs).toHaveLength(1);
    expect(g.logs[0]).toEqual(r4.json());
    expect(typeof g.logs[0].updatedAt).toBe('string');
    expect(g.today).toBe('2026-10-07');
  });
  it('requires values or notes', async () => {
    const s = await setup();
    expect((await api(s.app, s.cookie).put('/api/logs/2026-10-07', {})).statusCode).toBe(400);
  });
  it('rejects notes over 2000 chars', async () => {
    const s = await setup();
    expect((await api(s.app, s.cookie).put('/api/logs/2026-10-07', { notes: 'x'.repeat(2001) })).statusCode).toBe(400);
  });
});

describe('malformed values -> 400', () => {
  it.each([
    ['count -1', (s: any) => ({ [s.count.id]: -1 })],
    ['count string', (s: any) => ({ [s.count.id]: '5' })],
    ['count 2.5', (s: any) => ({ [s.count.id]: 2.5 })],
    ['count too large', (s: any) => ({ [s.count.id]: 100001 })],
    ['check string', (s: any) => ({ [s.check.id]: 'true' })],
    ['prayers missing isya', (s: any) => ({ [s.prayers.id]: { subuh: true, zohor: true, asar: true, maghrib: true } })],
    ['prayers extra key', (s: any) => ({ [s.prayers.id]: { ...ALL, tahajjud: true } })],
    ['prayers non-boolean', (s: any) => ({ [s.prayers.id]: { ...ALL, isya: 1 } })],
    ['nonexistent id', () => ({ '999999': 1 })],
  ])('%s', async (_n, mk) => {
    const s = await setup();
    const r = await api(s.app, s.cookie).put('/api/logs/2026-10-07', { values: mk(s) });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(r.json().error.fields).join()).toMatch(/values\./);
  });
  it('amalan id from another usrah', async () => {
    const s = await setup();
    const other = await seedUsrah(s.app, s.db, 'Lain');
    const theirs = (await api(s.app, other.naqib.cookie).get('/api/amalan')).json() as any[];
    const r = await api(s.app, s.cookie).put('/api/logs/2026-10-07', { values: { [theirs[0].id]: theirs[0].inputType === 'check' ? true : 1 } });
    expect(r.statusCode).toBe(400);
  });
  it('2026-02-30 and junk dates -> 400', async () => {
    const s = await setup();
    expect((await api(s.app, s.cookie).put('/api/logs/2026-02-30', { notes: 'x' })).statusCode).toBe(400);
    expect((await api(s.app, s.cookie).put('/api/logs/abc', { notes: 'x' })).statusCode).toBe(400);
  });
  it('a deactivated amalan can still be corrected', async () => {
    const s = await setup();
    const { amalan } = await import('../src/db/schema.js');
    const { eq } = await import('drizzle-orm');
    s.db.update(amalan).set({ active: false, deactivatedOn: '2026-10-05' }).where(eq(amalan.id, s.check.id)).run();
    expect((await api(s.app, s.cookie).put('/api/logs/2026-10-04', { values: { [s.check.id]: true } })).statusCode).toBe(200);
  });
});

describe('timezone and window', () => {
  it('uses KL date: 16:30Z on Oct 8 is Oct 9 in KL', async () => {
    const s = await setup('2026-10-08T16:30:00Z');
    expect((await api(s.app, s.cookie).put('/api/logs/2026-10-09', { notes: 'a' })).statusCode).toBe(200);
    expect((await api(s.app, s.cookie).put('/api/logs/2026-10-10', { notes: 'a' })).statusCode).toBe(403);
  });
  it('previous month editable through day 7', async () => {
    const s = await setup(KL_OCT_07);
    expect((await api(s.app, s.cookie).put('/api/logs/2026-09-30', { notes: 'a' })).statusCode).toBe(200);
    const g = (await api(s.app, s.cookie).get('/api/logs?from=2026-09-01&to=2026-09-30')).json();
    expect(g.editableFrom).toBe('2026-09-01');
  });
  it('locked from day 8', async () => {
    const s = await setup(KL_OCT_08);
    const r = await api(s.app, s.cookie).put('/api/logs/2026-09-30', { notes: 'a' });
    expect(r.statusCode).toBe(403);
    expect(r.json().error).toEqual({ code: 'LOG_LOCKED', message: 'Log bulan ini sudah dikunci' });
    expect((await api(s.app, s.cookie).get('/api/logs?from=2026-09-01&to=2026-09-30')).json().editableFrom).toBe('2026-10-01');
  });
  it('validation order: bad date 400 before window; window 403 before body 400', async () => {
    const s = await setup(KL_OCT_08);
    expect((await api(s.app, s.cookie).put('/api/logs/2026-02-30', {})).statusCode).toBe(400);
    expect((await api(s.app, s.cookie).put('/api/logs/2026-09-30', {})).statusCode).toBe(403);
  });
});

describe('GET /api/logs range', () => {
  it('rejects bad ranges', async () => {
    const s = await setup();
    const c = api(s.app, s.cookie);
    for (const q of ['', '?from=2026-10-01', '?from=2026-10-05&to=2026-10-01', '?from=2026-02-30&to=2026-03-01', '?from=2025-01-01&to=2026-10-01', '?from=x&to=y'])
      expect((await c.get('/api/logs' + q)).statusCode).toBe(400);
  });
  it('accepts exactly 400 days, rejects 401', async () => {
    const s = await setup();
    const c = api(s.app, s.cookie);
    expect((await c.get('/api/logs?from=2025-09-01&to=2026-10-05')).statusCode).toBe(200); // 400 days inclusive
    expect((await c.get('/api/logs?from=2025-09-01&to=2026-10-06')).statusCode).toBe(400);
  });
});

describe('isolation', () => {
  it('member B never sees member A logs', async () => {
    const s = await setup();
    await api(s.app, s.cookie).put('/api/logs/2026-10-07', { notes: 'rahsia', values: { [s.count.id]: 3 } });
    await api(s.app).post('/api/auth/signup', { name: 'Budi', email: 'b@x.test', password: 'katalaluan123', inviteCode: s.u.inviteCode });
    const b = await loginAs(s.app, 'b@x.test');
    const g = (await api(s.app, b).get('/api/logs?from=2026-10-01&to=2026-10-31')).json();
    expect(g.logs).toEqual([]);
    const own = await api(s.app, b).put('/api/logs/2026-10-07', { notes: 'b' });
    expect(own.json().notes).toBe('b');
    expect(own.json().values).toEqual({});
    const a = (await api(s.app, s.cookie).get('/api/logs?from=2026-10-01&to=2026-10-31')).json();
    expect(a.logs[0].notes).toBe('rahsia');
  });
});

describe("naqib's own amalan", () => {
  it('a naqib logs and reads their own day, sees it in /me/analytics, and stays off the group dashboards (R18)', async () => {
    const s = await setup();
    const n = api(s.app, s.u.naqib.cookie);
    const put = await n.put('/api/logs/2026-10-07', { values: { [s.count.id]: s.count.targetVal } });
    expect(put.statusCode).toBe(200);
    const got = (await n.get('/api/logs?from=2026-10-07&to=2026-10-07')).json();
    expect(got.logs.map((l: any) => [l.date, l.values[s.count.id]])).toEqual([['2026-10-07', s.count.targetVal]]);
    const mine = await n.get('/api/me/analytics');
    expect(mine.statusCode).toBe(200);
    expect(mine.json().heatmap.at(-1).percentage).toBeGreaterThan(0);
    // the member's view of the group is unaffected: the naqib is not a roster/matrix row
    const summary = (await n.get('/api/usrah/summary')).json();
    expect(summary.roster.map((m: any) => m.id)).not.toContain(s.u.naqib.id);
    const matrix = (await n.get('/api/usrah/matrix')).json();
    expect(matrix.rows.map((r: any) => r.memberId)).not.toContain(s.u.naqib.id);
  });
});
