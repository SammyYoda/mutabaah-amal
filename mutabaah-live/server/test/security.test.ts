import { eq } from 'drizzle-orm';
import { makeTestApp, createUser, createTestUsrah, api, loginAs } from './helpers.js';
import { users } from '../src/db/schema.js';
import { verifyPassword } from '../src/auth/password.js';

const ORIGIN = 'http://localhost:3000';
const ERROR_SHAPE = {
  error: { code: expect.stringMatching(/^[A-Z_]+$/), message: expect.any(String) },
};

async function setup(opts: { rateLimit?: boolean; trustProxy?: boolean } = {}) {
  const t = makeTestApp(opts);
  const usrahId = createTestUsrah(t.db);
  await createUser(t.db, { email: 'ahmad@usrah.my', name: 'Ahmad', usrahId, role: 'member' });
  return t;
}

const body = JSON.stringify({ email: 'ahmad@usrah.my', password: 'katalaluan123' });

describe('CSRF / Origin checks', () => {
  it('rejects a POST without Origin with 403', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: body,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  });

  it('rejects a POST with a foreign Origin with 403', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      payload: body,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('rejects a POST with text/plain with 403', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'text/plain', origin: ORIGIN },
      payload: body,
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('rejects mutating requests to unknown /api routes with 403 before routing', async () => {
    const { app } = await setup();
    const res = await app.inject({ method: 'DELETE', url: '/api/nothing-here' });
    expect(res.statusCode).toBe(403);
  });

  it('applies to percent-encoded paths that route to /api (e.g. /%61pi/...)', async () => {
    const { app, db } = await setup();
    const cookie = await loginAs(app, 'ahmad@usrah.my');

    const logout = await app.inject({ method: 'POST', url: '/%61pi/auth/logout', headers: { cookie } });
    expect(logout.statusCode).toBe(403);

    const textPlain = await app.inject({
      method: 'POST',
      url: '/%61pi/auth/logout',
      headers: { cookie, 'content-type': 'text/plain', origin: ORIGIN },
      payload: 'x',
    });
    expect(textPlain.statusCode).toBe(403);

    const change = await app.inject({
      method: 'POST',
      url: '/%61pi/auth/change-password',
      headers: { cookie, 'content-type': 'application/json', origin: 'https://evil.example' },
      payload: JSON.stringify({ currentPassword: 'katalaluan123', newPassword: 'dirampas123' }),
    });
    expect(change.statusCode).toBe(403);
    expect(change.json().error.code).toBe('FORBIDDEN');
    const row = db.select().from(users).where(eq(users.email, 'ahmad@usrah.my')).get()!;
    expect(await verifyPassword(row.passwordHash, 'katalaluan123')).toBe(true);
    // session still valid (logout was blocked)
    expect((await api(app, cookie).get('/api/auth/me')).statusCode).toBe(200);
  });

  it('applies to mutating requests on any path', async () => {
    const { app } = await setup();
    const res = await app.inject({ method: 'POST', url: '/anything', headers: { 'content-type': 'text/plain' } });
    expect(res.statusCode).toBe(403);
  });

  it('accepts application/json; charset=utf-8 and an empty JSON body', async () => {
    const { app } = await setup();
    const ok = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json; charset=utf-8', origin: ORIGIN },
      payload: body,
    });
    expect(ok.statusCode).toBe(200);
    const empty = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
    });
    expect(empty.statusCode).toBe(200);
  });

  it('maps invalid JSON to 400 VALIDATION_ERROR', async () => {
    const { app } = await setup();
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json', origin: ORIGIN },
      payload: '{nope',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: { code: 'VALIDATION_ERROR', message: expect.any(String) } });
  });
});

