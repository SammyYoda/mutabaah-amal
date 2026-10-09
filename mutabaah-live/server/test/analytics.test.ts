import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeTestApp, seedUsrah, api, loginAs, createUser } from './helpers.js';
import { amalan, dailyLogs, memberships } from '../src/db/schema.js';
import { periodScore, dailyScore, statusBand } from '../../shared/score.js';
import { addDays, weekStart } from '../../shared/dates.js';

// now = Fri 2026-10-09 10:00 KL. weekStart = 2026-10-05; last4w = 2026-09-14..2026-10-09
const TODAY = '2026-10-09';
const FROM4W = '2026-09-14';
const ALL_PRAYERS = { subuh: true, zohor: true, asar: true, maghrib: true, isya: true };

async function setup() {
  const t = makeTestApp();
  const a = await seedUsrah(t.app, t.db, 'Usrah A');
  const b = await seedUsrah(t.app, t.db, 'Usrah B');
  // controlled amalan for usrah A
  t.db.delete(amalan).where(eq(amalan.usrahId, a.usrahId)).run();
  const mk = (v: any) => t.db.insert(amalan).values({ usrahId: a.usrahId, icon: 'x', active: true, createdOn: '2026-08-01', ...v }).returning().get();
  const P = mk({ code: '1', name: 'Solat', freq: 'harian', inputType: 'prayers', targetVal: 5, sort: 0 });
  const C = mk({ code: '2', name: 'Doa', freq: 'harian', inputType: 'check', targetVal: 1, sort: 1 });
  const W = mk({ code: '3', name: 'Sedekah', freq: 'mingguan', inputType: 'check', targetVal: 1, sort: 2 });
  const D = mk({ code: '4', name: 'Lama', freq: 'harian', inputType: 'check', targetVal: 1, sort: 3, deactivatedOn: '2026-10-01', active: false });
  const items = [P, C, W, D];
  const log = (userId: number, date: string, values: Record<string, unknown>) =>
    t.db.insert(dailyLogs).values({ userId, usrahId: a.usrahId, date, values, notes: null, updatedAt: new Date('2026-10-09T02:00:00Z') }).run();
  const full = (date: string) => ({ [P.id]: ALL_PRAYERS, [C.id]: true, [D.id]: date < '2026-10-01' });

  const ali = await createUser(t.db, { email: 'ali@x.test', name: 'Ali bin Abu', usrahId: a.usrahId, joinedAt: new Date('2026-09-01T00:00:00Z') });
  const siti = await createUser(t.db, { email: 'siti@x.test', name: 'Siti', usrahId: a.usrahId, joinedAt: new Date('2026-10-07T20:00:00Z') }); // 2026-10-08 KL
  const budi = await createUser(t.db, { email: 'budi@x.test', name: 'Budi Hartono', usrahId: a.usrahId, joinedAt: new Date('2026-09-01T00:00:00Z') });
  // Ali: every day 09-01..10-09, full on even days, half (prayers only) on odd days; W on Mondays
  for (let d = '2026-09-01'; d <= TODAY; d = addDays(d, 1)) {
    const even = Number(d.slice(8)) % 2 === 0;
    const v: any = even ? full(d) : { [P.id]: ALL_PRAYERS };
    if (new Date(d + 'T00:00:00Z').getUTCDay() === 1) v[W.id] = true;
    log(ali, d, v);
  }
  // Siti: two fully met days
  log(siti, '2026-10-08', full('2026-10-08'));
  log(siti, '2026-10-09', full('2026-10-09'));
  // Budi: last log 4 days ago, poor
  log(budi, '2026-10-05', { [C.id]: true });
  const aliCookie = await loginAs(t.app, 'ali@x.test');
  const budiCookie = await loginAs(t.app, 'budi@x.test');
  const sitiCookie = await loginAs(t.app, 'siti@x.test');
  const otherId = await createUser(t.db, { email: 'o@x.test', name: 'Omar', usrahId: b.usrahId });
  return { ...t, a, b, P, C, W, D, items, ali, siti, budi, aliCookie, budiCookie, sitiCookie, otherId, log };
}

