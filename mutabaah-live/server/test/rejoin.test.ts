import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestApp, seedUsrah, api, loginAs, createUser, TEST_PASSWORD } from './helpers.js';
import { memberships, notifications, users } from '../src/db/schema.js';

async function setup() {
  const t = makeTestApp();
  const a = await seedUsrah(t.app, t.db, 'Usrah A');
  const b = await seedUsrah(t.app, t.db, 'Usrah B');
  const memberId = await createUser(t.db, { email: 'm@x.test', name: 'Ali', phone: '011', usrahId: a.usrahId });
  const mc = await loginAs(t.app, 'm@x.test');
  const items = (await api(t.app, a.naqib.cookie).get('/api/amalan')).json() as any[];
  const countA = items.find((x) => x.inputType === 'count');
  const itemsB = (await api(t.app, b.naqib.cookie).get('/api/amalan')).json() as any[];
  const countB = itemsB.find((x) => x.inputType === 'count');
  await api(t.app, mc).put('/api/logs/2026-10-08', { values: { [countA.id]: 4 }, notes: 'lama' });
  await api(t.app, a.naqib.cookie).del(`/api/members/${memberId}`);
  const signup = (code: string, over: object = {}) =>
    api(t.app).post('/api/auth/signup', { name: 'Nama Lain', email: 'M@x.test', password: TEST_PASSWORD, phone: '999', inviteCode: code, ...over });
  return { ...t, a, b, memberId, countA, countB, signup };
}

describe('rejoin', () => {
  it('same usrah: 201 member, old logs visible, profile unchanged, naqib notified', async () => {
    const s = await setup();
    const r = await s.signup(s.a.inviteCode);
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ role: 'member', usrah: { id: s.a.usrahId } });
    expect(r.json().user.id).toBe(s.memberId);
    const u = s.db.select().from(users).where(eq(users.id, s.memberId)).get()!;
    expect(u.name).toBe('Ali');
    expect(u.phone).toBe('011');
    expect(s.db.select().from(memberships).where(eq(memberships.userId, s.memberId)).all()).toHaveLength(2);
    const cookie = ([] as string[]).concat(r.headers['set-cookie'] as any).find((c) => c.startsWith('sid='))!.split(';')[0];
    const logs = (await api(s.app, cookie).get('/api/logs?from=2026-10-01&to=2026-10-31')).json().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0].notes).toBe('lama');
    const n = s.db.select().from(notifications).where(eq(notifications.userId, s.a.naqib.id)).all();
    expect(n.filter((x) => x.type === 'member_joined')).toHaveLength(1);
  });
  it('different usrah: old logs hidden; PUT same date starts fresh', async () => {
    const s = await setup();
    const r = await s.signup(s.b.inviteCode);
    expect(r.statusCode).toBe(201);
    expect(r.json().usrah.id).toBe(s.b.usrahId);
    const cookie = ([] as string[]).concat(r.headers['set-cookie'] as any).find((c) => c.startsWith('sid='))!.split(';')[0];
    const c = api(s.app, cookie);
    expect((await c.get('/api/logs?from=2026-10-01&to=2026-10-31')).json().logs).toEqual([]);
    const put = await c.put('/api/logs/2026-10-08', { values: { [s.countB.id]: 2 } });
    expect(put.json().values).toEqual({ [s.countB.id]: 2 });
    expect(put.json().notes).toBe('');
    const got = (await c.get('/api/logs?from=2026-10-01&to=2026-10-31')).json().logs;
    expect(got).toHaveLength(1);
    expect(got[0].values).toEqual({ [s.countB.id]: 2 });
    expect(got[0].notes).toBe('');
  });
  it('naqib invite rejoin consumes the invite', async () => {
    const s = await setup();
    await createUser(s.db, { email: 'adm@x.test', name: 'Adm', isAdmin: true });
    const admin = await loginAs(s.app, 'adm@x.test');
    const inv = await api(s.app, admin).post(`/api/admin/usrah/${s.b.usrahId}/naqib-invite`);
    const token = (inv.json().link as string).split('jemputan=')[1];
    const r = await api(s.app).post('/api/auth/signup', { name: 'x', email: 'm@x.test', password: TEST_PASSWORD, naqibInvite: token });
    expect(r.statusCode).toBe(201);
    expect(r.json().role).toBe('naqib');
    const again = await api(s.app).post('/api/auth/signup', { name: 'x', email: 'z@x.test', password: TEST_PASSWORD, naqibInvite: token });
    expect(again.statusCode).toBe(400);
  });
  it('wrong password -> 409 same message', async () => {
    const s = await setup();
    const r = await s.signup(s.a.inviteCode, { password: 'salahsalah1' });
    expect(r.statusCode).toBe(409);
    expect(r.json().error.message).toBe('Emel sudah didaftarkan');
  });
  it('bad code still 400; active member -> 409; admin -> 409', async () => {
    const s = await setup();
    expect((await s.signup('AAA-2222')).statusCode).toBe(400);
    expect((await s.signup(s.a.inviteCode)).statusCode).toBe(201);
    expect((await s.signup(s.b.inviteCode)).statusCode).toBe(409);
    await createUser(s.db, { email: 'adm@x.test', name: 'Adm', isAdmin: true });
    const r = await api(s.app).post('/api/auth/signup', { name: 'x', email: 'adm@x.test', password: TEST_PASSWORD, inviteCode: s.a.inviteCode });
    expect(r.statusCode).toBe(409);
  });
});
