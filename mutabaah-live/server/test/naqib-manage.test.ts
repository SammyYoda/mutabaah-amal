import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestApp, seedUsrah, api, loginAs, createUser } from './helpers.js';
import { memberships, sessions, users, dailyLogs } from '../src/db/schema.js';

const NOT_ALLOWED = { code: 'FORBIDDEN', message: 'Tindakan ini tidak dibenarkan' };

async function setup() {
  const t = makeTestApp();
  const a = await seedUsrah(t.app, t.db, 'Usrah A');
  const b = await seedUsrah(t.app, t.db, 'Usrah B');
  const memberId = await createUser(t.db, { email: 'm@x.test', name: 'Ali', usrahId: a.usrahId });
  const memberCookie = await loginAs(t.app, 'm@x.test');
  const otherId = await createUser(t.db, { email: 'o@x.test', name: 'Omar', usrahId: b.usrahId });
  const list = async (cookie: string) => (await api(t.app, cookie).get('/api/amalan')).json() as any[];
  return { ...t, a, b, memberId, memberCookie, otherId, list };
}

describe('member gets 403 everywhere', () => {
  it('all naqib routes', async () => {
    const s = await setup();
    const c = api(s.app, s.memberCookie);
    const rs = [
      await c.post('/api/amalan', {}),
      await c.patch('/api/amalan/1', {}),
      await c.del('/api/amalan/1'),
      await c.get('/api/usrah/invite-code'),
      await c.post('/api/usrah/invite-code/regenerate'),
      await c.post(`/api/members/${s.memberId}/reset-password`),
      await c.del(`/api/members/${s.memberId}`),
    ];
    for (const r of rs) expect(r.statusCode).toBe(403);
  });
});

describe('amalan CRUD', () => {
  const body = { name: 'Qiyam', freq: 'harian', inputType: 'check', targetVal: 1, unit: 'kali' };
  it('creates with defaults', async () => {
    const s = await setup();
    const r = await api(s.app, s.a.naqib.cookie).post('/api/amalan', body);
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ code: '18', description: '', icon: 'check_circle', sort: 17, active: true, createdOn: '2026-10-09', deactivatedOn: null, name: 'Qiyam' });
    expect(Object.keys(r.json()).sort()).toEqual(Object.keys((await s.list(s.a.naqib.cookie))[0]).sort());
    const r2 = await api(s.app, s.a.naqib.cookie).post('/api/amalan', { ...body, code: 'X1', sort: 3 });
    expect(r2.json()).toMatchObject({ code: 'X1', sort: 3 });
    const r3 = await api(s.app, s.a.naqib.cookie).post('/api/amalan', body);
    expect(r3.json().code).toBe('19');
    expect((await s.list(s.b.naqib.cookie)).length).toBe(17);
  });
  it('validates', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    expect((await c.post('/api/amalan', { ...body, targetVal: 0 })).statusCode).toBe(400);
    expect((await c.post('/api/amalan', { ...body, freq: 'x' })).statusCode).toBe(400);
    expect((await c.post('/api/amalan', { name: 'x' })).statusCode).toBe(400);
  });
  it('patch, deactivate/reactivate, delete', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    const id = (await s.list(s.a.naqib.cookie))[0].id;
    expect((await c.patch(`/api/amalan/${id}`, { name: 'Baru', targetVal: 9 })).json()).toMatchObject({ name: 'Baru', targetVal: 9 });
    const off = await c.patch(`/api/amalan/${id}`, { active: false });
    expect(off.json()).toMatchObject({ active: false, deactivatedOn: '2026-10-09' });
    expect((await s.list(s.a.naqib.cookie)).find((x) => x.id === id)).toMatchObject({ active: false, deactivatedOn: '2026-10-09' });
    expect((await c.patch(`/api/amalan/${id}`, { active: true })).json()).toMatchObject({ active: true, deactivatedOn: null });
    const del = await c.del(`/api/amalan/${id}`);
    expect(del.statusCode).toBe(200);
    expect(del.json()).toMatchObject({ id, active: false, deactivatedOn: '2026-10-09' });
  });
  it('other usrah amalan -> 404', async () => {
    const s = await setup();
    const bid = (await s.list(s.b.naqib.cookie))[0].id;
    const c = api(s.app, s.a.naqib.cookie);
    expect((await c.patch(`/api/amalan/${bid}`, { name: 'x' })).statusCode).toBe(404);
    expect((await c.del(`/api/amalan/${bid}`)).statusCode).toBe(404);
    expect((await s.list(s.b.naqib.cookie))[0].active).toBe(true);
  });
  it('inputType change blocked once logged; allowed otherwise; same type ok', async () => {
    const s = await setup();
    const items = await s.list(s.a.naqib.cookie);
    const used = items.find((x) => x.inputType === 'count');
    const unused = items.filter((x) => x.inputType === 'count')[1];
    await api(s.app, s.memberCookie).put('/api/logs/2026-10-08', { values: { [used.id]: 3 } });
    const c = api(s.app, s.a.naqib.cookie);
    const r = await c.patch(`/api/amalan/${used.id}`, { inputType: 'check' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error).toEqual({ code: 'CONFLICT', message: 'Jenis input tidak boleh diubah kerana sudah ada rekod' });
    expect((await c.patch(`/api/amalan/${used.id}`, { inputType: 'count', name: 'ok' })).statusCode).toBe(200);
    expect((await c.patch(`/api/amalan/${unused.id}`, { inputType: 'check' })).statusCode).toBe(200);
  });
});

