import { eq } from 'drizzle-orm';
import { makeTestApp, createUser, createTestUsrah, loginAs, api } from './helpers.js';
import { users, sessions, memberships } from '../src/db/schema.js';
import { requireUser } from '../src/auth/guards.js';

const WRONG = 'Emel atau kata laluan salah';

async function setup() {
  const t = makeTestApp({ now: '2026-10-09T02:00:00.000Z' });
  const usrahId = createTestUsrah(t.db, 'Usrah Al-Fatih');
  const userId = await createUser(t.db, {
    email: 'ahmad@usrah.my',
    name: 'Ahmad',
    usrahId,
    role: 'member',
  });
  return { ...t, usrahId, userId };
}

describe('POST /api/auth/login', () => {
  it('sets an httpOnly SameSite=Lax sid cookie on success', async () => {
    const { app } = await setup();
    const res = await api(app).post('/api/auth/login', { email: 'ahmad@usrah.my', password: 'katalaluan123' });
    expect(res.statusCode).toBe(200);
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/^sid=[^;]+;/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(res.json().user.email).toBe('ahmad@usrah.my');
  });

  it('stores only the SHA-256 hash of the token', async () => {
    const { app, db } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const raw = cookie.slice('sid='.length);
    const rows = db.select().from(sessions).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the identical 401 for a wrong password and an unknown email', async () => {
    const { app } = await setup();
    const a = await api(app).post('/api/auth/login', { email: 'ahmad@usrah.my', password: 'salah-salah' });
    const b = await api(app).post('/api/auth/login', { email: 'tiada@usrah.my', password: 'katalaluan123' });
    expect(a.statusCode).toBe(401);
    expect(b.statusCode).toBe(401);
    expect(a.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: WRONG } });
    expect(b.json()).toEqual(a.json());
  });

  it('normalises the email (trim + lower-case)', async () => {
    const { app } = await setup();
    const res = await api(app).post('/api/auth/login', { email: ' Ahmad@Usrah.MY ', password: 'katalaluan123' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects a malformed body with 400 VALIDATION_ERROR', async () => {
    const { app } = await setup();
    const res = await api(app).post('/api/auth/login', { email: 'ahmad@usrah.my' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a cookie', async () => {
    const { app } = await setup();
    const res = await api(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('returns user, usrah and role', async () => {
    const { app, userId, usrahId } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      user: { id: userId, name: 'Ahmad', email: 'ahmad@usrah.my', phone: null, isAdmin: false, mustChangePassword: false },
      usrah: { id: usrahId, name: 'Usrah Al-Fatih' },
      role: 'member',
    });
  });

  it('works for an admin without a membership (usrah null, role null)', async () => {
    const { app, db } = await setup();
    await createUser(db, { email: 'admin@usrah.my', name: 'Admin', isAdmin: true });
    const cookie = await loginAs(app, 'admin@usrah.my');
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(res.json().usrah).toBeNull();
    expect(res.json().role).toBeNull();
    expect(res.json().user.isAdmin).toBe(true);
  });

  it('returns 401 for a non-admin whose membership was removed after login', async () => {
    const { app, db, userId } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    db.update(memberships).set({ removedAt: new Date('2026-10-09T03:00:00Z') }).where(eq(memberships.userId, userId)).run();
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('login for a non-admin with no active membership', () => {
  it('returns 403 FORBIDDEN with the fixed message and creates no session or cookie', async () => {
    const { app, db } = await setup();
    await createUser(db, { email: 'yatim@usrah.my', name: 'Yatim' });
    const res = await api(app).post('/api/auth/login', { email: 'yatim@usrah.my', password: 'katalaluan123' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'Anda bukan lagi ahli mana-mana usrah. Sila hubungi naqib anda.' },
    });
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(db.select().from(sessions).all()).toHaveLength(0);
  });

  it('still returns the generic 401 for a wrong password', async () => {
    const { app, db } = await setup();
    await createUser(db, { email: 'yatim@usrah.my', name: 'Yatim' });
    const res = await api(app).post('/api/auth/login', { email: 'yatim@usrah.my', password: 'salah-salah' });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: WRONG } });
  });
});

describe('logout and expiry', () => {
  it('logout invalidates the old cookie', async () => {
    const { app } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const out = await api(app, cookie).post('/api/auth/logout');
    expect(out.statusCode).toBe(200);
    expect(String(out.headers['set-cookie'])).toMatch(/^sid=;/);
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('a session past expiresAt is rejected', async () => {
    const { app, setNow } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    setNow('2026-11-08T02:00:01.000Z'); // 30 days + 1s later
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('slides the expiry when fewer than 15 days remain', async () => {
    const { app, db, setNow } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    setNow('2026-10-20T02:00:00.000Z'); // 19 days left: no change
    await api(app, cookie).get('/api/auth/me');
    expect(db.select().from(sessions).get()!.expiresAt.toISOString()).toBe('2026-11-08T02:00:00.000Z');
    setNow('2026-10-30T02:00:00.000Z'); // 9 days left: extend to +30d
    const res = await api(app, cookie).get('/api/auth/me');
    expect(res.statusCode).toBe(200);
    expect(db.select().from(sessions).get()!.expiresAt.toISOString()).toBe('2026-11-29T02:00:00.000Z');
    setNow('2026-11-20T02:00:00.000Z'); // past original expiry, within extended one
    expect((await api(app, cookie).get('/api/auth/me')).statusCode).toBe(200);
  });
});

describe('POST /api/auth/change-password', () => {
  it('rejects a wrong current password with 400', async () => {
    const { app } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const res = await api(app, cookie).post('/api/auth/change-password', {
      currentPassword: 'bukan-ini',
      newPassword: 'katalaluanbaru',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a 7-character new password with 400', async () => {
    const { app } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const res = await api(app, cookie).post('/api/auth/change-password', {
      currentPassword: 'katalaluan123',
      newPassword: '1234567',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.fields).toHaveProperty('newPassword');
  });

  it('succeeds, clears mustChangePassword and the new password works', async () => {
    const { app, db, userId } = await setup();
    db.update(users).set({ mustChangePassword: true }).where(eq(users.id, userId)).run();
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    const res = await api(app, cookie).post('/api/auth/change-password', {
      currentPassword: 'katalaluan123',
      newPassword: 'katalaluanbaru',
    });
    expect(res.statusCode).toBe(200);
    expect(db.select().from(users).where(eq(users.id, userId)).get()!.mustChangePassword).toBe(false);
    expect((await api(app, cookie).get('/api/auth/me')).statusCode).toBe(200);
    await expect(loginAs(app, 'ahmad@usrah.my', 'katalaluanbaru')).resolves.toMatch(/^sid=/);
    await expect(loginAs(app, 'ahmad@usrah.my', 'katalaluan123')).rejects.toThrow();
  });

  it('revokes the user’s other sessions but keeps the current one', async () => {
    const { app } = await setup();
    const a = await loginAs(app, 'ahmad@usrah.my');
    const b = await loginAs(app, 'ahmad@usrah.my');
    const res = await api(app, a).post('/api/auth/change-password', {
      currentPassword: 'katalaluan123',
      newPassword: 'katalaluanbaru',
    });
    expect(res.statusCode).toBe(200);
    expect((await api(app, a).get('/api/auth/me')).statusCode).toBe(200);
    expect((await api(app, b).get('/api/auth/me')).statusCode).toBe(401);
  });
});

describe('mustChangePassword gate', () => {
  it('returns 403 PASSWORD_CHANGE_REQUIRED on other routes, but allows me/change-password/logout', async () => {
    const { app, db, userId } = await setup();
    app.get('/api/stub', { preHandler: requireUser }, async () => ({ ok: true }));
    db.update(users).set({ mustChangePassword: true }).where(eq(users.id, userId)).run();
    const cookie = await loginAs(app, 'ahmad@usrah.my');

    const stub = await api(app, cookie).get('/api/stub');
    expect(stub.statusCode).toBe(403);
    expect(stub.json().error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(typeof stub.json().error.message).toBe('string');

    const me = await api(app, cookie).get('/api/auth/me');
    expect(me.statusCode).toBe(200);
    expect(me.json().user.mustChangePassword).toBe(true);

    await api(app, cookie).post('/api/auth/change-password', {
      currentPassword: 'katalaluan123',
      newPassword: 'katalaluanbaru',
    });
    expect((await api(app, cookie).get('/api/stub')).statusCode).toBe(200);
    expect((await api(app, cookie).post('/api/auth/logout')).statusCode).toBe(200);
  });
});

describe('role guards', () => {
  it('requireNaqib and requireAdmin return 403 FORBIDDEN for other roles', async () => {
    const { app, db, usrahId } = await setup();
    const { requireNaqib, requireAdmin } = await import('../src/auth/guards.js');
    app.get('/api/stub-naqib', { preHandler: requireNaqib }, async (req) => ({ usrahId: req.membership!.usrahId }));
    app.get('/api/stub-admin', { preHandler: requireAdmin }, async (req) => ({ id: req.user.id }));
    await createUser(db, { email: 'naqib@usrah.my', name: 'Naqib', usrahId, role: 'naqib' });
    await createUser(db, { email: 'admin@usrah.my', name: 'Admin', isAdmin: true });
    const member = await loginAs(app, 'ahmad@usrah.my');
    const naqib = await loginAs(app, 'naqib@usrah.my');
    const admin = await loginAs(app, 'admin@usrah.my');

    expect((await api(app).get('/api/stub-naqib')).statusCode).toBe(401);
    const m = await api(app, member).get('/api/stub-naqib');
    expect(m.statusCode).toBe(403);
    expect(m.json().error.code).toBe('FORBIDDEN');
    expect((await api(app, naqib).get('/api/stub-naqib')).json()).toEqual({ usrahId });
    expect((await api(app, naqib).get('/api/stub-admin')).statusCode).toBe(403);
    expect((await api(app, admin).get('/api/stub-admin')).statusCode).toBe(200);
  });
});

describe('createAdmin (CLI core)', () => {
  it('inserts a normalised admin that can log in, and refuses a duplicate email', async () => {
    const { createAdmin } = await import('../src/cli/create-admin.js');
    const { app, db } = makeTestApp();
    const id = await createAdmin(db, { name: 'Pentadbir', email: ' Admin@Usrah.MY ', password: 'rahsia1234' });
    const row = db.select().from(users).where(eq(users.id, id)).get()!;
    expect(row.email).toBe('admin@usrah.my');
    expect(row.isAdmin).toBe(true);
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    await expect(loginAs(app, 'admin@usrah.my', 'rahsia1234')).resolves.toMatch(/^sid=/);
    await expect(createAdmin(db, { name: 'X', email: 'admin@usrah.my', password: 'rahsia1234' })).rejects.toThrow(
      'Emel sudah didaftarkan',
    );
    await expect(createAdmin(db, { name: 'X', email: 'b@usrah.my', password: 'pendek' })).rejects.toThrow();
  });
});

describe('randomTempPassword', () => {
  it('is 12 chars from an unambiguous alphabet', async () => {
    const { randomTempPassword } = await import('../src/auth/password.js');
    for (let i = 0; i < 50; i++) expect(randomTempPassword()).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{12}$/);
  });
});
