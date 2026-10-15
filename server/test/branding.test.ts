import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { parseBranding, renderIndexHtml, DEFAULT_BRANDING } from '../src/branding.js';
import { buildApp } from '../src/app.js';
import { openDb, migrateDb } from '../src/db/client.js';
import { users } from '../src/db/schema.js';
import { createUser, createTestUsrah, loginAs, api, TEST_ORIGIN } from './helpers.js';

describe('parseBranding', () => {
  it('defaults when unset, blank or whitespace-only', () => {
    expect(parseBranding({})).toEqual(DEFAULT_BRANDING);
    expect(parseBranding({ APP_NAME: '   ', ORG_NAME: '\t ' })).toEqual(DEFAULT_BRANDING);
    expect(DEFAULT_BRANDING).toEqual({ appName: "Mutaba'ah Amal", orgName: null });
  });
  it('trims and returns given values', () => {
    expect(parseBranding({ APP_NAME: ' Amal Kita ', ORG_NAME: ' Masjid Al-Falah ' })).toEqual({
      appName: 'Amal Kita',
      orgName: 'Masjid Al-Falah',
    });
  });
  it('rejects values over 80 chars or containing newlines', () => {
    expect(() => parseBranding({ APP_NAME: 'a'.repeat(81) })).toThrow(/APP_NAME/);
    expect(() => parseBranding({ ORG_NAME: 'a'.repeat(81) })).toThrow(/ORG_NAME/);
    expect(() => parseBranding({ APP_NAME: 'a\nb' })).toThrow(/APP_NAME/);
    expect(() => parseBranding({ ORG_NAME: 'a\rb' })).toThrow(/ORG_NAME/);
    expect(parseBranding({ APP_NAME: 'a'.repeat(80) }).appName).toHaveLength(80);
  });
});

describe('renderIndexHtml', () => {
  it('escapes HTML and replaces every occurrence', () => {
    expect(renderIndexHtml('<title>{{APP_NAME}}</title>', { appName: '<b>"x"&', orgName: null })).toBe(
      '<title>&lt;b&gt;&quot;x&quot;&amp;</title>',
    );
    expect(renderIndexHtml("{{APP_NAME}}|{{APP_NAME}}", { appName: "a'b", orgName: null })).toBe('a&#39;b|a&#39;b');
  });
  it('renders ORG_NAME as empty when null', () => {
    expect(renderIndexHtml('[{{ORG_NAME}}]', { appName: 'x', orgName: null })).toBe('[]');
    expect(renderIndexHtml('[{{ORG_NAME}}]', { appName: 'x', orgName: 'M&M' })).toBe('[M&amp;M]');
  });
});

function mkApp(extra: Partial<Parameters<typeof buildApp>[0]> = {}) {
  const db = openDb(':memory:');
  migrateDb(db);
  const app = buildApp({ db, appOrigin: TEST_ORIGIN, rateLimit: false, ...extra });
  return { app, db };
}

describe('GET /api/config', () => {
  it('returns the branding without a cookie', async () => {
    const { app } = mkApp({ branding: { appName: 'Amal Kita', orgName: 'Masjid Al-Falah' } });
    const res = await api(app).get('/api/config');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ appName: 'Amal Kita', orgName: 'Masjid Al-Falah' });
  });
  it('uses default branding when the option is omitted', async () => {
    const { app } = mkApp();
    expect((await api(app).get('/api/config')).json()).toEqual({ appName: "Mutaba'ah Amal", orgName: null });
  });
  it('works for a logged-in user who must change password', async () => {
    const { app, db } = mkApp();
    const id = await createUser(db, { email: 'a@usrah.my', name: 'A', usrahId: createTestUsrah(db) });
    db.update(users).set({ mustChangePassword: true }).where(eq(users.id, id)).run();
    const cookie = await loginAs(app, 'a@usrah.my');
    const res = await api(app, cookie).get('/api/config');
    expect(res.statusCode).toBe(200);
    expect(res.json().appName).toBe("Mutaba'ah Amal");
  });
});

describe('static index.html templating', () => {
  it('renders the template for /, /index.html and unknown paths; /api/nope stays JSON 404', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mutabaah-brand-'));
    try {
      writeFileSync(join(dir, 'index.html'), '<!doctype html><title>{{APP_NAME}}</title><p>{{APP_NAME}} {{ORG_NAME}}</p>');
      writeFileSync(join(dir, 'app.js'), 'console.log(1)');
      const { app } = mkApp({ staticDir: dir, branding: { appName: 'Amal <Kita>', orgName: null } });
      for (const url of ['/', '/index.html', '/some/unknown/path']) {
        const res = await app.inject({ url });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.body).toContain('<title>Amal &lt;Kita&gt;</title>');
        expect(res.body).not.toContain('{{');
      }
      expect((await app.inject({ url: '/app.js' })).body).toBe('console.log(1)');
      const miss = await app.inject({ url: '/api/nope' });
      expect(miss.statusCode).toBe(404);
      expect(miss.json().error.code).toBe('NOT_FOUND');
      await app.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