const logsOf = (s: Awaited<ReturnType<typeof setup>>, userId: number) =>
  s.db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId)).all().map((l) => ({ date: l.date, values: l.values as any }));
const score = (s: Awaited<ReturnType<typeof setup>>, userId: number, joinedOn: string, from: string, am = s.items) =>
  periodScore(am, logsOf(s, userId), { from, to: TODAY, today: TODAY, joinedOn });

describe('GET /api/usrah/summary', () => {
  it('roster percentages equal periodScore', async () => {
    const s = await setup();
    const r = await api(s.app, s.a.naqib.cookie).get('/api/usrah/summary');
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.usrah).toEqual({ id: s.a.usrahId, name: 'Usrah A', memberCount: 3 });
    const byId = new Map<number, any>(j.roster.map((m: any) => [m.id, m]));
    expect(j.roster.length).toBe(3);
    const aliP = score(s, s.ali, '2026-09-01', FROM4W).percentage;
    const budiP = score(s, s.budi, '2026-09-01', FROM4W).percentage;
    expect(byId.get(s.ali).percentage4w).toBe(aliP);
    expect(byId.get(s.ali).level).toBe(statusBand(aliP).level);
    expect(byId.get(s.ali).initials).toBe('AB');
    expect(byId.get(s.ali).lastLogDate).toBe(TODAY);
    expect(byId.get(s.budi).percentage4w).toBe(budiP);
    expect(byId.get(s.budi).lastLogDate).toBe('2026-10-05');
    expect(byId.get(s.siti).initials).toBe('S');
    expect(budiP).toBeLessThan(60);
    // kpis
    const avg = Math.round((aliP + byId.get(s.siti).percentage4w + budiP) / 3);
    expect(j.kpis.avg4w).toBe(avg);
    expect(j.kpis.loggedToday).toBe(2);
  });

  it('member who joined yesterday with 2 met days: 100, A, no no_log_3d', async () => {
    const s = await setup();
    const j = (await api(s.app, s.a.naqib.cookie).get('/api/usrah/summary')).json();
    const siti = j.roster.find((m: any) => m.id === s.siti);
    expect(siti.percentage4w).toBe(100);
    expect(siti.level).toBe('A');
    expect(j.alerts.filter((x: any) => x.memberId === s.siti && x.kind === 'no_log_3d')).toEqual([]);
  });

  it('no log for 4 days gives no_log_3d (and level_c) in Malay', async () => {
    const s = await setup();
    const j = (await api(s.app, s.a.naqib.cookie).get('/api/usrah/summary')).json();
    const mine = j.alerts.filter((x: any) => x.memberId === s.budi);
    expect(mine.find((x: any) => x.kind === 'no_log_3d')).toEqual({
      memberId: s.budi, name: 'Budi Hartono', kind: 'no_log_3d', text: 'Budi Hartono tidak merekod amalan selama 3 hari',
    });
    expect(mine.find((x: any) => x.kind === 'level_c').text).toBe('Budi Hartono berada di Level C (Perlu Perhatian)');
    expect(j.alerts.filter((x: any) => x.memberId === s.ali && x.kind === 'no_log_3d')).toEqual([]);
  });

  it('prayerAvg4w is hand-checkable', async () => {
    const s = await setup();
    const j = (await api(s.app, s.a.naqib.cookie).get('/api/usrah/summary')).json();
    // Ali 100% prayers, Siti 100% (2 days), Budi 0 -> mean 67
    expect(j.kpis.prayerAvg4w).toBe(67);
  });

  it('drop alert fires when this week falls 20+ points below prev 4w', async () => {
    const t = makeTestApp();
    const a = await seedUsrah(t.app, t.db, 'U');
    t.db.delete(amalan).where(eq(amalan.usrahId, a.usrahId)).run();
    const C = t.db.insert(amalan).values({ usrahId: a.usrahId, icon: 'x', code: '1', name: 'Doa', freq: 'harian', inputType: 'check', targetVal: 1, sort: 0, active: true, createdOn: '2026-08-01' }).returning().get();
    const id = await createUser(t.db, { email: 'd@x.test', name: 'Dina Dahlia', usrahId: a.usrahId, joinedAt: new Date('2026-08-01T00:00:00Z') });
    for (let d = '2026-09-07'; d <= '2026-10-04'; d = addDays(d, 1)) {
      t.db.insert(dailyLogs).values({ userId: id, usrahId: a.usrahId, date: d, values: { [C.id]: true }, notes: null, updatedAt: new Date() }).run();
    }
    t.db.insert(dailyLogs).values({ userId: id, usrahId: a.usrahId, date: TODAY, values: { [C.id]: true }, notes: null, updatedAt: new Date() }).run();
    // this week Mon-Fri: only Fri met -> 20%; prev4w 100%
    const j = (await api(t.app, a.naqib.cookie).get('/api/usrah/summary')).json();
    const drop = j.alerts.find((x: any) => x.kind === 'drop');
    expect(drop).toMatchObject({ memberId: id, text: 'Skor Dina Dahlia minggu ini menurun 80 mata' });
  });

  it('403 for a member; 401 unauthenticated', async () => {
    const s = await setup();
    expect((await api(s.app, s.aliCookie).get('/api/usrah/summary')).statusCode).toBe(403);
    expect((await api(s.app).get('/api/usrah/summary')).statusCode).toBe(401);
  });

  it('removed members are excluded everywhere (R4)', async () => {
    const s = await setup();
    s.db.update(memberships).set({ removedAt: new Date() }).where(eq(memberships.userId, s.budi)).run();
    const j = (await api(s.app, s.a.naqib.cookie).get('/api/usrah/summary')).json();
    expect(j.usrah.memberCount).toBe(2);
    expect(j.roster.map((m: any) => m.id).sort()).toEqual([s.ali, s.siti].sort());
    expect(j.alerts.filter((x: any) => x.memberId === s.budi)).toEqual([]);
    const m = (await api(s.app, s.a.naqib.cookie).get('/api/usrah/matrix')).json();
    expect(m.rows.map((r: any) => r.memberId)).not.toContain(s.budi);
    expect((await api(s.app, s.a.naqib.cookie).get(`/api/members/${s.budi}`)).statusCode).toBe(404);
  });
});

