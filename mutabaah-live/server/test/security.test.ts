import { eq } from 'drizzle-orm';
import { makeTestApp, createUser, createTestUsrah, api, loginAs } from './helpers.js';
import { users } from '../src/db/schema.js';
import { verifyPassword } from '../src/auth/password.js';

const ORIGIN = 'http://localhost:3000';
const ERROR_SHAPE = {
  error: { code: expect.stringMatching(/^[A-Z_]+$/), message: expect.any(String) },
};

async function setup(opts: { rateLimit?: boolean; trustProxy?: false | number | string[] } = {}) {
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
  const login = (app: Awaited<ReturnType<typeof setup>>['app'], xff: string, email = 'ahmad@usrah.my') =>
    app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json', origin: ORIGIN, 'x-forwarded-for': xff },
      payload: JSON.stringify({ email, password: 'salah' }),
    });

  it('with trustProxy = 1 hop, the proxy-appended (rightmost) IP decides the key', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    for (let i = 0; i < 10; i++) expect((await login(app, '203.0.113.7')).statusCode).toBe(401);
    expect((await login(app, '203.0.113.7')).statusCode).toBe(429);
    expect((await login(app, '203.0.113.8')).statusCode).toBe(401);
  });

  it('with trustProxy = 1 hop, varying the client-controlled LEFTMOST X-Forwarded-For does not bypass the limit', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    for (let i = 0; i < 10; i++) {
      expect((await login(app, `198.51.100.${i}, 203.0.113.7`)).statusCode).toBe(401);
    }
    expect((await login(app, '198.51.100.250, 203.0.113.7')).statusCode).toBe(429);
  });

  it('with trustProxy as an IP list, only those proxies are trusted', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: ['127.0.0.1'] });
    for (let i = 0; i < 10; i++) {
      expect((await login(app, `198.51.100.${i}, 203.0.113.7`)).statusCode).toBe(401);
    }
    expect((await login(app, '198.51.100.250, 203.0.113.7')).statusCode).toBe(429);
  });

  it('with trustProxy off (default), X-Forwarded-For is ignored', async () => {
    const { app } = await setup({ rateLimit: true });
    for (let i = 0; i < 10; i++) expect((await login(app, `203.0.113.${i}`)).statusCode).toBe(401);
    expect((await login(app, '203.0.113.99')).statusCode).toBe(429);
  });

  it('per-email limit: the 21st attempt within an hour is 429 regardless of client IP', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    // 20 attempts from 20 distinct client IPs (each IP bucket stays far under its 10/15min limit)
    for (let i = 0; i < 20; i++) expect((await login(app, `203.0.113.${i}`)).statusCode).toBe(401);
    const res = await login(app, '203.0.113.200', ' AHMAD@usrah.my ');
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } });
    // another account is unaffected
    expect((await login(app, '203.0.113.201', 'lain@usrah.my')).statusCode).toBe(401);
  });
});

