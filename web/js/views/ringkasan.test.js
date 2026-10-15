import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getSummary: vi.fn(), getInviteCode: vi.fn() };
});

import { getSummary, getInviteCode } from '../api.js';
import { ringkasanRoute } from './ringkasan.js';
import { setSession, clearSession } from '../session.js';

const SUMMARY = {
  usrah: { id: 1, name: 'Usrah An-Nur', memberCount: 4 },
  kpis: { avg4w: 63, avgThisWeek: 58, loggedToday: 2, prayerAvg4w: 91 },
  roster: [
    { id: 11, name: 'Ali Bin Abu', initials: 'AA', percentage4w: 85, level: 'A', lastLogDate: '2026-10-09' },
    { id: 12, name: 'Bakar Salleh', initials: 'BS', percentage4w: 64, level: 'B', lastLogDate: '2026-10-08' },
    { id: 13, name: 'Chong Wei', initials: 'CW', percentage4w: 40, level: 'C', lastLogDate: '2026-10-01' },
    { id: 14, name: 'Dina Baru', initials: 'DB', percentage4w: 0, level: null, lastLogDate: null },
  ],
  alerts: [
    { memberId: 13, name: 'Chong Wei', kind: 'level_c', text: 'Chong Wei berada di Level C (Perlu Perhatian)' },
    { memberId: 13, name: 'Chong Wei', kind: 'no_log_3d', text: 'Chong Wei tidak merekod amalan selama 3 hari' },
  ],
};
const INVITE = { inviteCode: 'ABC-2345', link: 'http://localhost:3000/#daftar?kod=ABC-2345' };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function mount() {
  const data = await ringkasanRoute.load(new URLSearchParams());
  document.body.innerHTML = `<main id="app-main">${ringkasanRoute.render(data)}</main>`;
  ringkasanRoute.init?.(data);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  setSession({ user: { id: 1, name: 'Naqib Ujian', email: 'n@u.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Naqib Ujian' }, role: 'naqib' });
  getSummary.mockResolvedValue(SUMMARY);
  getInviteCode.mockResolvedValue(INVITE);
  history.replaceState(null, '', '#ringkasan');
});

describe('Ringkasan view', () => {
  it('is a naqib route loading summary + invite code', async () => {
    expect(ringkasanRoute.roles).toEqual(['naqib']);
    await mount();
    expect(getSummary).toHaveBeenCalledTimes(1);
    expect(getInviteCode).toHaveBeenCalledTimes(1);
  });

  it('renders KPIs straight from the API', async () => {
    await mount();
    expect($('[data-kpi="loggedToday"]').textContent.trim()).toBe('2 / 4');
    expect($('[data-kpi="avg4w"]').textContent.trim()).toBe('63%');
    expect($('[data-kpi="avgThisWeek"]').textContent.trim()).toBe('58%');
    expect($('[data-kpi="prayerAvg4w"]').textContent.trim()).toBe('91%');
    expect(document.body.textContent).toContain('Usrah An-Nur');
    expect(document.body.textContent).toContain('4 Ahli');
  });

  it('roster colours by level and shows Baru as a neutral badge', async () => {
    await mount();
    const cards = $$('[data-member-id]');
    expect(cards.map((c) => c.dataset.memberId)).toEqual(['11', '12', '13', '14']);
    expect(cards[0].querySelector('[data-level]').className).toContain('success-amal');
    expect(cards[1].querySelector('[data-level]').className).toContain('orange-vibrant');
    expect(cards[2].querySelector('[data-level]').className).toContain('error');
    const baru = cards[3].querySelector('[data-level]');
    expect(baru.textContent.trim()).toBe('Baru');
    expect(baru.className).not.toMatch(/success-amal|orange-vibrant|error/);
    expect(cards[0].textContent).toContain('85%');
  });

  it('lists alerts and the invite chip links to #tetapan', async () => {
    await mount();
    expect($$('[data-alert]').map((a) => a.textContent)).toEqual([
      expect.stringContaining('Chong Wei berada di Level C'),
      expect.stringContaining('tidak merekod amalan selama 3 hari'),
    ]);
    const chip = $('a[href="#tetapan"][data-invite-chip]');
    expect(chip.textContent).toContain('ABC-2345');
  });

  it('clicking a member navigates to #profil-ahli?id=', async () => {
    await mount();
    $('[data-member-id="12"]').click();
    expect(window.location.hash).toBe('#profil-ahli?id=12');
  });

  it('empty state when memberCount is 0', async () => {
    getSummary.mockResolvedValue({ usrah: { id: 1, name: 'Usrah Kosong', memberCount: 0 }, kpis: { avg4w: 0, avgThisWeek: 0, loggedToday: 0, prayerAvg4w: 0 }, roster: [], alerts: [] });
    await mount();
    expect(document.body.textContent).toContain('Belum ada ahli. Kongsi kod jemputan anda.');
    expect($('[data-empty-state]').textContent).toContain('ABC-2345');
    expect($('[data-empty-state] a[href="#tetapan"]')).not.toBeNull();
  });

  it('still renders when the invite code cannot be loaded', async () => {
    getInviteCode.mockRejectedValue(new Error('x'));
    await mount();
    expect($('[data-kpi="avg4w"]').textContent.trim()).toBe('63%');
  });

  it('escapes hostile strings', async () => {
    const evil = '"><img src=x onerror=alert(1)>';
    getSummary.mockResolvedValue({
      usrah: { id: 1, name: evil, memberCount: 1 },
      kpis: SUMMARY.kpis,
      roster: [{ id: evil, name: evil, initials: evil, percentage4w: 70, level: 'B', lastLogDate: evil }],
      alerts: [{ memberId: evil, name: evil, kind: 'level_c', text: evil }],
    });
    getInviteCode.mockResolvedValue({ inviteCode: evil, link: evil });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect($('[data-member-id]').dataset.memberId).toBe(evil);
    expect(document.body.textContent).toContain(evil);
  });
});
