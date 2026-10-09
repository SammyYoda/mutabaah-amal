import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getMyAnalytics: vi.fn() };
});

import { getMyAnalytics } from '../api.js';
import { analitikRoute } from './analitik.js';
import { setSession, clearSession } from '../session.js';
import { addDays } from '@shared/dates.js';

const pcts = [0, 25, 50, 75, 100, 80, 60, 42];
const ANALYTICS = {
  weekly: pcts.map((p, i) => ({ week: `2026-W${34 + i}`, start: addDays('2026-08-17', 7 * i), percentage: p })),
  heatmap: Array.from({ length: 60 }, (_, i) => ({ date: addDays('2026-08-11', i), percentage: [0, 30, 65, 90][i % 4] })),
  byCategory: [
    { amalanId: 1, name: 'Tilawah', met: 20, expected: 28, percentage: 71 },
    { amalanId: 2, name: 'Solat Fardhu', met: 27, expected: 28, percentage: 96 },
    { amalanId: 3, name: 'Puasa Sunat', met: 1, expected: 4, percentage: 25 },
  ],
  status: { percentage: 71, level: 'B', label: 'Sederhana (Level B)' },
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function mount(q = '') {
  const data = await analitikRoute.load(new URLSearchParams(q));
  document.body.innerHTML = `<main id="app-main">${analitikRoute.render(data)}</main>`;
  analitikRoute.init?.(data);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  setSession({ user: { id: 2, name: 'Ali Bin Abu', email: 'a@u.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Naqib Ujian' }, role: 'member' });
  getMyAnalytics.mockResolvedValue(ANALYTICS);
});

describe('Analitik view', () => {
  it('is a member route loading 8 weeks', async () => {
    expect(analitikRoute.roles).toEqual(['member']);
    await mount();
    expect(getMyAnalytics).toHaveBeenCalledWith(8);
    expect(document.body.textContent).toContain('Ali Bin Abu');
  });

  it('draws 8 weekly bars from the data (0 and 100 included, no NaN)', async () => {
    await mount();
    const bars = $$('[data-week-bar]');
    expect(bars).toHaveLength(8);
    expect(bars.map((b) => b.dataset.pct)).toEqual(pcts.map(String));
    expect(bars[0].getAttribute('height')).toBe('0');
    expect(Number(bars[4].getAttribute('height'))).toBeGreaterThan(Number(bars[3].getAttribute('height')));
    expect($('[data-weekly-chart]').outerHTML).not.toMatch(/NaN|Infinity/);
    expect($$('[data-week-label]').map((t) => t.textContent.trim())).toContain('42%');
  });

  it('60-day heatmap coloured by bands', async () => {
    await mount();
    const cells = $$('[data-heat]');
    expect(cells).toHaveLength(60);
    expect(cells[0].className).toContain('bg-surface-container-highest');
    expect(cells[1].className).toContain('bg-sky-tint');
    expect(cells[2].className).toContain('bg-primary-fixed-dim');
    expect(cells[3].className).toContain('bg-primary-container');
    expect(cells[59].getAttribute('title')).toContain('90%');
  });

  it('category list and status badge', async () => {
    await mount();
    const rows = $$('[data-category]');
    expect(rows.map((r) => r.querySelector('[data-name]').textContent.trim())).toEqual(['Tilawah', 'Solat Fardhu', 'Puasa Sunat']);
    expect(rows[2].textContent).toContain('25%');
    expect(rows[2].textContent).toContain('1 / 4');
    expect($('[data-status-badge]').textContent.trim()).toBe('Sederhana (Level B)');
    expect($('[data-status-badge]').className).toContain('orange-vibrant');
    expect($('[data-status-pct]').textContent.trim()).toBe('71%');
  });

  it('Baru status is neutral; empty category list shows an empty state', async () => {
    getMyAnalytics.mockResolvedValue({ ...ANALYTICS, byCategory: [], status: { percentage: 0, level: null, label: 'Baru' } });
    await mount();
    const b = $('[data-status-badge]');
    expect(b.textContent.trim()).toBe('Baru');
    expect(b.className).not.toMatch(/success-amal|orange-vibrant|error/);
    expect($('[data-status-pct]').textContent.trim()).toBe('—');
    expect(document.body.textContent).toContain('Belum ada amalan');
  });

  it('single-week series renders without NaN', async () => {
    getMyAnalytics.mockResolvedValue({ ...ANALYTICS, weekly: [ANALYTICS.weekly[4]] });
    await mount();
    expect($$('[data-week-bar]')).toHaveLength(1);
    expect(document.body.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('escapes hostile strings', async () => {
    const evil = '"><img src=x onerror=alert(1)>';
    setSession({ user: { id: 2, name: evil, email: 'a@u.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: evil, naqibName: evil }, role: 'member' });
    getMyAnalytics.mockResolvedValue({
      weekly: [{ week: evil, start: evil, percentage: 50 }],
      heatmap: [{ date: evil, percentage: 50 }],
      byCategory: [{ amalanId: 1, name: evil, met: 1, expected: 2, percentage: 50 }],
      status: { percentage: 50, level: 'C', label: evil },
    });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect(document.body.textContent).toContain(evil);
  });
});
