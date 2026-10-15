import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestApp, seedUsrah, api, loginAs, createUser } from './helpers.js';
import { notifications, memberships } from '../src/db/schema.js';

async function setup() {
  const t = makeTestApp();
  const a = await seedUsrah(t.app, t.db, 'Usrah A');
  const b = await seedUsrah(t.app, t.db, 'Usrah B');
  const ali = await createUser(t.db, { email: 'ali@x.test', name: 'Ali', usrahId: a.usrahId });
  const siti = await createUser(t.db, { email: 'siti@x.test', name: 'Siti', usrahId: a.usrahId });
  const omar = await createUser(t.db, { email: 'omar@x.test', name: 'Omar', usrahId: b.usrahId });
  const aliC = await loginAs(t.app, 'ali@x.test');
  const sitiC = await loginAs(t.app, 'siti@x.test');
  const omarC = await loginAs(t.app, 'omar@x.test');
  const send = (cookie: string, over: Record<string, unknown> = {}) =>
    api(t.app, cookie).post('/api/guidance', { toUserId: null, category: 'tilawah', title: 'Tajuk', body: 'Isi bimbingan', ...over });
  const notifsOf = (uid: number) => t.db.select().from(notifications).where(eq(notifications.userId, uid)).all();
  return { ...t, a, b, ali, siti, omar, aliC, sitiC, omarC, send, notifsOf };
}

