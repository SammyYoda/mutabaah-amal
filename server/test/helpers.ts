import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { openDb, migrateDb, type Db } from '../src/db/client.js';
import { buildApp } from '../src/app.js';
import { users, usrah, memberships } from '../src/db/schema.js';
import { loadDefaultAmalan, type DefaultAmalan } from '../src/db/defaultAmalan.js';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../src/auth/password.js';

export const TEST_ORIGIN = 'http://localhost:3000';
export const TEST_PASSWORD = 'katalaluan123';
const DEFAULT_NOW = '2026-10-09T02:00:00.000Z'; // 10:00 in Kuala Lumpur

/** The 17-item IKRAM list; most suites assume it (codes 01..17). */
const IKRAM_AMALAN = loadDefaultAmalan(fileURLToPath(new URL('../../examples/amalan-ikram.json', import.meta.url)));

/** Fresh in-memory DB + app. Rate limiting is off unless `rateLimit: true`. Call app.close() if you need to. */
export function makeTestApp(opts: { defaultAmalan?: DefaultAmalan[]; now?: string; rateLimit?: boolean; trustProxy?: false | number | string[] } = {}) {
  const db = openDb(':memory:');
  migrateDb(db);
  let current = new Date(opts.now ?? DEFAULT_NOW);
  const app = buildApp({ db, now: () => new Date(current), appOrigin: TEST_ORIGIN, rateLimit: opts.rateLimit ?? false, trustProxy: opts.trustProxy, defaultAmalan: opts.defaultAmalan ?? IKRAM_AMALAN });
  return {
    app,
    db,
    setNow(iso: string) {
      current = new Date(iso);
    },
  };
}

let usrahSeq = 0;

/** Inserts a usrah row directly (unique test invite code unless given). Returns its id. */
export function createTestUsrah(db: Db, name = 'Usrah Ujian', inviteCode?: string): number {
  const code = inviteCode ?? `TST-${2000 + ++usrahSeq}`;
  return db.insert(usrah).values({ name, inviteCode: code, createdAt: new Date(DEFAULT_NOW) }).returning().get().id;
}

/**
 * Inserts a user (email normalised, password defaults to 'katalaluan123').
 * Pass usrahId (+ role, default 'member') to also create an active membership.
 */
export async function createUser(
  db: Db,
  u: {
    email: string;
    name: string;
    password?: string;
    isAdmin?: boolean;
    mustChangePassword?: boolean;
    phone?: string | null;
    usrahId?: number;
    role?: 'naqib' | 'member';
    joinedAt?: Date;
  },
): Promise<number> {
  const createdAt = u.joinedAt ?? new Date(DEFAULT_NOW);
  const id = db
    .insert(users)
    .values({
      email: u.email.trim().toLowerCase(),
      name: u.name,
      phone: u.phone ?? null,
      passwordHash: await hashPassword(u.password ?? TEST_PASSWORD),
      isAdmin: u.isAdmin ?? false,
      mustChangePassword: u.mustChangePassword ?? false,
      createdAt,
    })
    .returning()
    .get().id;
  if (u.usrahId !== undefined) {
    db.insert(memberships).values({ userId: id, usrahId: u.usrahId, role: u.role ?? 'member', joinedAt: createdAt }).run();
  }
  return id;
}

/** Logs in via the API and returns the cookie header value `sid=...`. Throws if login fails. */
export async function loginAs(app: FastifyInstance, email: string, password = TEST_PASSWORD): Promise<string> {
  const res = await api(app).post('/api/auth/login', { email, password });
  if (res.statusCode !== 200) throw new Error(`login failed for ${email}: ${res.statusCode} ${res.body}`);
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const sid = setCookie.find((c) => c.startsWith('sid='));
  if (!sid) throw new Error('no sid cookie in login response');
  return sid.split(';')[0];
}

/** Request helpers that send our Origin, a JSON content-type and (optionally) the session cookie. */
export function api(app: FastifyInstance, cookie?: string) {
  const headers = (): Record<string, string> => ({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
    ...(cookie ? { cookie } : {}),
  });
  const send = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown) =>
    app.inject({
      method,
      url,
      headers: headers(),
      ...(body === undefined ? {} : { payload: JSON.stringify(body) }),
    }) as Promise<LightMyRequestResponse>;
  return {
    get: (url: string) => send('GET', url),
    post: (url: string, body?: unknown) => send('POST', url, body),
    put: (url: string, body?: unknown) => send('PUT', url, body),
    patch: (url: string, body?: unknown) => send('PATCH', url, body),
    del: (url: string, body?: unknown) => send('DELETE', url, body),
  };
}

let seedSeq = 0;

/**
 * Creates an admin, a usrah (POST /api/admin/usrah), a naqib invite and the naqib's signup,
 * all through the real endpoints. Returns the usrah id, its member invite code and the naqib's session.
 */
export async function seedUsrah(app: FastifyInstance, db: Db, name = 'Usrah Ujian') {
  const n = ++seedSeq;
  const adminEmail = `admin${n}@seed.test`;
  await createUser(db, { email: adminEmail, name: 'Admin Seed', isAdmin: true });
  const adminCookie = await loginAs(app, adminEmail);
  const created = await api(app, adminCookie).post('/api/admin/usrah', { name });
  if (created.statusCode !== 201) throw new Error(`seed usrah failed: ${created.statusCode} ${created.body}`);
  const { id: usrahId, inviteCode } = created.json() as { id: number; inviteCode: string };
  const inv = await api(app, adminCookie).post(`/api/admin/usrah/${usrahId}/naqib-invite`);
  if (inv.statusCode !== 201) throw new Error(`seed invite failed: ${inv.statusCode} ${inv.body}`);
  const token = new URL((inv.json() as { link: string }).link.replace('/#', '/?#')).hash.split('jemputan=')[1];
  const email = `naqib${n}@seed.test`;
  const signup = await api(app).post('/api/auth/signup', {
    name: 'Naqib Seed',
    email,
    password: TEST_PASSWORD,
    naqibInvite: token,
  });
  if (signup.statusCode !== 201) throw new Error(`seed signup failed: ${signup.statusCode} ${signup.body}`);
  const sid = ([] as string[]).concat(signup.headers['set-cookie'] ?? []).find((c) => c.startsWith('sid='))!;
  return { usrahId, inviteCode, naqib: { id: (signup.json() as { user: { id: number } }).user.id, email, cookie: sid.split(';')[0] } };
}