describe('trusted device cookie (per-email lockout resistance)', () => {
  const login = (
    app: Awaited<ReturnType<typeof setup>>['app'],
    xff: string,
    o: { email?: string; password?: string; cookie?: string } = {},
  ) =>
    app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        'content-type': 'application/json',
        origin: ORIGIN,
        'x-forwarded-for': xff,
        ...(o.cookie ? { cookie: o.cookie } : {}),
      },
      payload: JSON.stringify({ email: o.email ?? 'ahmad@usrah.my', password: o.password ?? 'salah' }),
    });
  const didOf = (res: { headers: Record<string, unknown> }) =>
    ([] as string[]).concat((res.headers['set-cookie'] as string[] | string | undefined) ?? []).find((c) => c.startsWith('did='));
  /** An attacker on rotating IPs fills the per-email bucket (an earlier real login may already have used a slot). */
  const exhaustEmail = async (app: Awaited<ReturnType<typeof setup>>['app'], email = 'ahmad@usrah.my') => {
    for (let i = 0; i < 20; i++) expect([401, 429]).toContain((await login(app, `203.0.113.${i}`, { email })).statusCode);
    expect((await login(app, '203.0.113.250', { email })).statusCode).toBe(429);
  };

  it('a successful login sets a long-lived HttpOnly did cookie scoped to /api/auth', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    const res = await login(app, '198.51.100.1', { password: 'katalaluan123' });
    expect(res.statusCode).toBe(200);
    const did = didOf(res);
    expect(did).toBeDefined();
    expect(did).toMatch(/HttpOnly/i);
    expect(did).toMatch(/Path=\/api\/auth/);
    const expires = new Date(/Expires=([^;]+)/i.exec(did!)![1]).getTime();
    expect(expires - Date.parse('2026-10-09T02:00:00.000Z')).toBeGreaterThan(90 * 24 * 3600 * 1000);
  });

  it('a failed login does not set a did cookie', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    expect(didOf(await login(app, '198.51.100.1'))).toBeUndefined();
  });

  it("the member's trusted device still logs in after an attacker fills the per-email limit", async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    const did = didOf(await login(app, '198.51.100.1', { password: 'katalaluan123' }))!.split(';')[0];
    await exhaustEmail(app); // attacker: locked out
    const res = await login(app, '198.51.100.2', { password: 'katalaluan123', cookie: did });
    expect(res.statusCode).toBe(200);
  });

  it("a device cookie only vouches for its own account", async () => {
    const { app, db } = await setup({ rateLimit: true, trustProxy: 1 });
    await createUser(db, { email: 'lain@usrah.my', name: 'Lain', usrahId: createTestUsrah(db) });
    const did = didOf(await login(app, '198.51.100.1', { password: 'katalaluan123' }))!.split(';')[0];
    await exhaustEmail(app, 'lain@usrah.my');
    expect((await login(app, '198.51.100.2', { email: 'lain@usrah.my', cookie: did })).statusCode).toBe(429);
  });

  it('an unknown or forged did cookie is treated as untrusted', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    await exhaustEmail(app);
    expect((await login(app, '198.51.100.2', { password: 'katalaluan123', cookie: 'did=forged' })).statusCode).toBe(429);
  });

  it('a device cookie expires after 180 days', async () => {
    const { app, setNow } = await setup({ rateLimit: true, trustProxy: 1 });
    const did = didOf(await login(app, '198.51.100.1', { password: 'katalaluan123' }))!.split(';')[0];
    setNow('2027-04-10T02:00:00.000Z'); // 183 days later
    await exhaustEmail(app);
    expect((await login(app, '198.51.100.2', { password: 'katalaluan123', cookie: did })).statusCode).toBe(429);
  });

  it('guesses through a trusted device are capped at 20 per hour per device', async () => {
    const { app } = await setup({ rateLimit: true, trustProxy: 1 });
    const did = didOf(await login(app, '198.51.100.1', { password: 'katalaluan123' }))!.split(';')[0];
    for (let i = 0; i < 20; i++) expect((await login(app, `203.0.113.${i}`, { cookie: did })).statusCode).toBe(401);
    expect((await login(app, '203.0.113.200', { password: 'katalaluan123', cookie: did })).statusCode).toBe(429);
  });
});

describe('change-password rate limit', () => {
  it('returns 429 on the 11th attempt within 15 minutes for the same session', async () => {
    const { app } = await setup({ rateLimit: true });
    const cookie = await loginAs(app, 'ahmad@usrah.my');
    for (let i = 0; i < 10; i++) {
      const r = await api(app, cookie).post('/api/auth/change-password', { currentPassword: 'salah-' + i, newPassword: 'barubaru123' });
      expect(r.statusCode).toBe(400);
    }
    const res = await api(app, cookie).post('/api/auth/change-password', { currentPassword: 'katalaluan123', newPassword: 'barubaru123' });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: { code: 'RATE_LIMITED', message: expect.any(String) } });
  });
});

describe('APP_ORIGIN normalisation', () => {
  it.each(['http://localhost:3000/', 'HTTP://LOCALHOST:3000', 'http://localhost:3000/ahli'])(
    'appOrigin %s still accepts requests from http://localhost:3000',
    async (appOrigin) => {
      const { buildApp } = await import('../src/app.js');
      const { openDb, migrateDb } = await import('../src/db/client.js');
      const db = openDb(':memory:');
      migrateDb(db);
      await createUser(db, { email: 'ahmad@usrah.my', name: 'Ahmad', usrahId: createTestUsrah(db) });
      const app = buildApp({ db, appOrigin, rateLimit: false });
      const res = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'content-type': 'application/json', origin: ORIGIN }, payload: body });
      expect(res.statusCode).toBe(200);
      await app.close();
    },
  );

  it('an invalid appOrigin fails at startup', async () => {
    const { buildApp } = await import('../src/app.js');
    const { openDb } = await import('../src/db/client.js');
    expect(() => buildApp({ db: openDb(':memory:'), appOrigin: 'localhost:3000x', rateLimit: false })).toThrow(/APP_ORIGIN/);
  });
});