describe('guidance', () => {
  it('personal guidance is private; reply by other member / other usrah is 404', async () => {
    const s = await setup();
    const r = await s.send(s.a.naqib.cookie, { toUserId: s.ali, title: 'Untuk Ali' });
    expect(r.statusCode).toBe(201);
    const item = r.json();
    expect(item).toMatchObject({ toUserId: s.ali, toName: 'Ali', category: 'tilawah', title: 'Untuk Ali', reference: null, read: true, replies: [] });
    expect(typeof item.fromName).toBe('string');
    expect(item.createdAt).toMatch(/Z$/);
    expect((await api(s.app, s.aliC).get('/api/guidance')).json()).toHaveLength(1);
    expect((await api(s.app, s.sitiC).get('/api/guidance')).json()).toHaveLength(0);
    expect((await api(s.app, s.omarC).get('/api/guidance')).json()).toHaveLength(0);
    expect((await api(s.app, s.sitiC).post(`/api/guidance/${item.id}/replies`, { body: 'hai' })).statusCode).toBe(404);
    expect((await api(s.app, s.omarC).post(`/api/guidance/${item.id}/read`)).statusCode).toBe(404);
    expect((await api(s.app, s.b.naqib.cookie).post(`/api/guidance/${item.id}/replies`, { body: 'hai' })).statusCode).toBe(404);
    expect(s.notifsOf(s.siti)).toHaveLength(0);
    expect(s.notifsOf(s.ali)).toHaveLength(1);
  });

  it('usrah-wide guidance reaches every member with a notification; naqib sees all', async () => {
    const s = await setup();
    await s.send(s.a.naqib.cookie, { title: 'Semua' });
    for (const [c, id] of [[s.aliC, s.ali], [s.sitiC, s.siti]] as const) {
      expect((await api(s.app, c).get('/api/guidance')).json()).toHaveLength(1);
      const n = s.notifsOf(id);
      expect(n).toHaveLength(1);
      expect(n[0]).toMatchObject({ type: 'guidance', text: 'Bimbingan baharu: Semua', link: '#bimbingan' });
    }
    expect(s.notifsOf(s.omar)).toHaveLength(0);
    expect((await api(s.app, s.omarC).get('/api/guidance')).json()).toHaveLength(0);
  });

  it('replies notify the other party, never the author; ordering', async () => {
    const s = await setup();
    const item = (await s.send(s.a.naqib.cookie, { toUserId: s.ali, title: 'T1' })).json();
    const rep = await api(s.app, s.aliC).post(`/api/guidance/${item.id}/replies`, { body: 'Baik' });
    expect(rep.statusCode).toBe(201);
    expect(rep.json()).toMatchObject({ userName: 'Ali', body: 'Baik' });
    expect(rep.json().createdAt).toMatch(/Z$/);
    const nq = s.notifsOf(s.a.naqib.id).filter((n) => n.type === 'guidance_reply');
    expect(nq).toHaveLength(1);
    expect(nq[0].text).toBe('Ali membalas bimbingan: T1');
    expect(s.notifsOf(s.ali).filter((n) => n.type === 'guidance_reply')).toHaveLength(0);
    await api(s.app, s.a.naqib.cookie).post(`/api/guidance/${item.id}/replies`, { body: 'Syabas' });
    expect(s.notifsOf(s.ali).filter((n) => n.type === 'guidance_reply')).toHaveLength(1);
    // whole-usrah item: naqib reply notifies all members
    const all = (await s.send(s.a.naqib.cookie, { title: 'T2' })).json();
    await api(s.app, s.a.naqib.cookie).post(`/api/guidance/${all.id}/replies`, { body: 'x' });
    expect(s.notifsOf(s.siti).filter((n) => n.type === 'guidance_reply')).toHaveLength(1);
    const list = (await api(s.app, s.aliC).get('/api/guidance')).json();
    expect(list.map((i: any) => i.title)).toEqual(['T2', 'T1']);
    expect(list[1].replies.map((r: any) => r.body)).toEqual(['Baik', 'Syabas']);
    expect((await api(s.app, s.aliC).post(`/api/guidance/${item.id}/replies`, { body: '' })).statusCode).toBe(400);
  });

  it('read state is per user', async () => {
    const s = await setup();
    const item = (await s.send(s.a.naqib.cookie)).json();
    expect((await api(s.app, s.aliC).get('/api/guidance')).json()[0].read).toBe(false);
    expect((await api(s.app, s.aliC).post(`/api/guidance/${item.id}/read`)).statusCode).toBe(204);
    expect((await api(s.app, s.aliC).post(`/api/guidance/${item.id}/read`)).statusCode).toBe(204);
    expect((await api(s.app, s.aliC).get('/api/guidance')).json()[0].read).toBe(true);
    expect((await api(s.app, s.sitiC).get('/api/guidance')).json()[0].read).toBe(false);
  });

  it('validation and authorisation on POST', async () => {
    const s = await setup();
    expect((await s.send(s.aliC)).statusCode).toBe(403);
    expect((await s.send(s.a.naqib.cookie, { toUserId: s.omar })).statusCode).toBe(404);
    expect((await s.send(s.a.naqib.cookie, { toUserId: s.a.naqib.id })).statusCode).toBe(404);
    expect((await s.send(s.a.naqib.cookie, { category: 'lain' })).statusCode).toBe(400);
    expect((await s.send(s.a.naqib.cookie, { title: '' })).statusCode).toBe(400);
    expect((await s.send(s.a.naqib.cookie, { reference: 'x'.repeat(501) })).statusCode).toBe(400);
    s.db.update(memberships).set({ removedAt: new Date() }).where(eq(memberships.userId, s.siti)).run();
    expect((await s.send(s.a.naqib.cookie, { toUserId: s.siti })).statusCode).toBe(404);
    expect((await api(s.app).get('/api/guidance')).statusCode).toBe(401);
  });

  it('GET /api/members/:id lists the member personal guidance only', async () => {
    const s = await setup();
    await s.send(s.a.naqib.cookie, { toUserId: s.ali, title: 'P1' });
    await s.send(s.a.naqib.cookie, { toUserId: s.siti, title: 'P2' });
    await s.send(s.a.naqib.cookie, { title: 'Semua' });
    const r = await api(s.app, s.a.naqib.cookie).get(`/api/members/${s.ali}`);
    expect(r.json().guidance.map((g: any) => g.title)).toEqual(['P1']);
  });
});

describe('notifications', () => {
  it('lists latest 50 newest first and read-all marks them', async () => {
    const s = await setup();
    await s.send(s.a.naqib.cookie, { title: 'A' });
    s.setNow('2026-10-09T03:00:00Z');
    await s.send(s.a.naqib.cookie, { title: 'B' });
    const l = (await api(s.app, s.aliC).get('/api/notifications')).json();
    expect(l.map((n: any) => n.text)).toEqual(['Bimbingan baharu: B', 'Bimbingan baharu: A']);
    expect(l[0]).toMatchObject({ type: 'guidance', link: '#bimbingan', read: false });
    expect(l[0].createdAt).toMatch(/Z$/);
    expect((await api(s.app, s.aliC).post('/api/notifications/read-all')).statusCode).toBe(204);
    expect((await api(s.app, s.aliC).get('/api/notifications')).json().every((n: any) => n.read)).toBe(true);
    expect((await api(s.app, s.sitiC).get('/api/notifications')).json().every((n: any) => !n.read)).toBe(true);
    expect((await api(s.app).get('/api/notifications')).statusCode).toBe(401);
  });
});
