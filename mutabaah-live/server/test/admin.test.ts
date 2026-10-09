import { eq } from 'drizzle-orm';
import { makeTestApp, createUser, loginAs, api, seedUsrah, TEST_PASSWORD } from './helpers.js';
import { amalan } from '../src/db/schema.js';

async function admin(t: ReturnType<typeof makeTestApp>) {
  await createUser(t.db, { email: 'adm@x.my', name: 'Adm', isAdmin: true });
  return loginAs(t.app, 'adm@x.my');
}

describe('/api/admin', () => {
  it('non-admin gets 403 on every route', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const a = api(t.app, s.naqib.cookie);
    for (const r of [
      await a.get('/api/admin/usrah'),
      await a.post('/api/admin/usrah', { name: 'X' }),
      await a.patch(`/api/admin/usrah/${s.usrahId}`, { name: 'Y' }),
      await a.post(`/api/admin/usrah/${s.usrahId}/naqib-invite`),
      await a.post(`/api/admin/users/${s.naqib.id}/reset-password`),
    ]) {
      expect(r.statusCode).toBe(403);
    }
    expect((await api(t.app).get('/api/admin/usrah')).statusCode).toBe(401);
  });

  it('create usrah makes 17 amalan with createdOn = today and a valid code', async () => {
    const t = makeTestApp();
    const c = await admin(t);
    const res = await api(t.app, c).post('/api/admin/usrah', { name: 'Baru' });
    expect(res.statusCode).toBe(201);
    expect(res.json().inviteCode).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{3}-[2-9]{4}$/);
    const rows = t.db.select().from(amalan).where(eq(amalan.usrahId, res.json().id)).all();
    expect(rows).toHaveLength(17);
    expect(rows.every((r) => r.createdOn === '2026-10-09')).toBe(true);
    expect((await api(t.app, c).post('/api/admin/usrah', { name: '  ' })).statusCode).toBe(400);
  });

  it('list shows memberCount and naqibName; patch renames', async () => {
    const t = makeTestApp();
    const c = await admin(t);
    const created = await api(t.app, c).post('/api/admin/usrah', { name: 'Kosong' });
    let list = (await api(t.app, c).get("/api/admin/usrah")).json() as any[];
    expect(list.find((u) => u.id === created.json().id)).toMatchObject({ memberCount: 0, naqibName: null });
    const s = await seedUsrah(t.app, t.db, 'Penuh');
    await api(t.app).post('/api/auth/signup', { name: 'Ali', email: 'ali@x.my', password: TEST_PASSWORD, inviteCode: s.inviteCode });
    list = (await api(t.app, c).get('/api/admin/usrah')).json();
    expect(list.find((u) => u.id === s.usrahId)).toMatchObject({ memberCount: 2, naqibName: 'Naqib Seed', name: 'Penuh' });
    const p = await api(t.app, c).patch(`/api/admin/usrah/${s.usrahId}`, { name: 'Ditukar' });
    expect(p.statusCode).toBe(200);
    expect(p.json().name).toBe('Ditukar');
    expect((await api(t.app, c).patch('/api/admin/usrah/9999', { name: 'x' })).statusCode).toBe(404);
  });

  it('reset-password', async () => {
    const t = makeTestApp();
    const c = await admin(t);
    const s = await seedUsrah(t.app, t.db);
    const res = await api(t.app, c).post(`/api/admin/users/${s.naqib.id}/reset-password`);
    expect(res.statusCode).toBe(200);
    const temp = res.json().temporaryPassword as string;
    expect((await api(t.app, s.naqib.cookie).get('/api/auth/me')).statusCode).toBe(401);
    expect((await api(t.app).post('/api/auth/login', { email: s.naqib.email, password: TEST_PASSWORD })).statusCode).toBe(401);
    const fresh = await loginAs(t.app, s.naqib.email, temp);
    expect((await api(t.app, fresh).get('/api/auth/me')).json().user.mustChangePassword).toBe(true);
    expect((await api(t.app, c).post('/api/admin/users/9999/reset-password')).statusCode).toBe(404);
  });
});
