import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { loadDefaultAmalan, STARTER_AMALAN, type DefaultAmalan } from '../src/db/defaultAmalan.js';
import { createUsrah } from '../src/services/usrah.js';
import { openDb, migrateDb } from '../src/db/client.js';
import { amalan } from '../src/db/schema.js';
import { makeTestApp, createUser, loginAs, api } from './helpers.js';

const dir = mkdtempSync(join(tmpdir(), 'amalan-'));
function tmp(name: string, content: string): string {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
}
const item = (over: Record<string, unknown> = {}) => ({
  code: '01', name: 'A', freq: 'harian', inputType: 'check', targetVal: 1, sort: 0, ...over,
});

describe('loadDefaultAmalan', () => {
  it('returns the starter set when no path is given', () => {
    const list = loadDefaultAmalan();
    expect(list).toBe(STARTER_AMALAN);
    expect(list.length).toBeGreaterThan(0);
    expect(list.filter((a) => a.inputType === 'prayers')).toHaveLength(1);
    expect(list.find((a) => a.inputType === 'prayers')!.targetVal).toBe(5);
    expect(list.map((a) => a.sort)).toEqual([...Array(list.length).keys()]);
  });

  it('loads the IKRAM example file (relative to cwd)', () => {
    const list = loadDefaultAmalan('examples/amalan-ikram.json');
    expect(list).toHaveLength(17);
    expect(list.filter((a) => a.inputType === 'prayers')).toHaveLength(1);
    expect(list.find((a) => a.inputType === 'prayers')!.targetVal).toBe(5);
    expect(list.map((a) => a.sort)).toEqual([...Array(17).keys()]);
  });

  const bad: Array<[string, () => string]> = [
    ['nonexistent file', () => join(dir, 'nope.json')],
    ['invalid JSON', () => tmp('bad.json', '{not json')],
    ['not an array', () => tmp('obj.json', '{}')],
    ['empty array', () => tmp('empty.json', '[]')],
    ['bad freq', () => tmp('freq.json', JSON.stringify([item({ freq: 'tahunan' })]))],
    ['missing name', () => tmp('name.json', JSON.stringify([{ ...item(), name: undefined }]))],
    ['duplicate sort', () => tmp('sort.json', JSON.stringify([item(), item({ code: '02' })]))],
    ['duplicate code', () => tmp('code.json', JSON.stringify([item(), item({ sort: 1 })]))],
  ];
  it.each(bad)('throws with the path for %s', (_n, make) => {
    const p = make();
    expect(() => loadDefaultAmalan(p)).toThrow(p);
  });

  it('allows several null codes and applies defaults', () => {
    const p = tmp('ok.json', JSON.stringify([item({ code: null }), item({ code: null, sort: 1 })]));
    const list = loadDefaultAmalan(p);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ icon: 'check_circle', active: true });
  });
});

describe('createUsrah with defaults', () => {
  it('inserts the given list', () => {
    const db = openDb(':memory:');
    migrateDb(db);
    const a = createUsrah(db, 'X', '2026-10-14', STARTER_AMALAN);
    expect(db.select().from(amalan).where(eq(amalan.usrahId, a.id)).all()).toHaveLength(STARTER_AMALAN.length);
    const custom: DefaultAmalan[] = STARTER_AMALAN.slice(0, 2);
    const b = createUsrah(db, 'Y', '2026-10-14', custom);
    expect(db.select().from(amalan).where(eq(amalan.usrahId, b.id)).all()).toHaveLength(2);
  });

  it('admin route uses buildApp defaultAmalan', async () => {
    const t = makeTestApp({ defaultAmalan: STARTER_AMALAN.slice(0, 2) });
    await createUser(t.db, { email: 'adm@x.my', name: 'Adm', isAdmin: true });
    const c = await loginAs(t.app, 'adm@x.my');
    const res = await api(t.app, c).post('/api/admin/usrah', { name: 'Baru' });
    expect(res.statusCode).toBe(201);
    expect(t.db.select().from(amalan).where(eq(amalan.usrahId, res.json().id)).all()).toHaveLength(2);
  });
});