describe('rate limiting', () => {
  it('returns 429 RATE_LIMITED on the 11th failed login within 15 minutes', async () => {
    const { app } = await setup({ rateLimit: true });
    for (let i = 0; i < 10; i++) {
      const r = await api(app).post('/api/auth/login', { email: 'ahmad@usrah.my', password: 'salah-' + i });
      expect(r.statusCode).toBe(401);
    }
    const res = await api(app).post('/api/auth/login', { email: ' AHMAD@usrah.my', password: 'salah' });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } });
    // a different email from the same IP is a different bucket
    const other = await api(app).post('/api/auth/login', { email: 'lain@usrah.my', password: 'salah' });
    expect(other.statusCode).toBe(401);
  });

  it('is off by default in makeTestApp', async () => {
    const { app } = await setup();
    for (let i = 0; i < 12; i++) {
      const r = await api(app).post('/api/auth/login', { email: 'ahmad@usrah.my', password: 'salah' });
      expect(r.statusCode).toBe(401);
    }
  });
});

describe('error format and headers', () => {
  it('every error body matches { error: { code, message } }', async () => {
    const { app } = await setup();
    const responses = [
      await api(app).get('/api/auth/me'),
      await api(app).get('/api/does-not-exist'),
      await api(app).post('/api/auth/login', { email: 'x@y.my', password: 'salah' }),
      await api(app).post('/api/auth/login', {}),
      await app.inject({ method: 'POST', url: '/api/auth/login' }),
    ];
    for (const r of responses) {
      expect(r.statusCode).toBeGreaterThanOrEqual(400);
      expect(r.json()).toMatchObject(ERROR_SHAPE);
    }
    expect(responses[1].statusCode).toBe(404);
    expect(responses[1].json().error.code).toBe('NOT_FOUND');
  });

  it('maps unexpected errors to 500 INTERNAL without leaking details', async () => {
    const { app } = await setup();
    app.get('/api/boom', async () => {
      throw new Error('secret stack detail');
    });
    const res = await api(app).get('/api/boom');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'INTERNAL', message: 'Ralat pelayan' } });
  });

  it('responses carry helmet headers', async () => {
    const { app } = await setup();
    const res = await api(app).get('/api/auth/me');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('static SPA serving (staticDir)', () => {
  it('serves files, falls back to index.html for non-/api GETs, and 404s JSON for unknown /api', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { buildApp } = await import('../src/app.js');
    const { openDb, migrateDb } = await import('../src/db/client.js');
    const dir = mkdtempSync(join(tmpdir(), 'mutabaah-web-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<!doctype html><title>SPA</title>');
      writeFileSync(join(dir, 'app.js'), 'console.log(1)');
      const db = openDb(':memory:');
      migrateDb(db);
      const app = buildApp({ db, appOrigin: ORIGIN, rateLimit: false, staticDir: dir });
      expect((await app.inject({ url: '/app.js' })).body).toBe('console.log(1)');
      const spa = await app.inject({ url: '/ahli/hari-ini' });
      expect(spa.statusCode).toBe(200);
      expect(spa.body).toContain('<title>SPA</title>');
      const apiMiss = await app.inject({ url: '/api/nope' });
      expect(apiMiss.statusCode).toBe(404);
      expect(apiMiss.json()).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
      await app.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('trustProxy and the login rate-limit key', () => {
  const login = (app: Awaited<ReturnType<typeof setup>>['app'], xff: string) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': xff },
      payload: JSON.stringify({ email: 'ahmad@usrah.my', password: 'salah' }),
    });

  it('with trustProxy on, X-Forwarded-For decides the key (other clients are not limited)', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: true });
    for (let i = 0; i < 10; i++) expect((await login(app, '203.0.113.7')).statusCode).toBe(401);
    expect((await login(app, '203.0.113.7')).statusCode).toBe(429);
    expect((await login(app, '203.0.113.8')).statusCode).toBe(401);
  });

  it('with trustProxy off (default), X-Forwarded-For is ignored', async () => {
    const { app } = await setup({ rateLimit: true });
    for (let i = 0; i < 10; i++) expect((await login(app, `203.0.113.${i}`)).statusCode).toBe(401);
    expect((await login(app, '203.0.113.99')).statusCode).toBe(429);
  });
});