describe('GET /api/usrah/matrix', () => {
  it('omits deactivated amalan; cells equal periodScore; omits cell with 0 expected', async () => {
    const s = await setup();
    const r = await api(s.app, s.a.naqib.cookie).get('/api/usrah/matrix?weeks=4');
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.amalan.map((x: any) => x.name)).toEqual(['Solat', 'Doa', 'Sedekah']);
    expect(j.amalan[0]).toEqual({ id: s.P.id, code: '1', name: 'Solat' });
    const row = j.rows.find((x: any) => x.memberId === s.ali);
    expect(Object.keys(row.cells)).not.toContain(String(s.D.id));
    expect(row.cells[String(s.P.id)]).toBe(score(s, s.ali, '2026-09-01', FROM4W, [s.P]).percentage);
    expect(row.cells[String(s.P.id)]).toBe(100);
    expect(row.cells[String(s.C.id)]).toBe(score(s, s.ali, '2026-09-01', FROM4W, [s.C]).percentage);
    expect(row.average).toBe(score(s, s.ali, '2026-09-01', FROM4W, [s.P, s.C, s.W]).percentage);
    // Siti joined yesterday: weekly amalan has 0 expected (week not complete, not met) -> key absent
    const siti = j.rows.find((x: any) => x.memberId === s.siti);
    expect(Object.keys(siti.cells)).not.toContain(String(s.W.id));
    expect(siti.cells[String(s.P.id)]).toBe(100);
  });

  it('weeks validation', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    expect((await c.get('/api/usrah/matrix?weeks=0')).statusCode).toBe(400);
    expect((await c.get('/api/usrah/matrix?weeks=13')).statusCode).toBe(400);
    expect((await c.get('/api/usrah/matrix?weeks=abc')).statusCode).toBe(400);
    expect((await c.get('/api/usrah/matrix?weeks=12')).statusCode).toBe(200);
    expect((await api(s.app, s.aliCookie).get('/api/usrah/matrix')).statusCode).toBe(403);
  });
});

