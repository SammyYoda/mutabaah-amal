import { eq } from 'drizzle-orm';
import { makeTestApp, createUser, loginAs, api, seedUsrah, TEST_PASSWORD } from './helpers.js';
import { memberships, notifications, naqibInvites, users } from '../src/db/schema.js';
import { regenerateInviteCode } from '../src/services/usrah.js';

const body = (o: Record<string, unknown> = {}) => ({ name: 'Ali', email: 'ali@x.my', password: TEST_PASSWORD, ...o });

async function adminInvite(t: ReturnType<typeof makeTestApp>, usrahId: number) {
  await createUser(t.db, { email: 'adm@x.my', name: 'Adm', isAdmin: true });
  const c = await loginAs(t.app, 'adm@x.my');
  const res = await api(t.app, c).post(`/api/admin/usrah/${usrahId}/naqib-invite`);
  const token = res.json().link.split('jemputan=')[1] as string;
  return { token, expiresAt: new Date(res.json().expiresAt) };
}

describe('POST /api/auth/signup', () => {
  it('member code: 201, role member, logged in, naqib notified', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db, 'Al-Fatih');
    const res = await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode }));
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe('member');
    expect(res.json().usrah.id).toBe(s.usrahId);
    const cookie = String(res.headers['set-cookie']).split(';')[0];
    expect((await api(t.app, cookie).get('/api/auth/me')).statusCode).toBe(200);
    const n = t.db.select().from(notifications).where(eq(notifications.userId, s.naqib.id)).all();
    expect(n).toHaveLength(1);
    expect(n[0].text.startsWith('Ahli baru: ')).toBe(true);
    expect(n[0].type).toBe('member_joined');
  });

  it('code is case-insensitive and trimmed', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const res = await api(t.app).post('/api/auth/signup', body({ inviteCode: `  ${s.inviteCode.toLowerCase()} ` }));
    expect(res.statusCode).toBe(201);
  });

  it('unknown code -> 400', async () => {
    const t = makeTestApp();
    const res = await api(t.app).post('/api/auth/signup', body({ inviteCode: 'ZZZ-2222' }));
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toBe('Kod jemputan tidak sah');
  });

  it('duplicate email in different case/spacing -> 409', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    expect((await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode }))).statusCode).toBe(201);
    const res = await api(t.app).post('/api/auth/signup', body({ email: '  ALI@x.my ', inviteCode: s.inviteCode }));
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
    expect(res.json().error.message).toBe('Emel sudah didaftarkan');
  });

  it('short password -> 400; both or neither code -> 400', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    expect((await api(t.app).post('/api/auth/signup', body({ password: '1234567', inviteCode: s.inviteCode }))).statusCode).toBe(400);
    expect((await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode, naqibInvite: 'abc' }))).statusCode).toBe(400);
    expect((await api(t.app).post('/api/auth/signup', body())).statusCode).toBe(400);
  });

  it('regenerated code invalidates the old one', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const fresh = regenerateInviteCode(t.db, s.usrahId);
    expect(fresh).not.toBe(s.inviteCode);
    expect((await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode }))).statusCode).toBe(400);
    expect((await api(t.app).post('/api/auth/signup', body({ inviteCode: fresh }))).statusCode).toBe(201);
  });

  it('naqib invite -> role naqib; single use', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const { token } = await adminInvite(t, s.usrahId);
    const res = await api(t.app).post('/api/auth/signup', body({ naqibInvite: token }));
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe('naqib');
    expect(t.db.select().from(naqibInvites).where(eq(naqibInvites.usedAt, naqibInvites.usedAt)).all().some((r) => r.usedAt)).toBe(true);
    const again = await api(t.app).post('/api/auth/signup', body({ email: 'b@x.my', naqibInvite: token }));
    expect(again.statusCode).toBe(400);
    expect(again.json().error.message).toBe('Kod jemputan tidak sah');
    expect(t.db.select().from(users).where(eq(users.email, 'b@x.my')).all()).toHaveLength(0);
  });

  it('naqib invite valid at expiresAt, rejected 1ms after', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const a = await adminInvite(t, s.usrahId);
    t.setNow(new Date(a.expiresAt.getTime() + 1).toISOString());
    expect((await api(t.app).post('/api/auth/signup', body({ naqibInvite: a.token }))).statusCode).toBe(400);
    t.setNow(a.expiresAt.toISOString());
    expect((await api(t.app).post('/api/auth/signup', body({ naqibInvite: a.token }))).statusCode).toBe(201);
  });

  it('expiresAt is 7 days after now', async () => {
    const t = makeTestApp({ now: '2026-10-09T02:00:00.000Z' });
    const s = await seedUsrah(t.app, t.db);
    const a = await adminInvite(t, s.usrahId);
    expect(a.expiresAt.toISOString()).toBe('2026-10-16T02:00:00.000Z');
  });

  it('one active membership per user (unique index holds)', async () => {
    const t = makeTestApp();
    const s = await seedUsrah(t.app, t.db);
    const res = await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode }));
    const uid = res.json().user.id as number;
    expect(() =>
      t.db.insert(memberships).values({ userId: uid, usrahId: s.usrahId, role: 'member', joinedAt: new Date() }).run(),
    ).toThrow();
    // signing up again with the same account email is a conflict
    expect((await api(t.app).post('/api/auth/signup', body({ inviteCode: s.inviteCode }))).statusCode).toBe(409);
  });

  it('rate limit: 11th signup in an hour -> 429', async () => {
    const t = makeTestApp({ rateLimit: true });
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await api(t.app).post('/api/auth/signup', body({ email: `u${i}@x.my`, inviteCode: 'ZZZ-2222' }))).statusCode;
      if (i < 10) expect(last).toBe(400);
    }
    expect(last).toBe(429);
  });
});