describe('invite code', () => {
  it('get and regenerate', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    const g = (await c.get('/api/usrah/invite-code')).json();
    expect(g).toEqual({ inviteCode: s.a.inviteCode, link: `http://localhost:3000/#daftar?kod=${s.a.inviteCode}` });
    const r = await c.post('/api/usrah/invite-code/regenerate');
    expect(r.statusCode).toBe(200);
    const n = r.json();
    expect(n.inviteCode).toMatch(/^[A-HJ-NP-Z]{3}-[2-9]{4}$/);
    expect(n.link).toBe(`http://localhost:3000/#daftar?kod=${n.inviteCode}`);
    const su = (code: string, email: string) => api(s.app).post('/api/auth/signup', { name: 'N', email, password: 'katalaluan123', inviteCode: code });
    expect((await su(s.a.inviteCode, 'n1@x.test')).statusCode).toBe(400);
    expect((await su(n.inviteCode, 'n2@x.test')).statusCode).toBe(201);
  });
});

describe('members', () => {
  it('reset-password', async () => {
    const s = await setup();
    const r = await api(s.app, s.a.naqib.cookie).post(`/api/members/${s.memberId}/reset-password`);
    expect(r.statusCode).toBe(200);
    const { temporaryPassword } = r.json();
    expect(temporaryPassword).toHaveLength(12);
    expect(s.db.select().from(sessions).where(eq(sessions.userId, s.memberId)).all()).toHaveLength(0);
    expect((await api(s.app, s.memberCookie).get('/api/amalan')).statusCode).toBe(401);
    const cookie = await loginAs(s.app, 'm@x.test', temporaryPassword);
    const next = await api(s.app, cookie).get('/api/amalan');
    expect(next.statusCode).toBe(403);
    expect(next.json().error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
  it('cannot reset a naqib (incl. self); other usrah and unknown -> 404', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    const second = await createUser(s.db, { email: 'n2@x.test', name: 'N2', usrahId: s.a.usrahId, role: 'naqib' });
    for (const id of [s.a.naqib.id, second]) {
      const r = await c.post(`/api/members/${id}/reset-password`);
      expect(r.statusCode).toBe(403);
      expect(r.json().error).toEqual(NOT_ALLOWED);
    }
    expect((await c.post(`/api/members/${s.otherId}/reset-password`)).statusCode).toBe(404);
    expect((await c.post(`/api/members/99999/reset-password`)).statusCode).toBe(404);
    expect((await c.post(`/api/members/abc/reset-password`)).statusCode).toBe(404);
  });
  it('remove', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    const own = await c.del(`/api/members/${s.a.naqib.id}`);
    expect(own.statusCode).toBe(403);
    expect(own.json().error).toEqual(NOT_ALLOWED);
    const second = await createUser(s.db, { email: 'n2@x.test', name: 'N2', usrahId: s.a.usrahId, role: 'naqib' });
    expect((await c.del(`/api/members/${second}`)).json().error).toEqual(NOT_ALLOWED);
    expect((await c.del(`/api/members/${s.otherId}`)).statusCode).toBe(404);
    expect(s.db.select().from(memberships).where(eq(memberships.userId, s.otherId)).get()!.removedAt).toBeNull();

    const r = await c.del(`/api/members/${s.memberId}`);
    expect(r.statusCode).toBe(204);
    expect(s.db.select().from(memberships).where(eq(memberships.userId, s.memberId)).get()!.removedAt).toEqual(new Date('2026-10-09T02:00:00.000Z'));
    expect(s.db.select().from(sessions).where(eq(sessions.userId, s.memberId)).all()).toHaveLength(0);
    expect((await api(s.app, s.memberCookie).get('/api/amalan')).statusCode).toBe(401);
    expect((await api(s.app).post('/api/auth/login', { email: 'm@x.test', password: 'katalaluan123' })).statusCode).toBe(403);
    // already removed -> 404
    expect((await c.del(`/api/members/${s.memberId}`)).statusCode).toBe(404);
    expect(s.db.select().from(users).where(eq(users.id, s.memberId)).get()).toBeTruthy();
    expect(s.db.select().from(dailyLogs).all()).toHaveLength(0);
  });
});