describe('GET /api/me/analytics', () => {
  it('shapes: 60 heatmap days, 8 weeks, byCategory, status', async () => {
    const s = await setup();
    const r = await api(s.app, s.aliCookie).get('/api/me/analytics?weeks=8');
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.heatmap.length).toBe(60);
    expect(j.weekly.length).toBe(8);
    expect(j.heatmap[59].date).toBe(TODAY);
    expect(j.heatmap[0].date).toBe(addDays(TODAY, -59));
    expect(j.heatmap[0].percentage).toBe(0); // before joinedOn
    // Ali's today (odd day 9): prayers only; harian active today: P, C -> 50
    expect(j.heatmap[59].percentage).toBe(dailyScore(s.items, logsOf(s, s.ali).find((l) => l.date === TODAY)!, TODAY).percentage);
    expect(j.heatmap[59].percentage).toBe(50);
    expect(j.weekly[7]).toEqual({
      week: '2026-W41', start: '2026-10-05',
      percentage: periodScore(s.items, logsOf(s, s.ali), { from: '2026-10-05', to: TODAY, today: TODAY, joinedOn: '2026-09-01' }).percentage,
    });
    expect(j.weekly[0].start).toBe(addDays(weekStart(TODAY), -49));
    expect(j.byCategory.map((x: any) => x.name)).toEqual(['Solat', 'Doa', 'Sedekah']);
    const p = j.byCategory[0];
    expect(p).toMatchObject({ amalanId: s.P.id, name: 'Solat', percentage: 100 });
    expect(p.met).toBe(p.expected);
    expect(j.status).toEqual({ percentage: score(s, s.ali, '2026-09-01', FROM4W).percentage, ...statusBand(score(s, s.ali, '2026-09-01', FROM4W).percentage) });
  });

  it('default weeks is 8; works for naqib too; 401 unauthenticated; weeks validated', async () => {
    const s = await setup();
    expect((await api(s.app, s.aliCookie).get('/api/me/analytics')).json().weekly.length).toBe(8);
    expect((await api(s.app, s.a.naqib.cookie).get('/api/me/analytics')).statusCode).toBe(200);
    expect((await api(s.app).get('/api/me/analytics')).statusCode).toBe(401);
    expect((await api(s.app, s.aliCookie).get('/api/me/analytics?weeks=0')).statusCode).toBe(400);
    expect((await api(s.app, s.aliCookie).get('/api/me/analytics?weeks=13')).statusCode).toBe(400);
  });
});

describe('GET /api/members/:id', () => {
  it('returns profile, status, weekly(8), recentLogs(14)', async () => {
    const s = await setup();
    const r = await api(s.app, s.a.naqib.cookie).get(`/api/members/${s.siti}`);
    expect(r.statusCode).toBe(200);
    const j = r.json();
    expect(j.member).toEqual({ id: s.siti, name: 'Siti', email: 'siti@x.test', phone: null, initials: 'S', joinedOn: '2026-10-08' });
    expect(j.status.percentage).toBe(100);
    expect(j.weekly.length).toBe(8);
    expect(j.recentLogs.map((l: any) => l.date)).toEqual(['2026-10-08', '2026-10-09']);
    expect(Object.keys(j.recentLogs[0]).sort()).toEqual(['date', 'notes', 'updatedAt', 'values']);
    expect(j.guidance).toEqual([]);
    const ali = (await api(s.app, s.a.naqib.cookie).get(`/api/members/${s.ali}`)).json();
    expect(ali.recentLogs.length).toBe(14);
    expect(ali.recentLogs[0].date).toBe(addDays(TODAY, -13));
  });

  it('404 for other usrah, naqib, nonsense id; 403 for member', async () => {
    const s = await setup();
    const c = api(s.app, s.a.naqib.cookie);
    expect((await c.get(`/api/members/${s.otherId}`)).statusCode).toBe(404);
    expect((await c.get(`/api/members/${s.a.naqib.id}`)).statusCode).toBe(404);
    expect((await c.get('/api/members/abc')).statusCode).toBe(404);
    expect((await api(s.app, s.b.naqib.cookie).get(`/api/members/${s.ali}`)).statusCode).toBe(404);
    expect((await api(s.app, s.aliCookie).get(`/api/members/${s.siti}`)).statusCode).toBe(403);
  });
});
