import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getMember: vi.fn(), getMatrix: vi.fn(), getSummary: vi.fn(), sendGuidance: vi.fn(), resetMemberPassword: vi.fn(), removeMember: vi.fn() };
});
vi.mock('../util.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, copyText: vi.fn() };
});

import { ApiError, getMember, getMatrix, getSummary, sendGuidance, resetMemberPassword, removeMember } from '../api.js';
import { copyText } from '../util.js';
import { profilAhliRoute, navigateToMember } from './profilAhli.js';

const MEMBER = {
  member: { id: 12, name: 'Bakar Salleh', email: 'bakar@u.my', phone: '012-3456789', initials: 'BS', joinedOn: '2026-08-01' },
  status: { percentage: 64, level: 'B', label: 'Sederhana (Level B)' },
  weekly: [
    { week: '2026-W34', start: '2026-08-17', percentage: 0 },
    { week: '2026-W35', start: '2026-08-24', percentage: 40 },
    { week: '2026-W36', start: '2026-08-31', percentage: 55 },
    { week: '2026-W37', start: '2026-09-07', percentage: 60 },
    { week: '2026-W38', start: '2026-09-14', percentage: 70 },
    { week: '2026-W39', start: '2026-09-21', percentage: 100 },
    { week: '2026-W40', start: '2026-09-28', percentage: 65 },
    { week: '2026-W41', start: '2026-10-05', percentage: 58 },
  ],
  recentLogs: [
    { date: '2026-10-07', values: {}, notes: '', updatedAt: '2026-10-07T10:00:00.000Z' },
    { date: '2026-10-09', values: {}, notes: '', updatedAt: '2026-10-09T10:00:00.000Z' },
  ],
  guidance: [
    { id: 5, category: 'tilawah', title: 'Nota Tilawah', body: 'Baris satu\nBaris dua', reference: null, toUserId: 12, toName: 'Bakar Salleh', fromName: 'Naqib Ujian', createdAt: '2026-10-01T02:00:00.000Z', read: true, replies: [{ id: 1, userName: 'Bakar Salleh', body: 'Terima kasih', createdAt: '2026-10-02T02:00:00.000Z' }] },
  ],
};
const MATRIX = {
  amalan: [
    { id: 1, code: '01', name: 'Tilawah' },
    { id: 2, code: '02', name: 'Solat Fardhu' },
    { id: 3, code: '03', name: 'Puasa Sunat' },
    { id: 4, code: '04', name: 'Riadah' },
  ],
  rows: [
    { memberId: 11, name: 'Ali Bin Abu', cells: { 1: 100 }, average: 88 },
    { memberId: 12, name: 'Bakar Salleh', cells: { 1: 30, 2: 95, 3: 60, 4: 75 }, average: 64 },
  ],
};
const SUMMARY = {
  usrah: { id: 1, name: 'Usrah An-Nur', memberCount: 2 },
  kpis: { avg4w: 76, avgThisWeek: 70, loggedToday: 1, prayerAvg4w: 80 },
  roster: [
    { id: 11, name: 'Ali Bin Abu', initials: 'AB', percentage4w: 88, level: 'A', lastLogDate: '2026-10-09' },
    { id: 12, name: 'Bakar Salleh', initials: 'BS', percentage4w: 64, level: 'B', lastLogDate: '2026-10-09' },
    { id: 14, name: 'Dina Baru', initials: 'DB', percentage4w: 0, level: null, lastLogDate: null },
  ],
  alerts: [],
};
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function mount(query = 'id=12') {
  const data = await profilAhliRoute.load(new URLSearchParams(query));
  document.body.innerHTML = `<main id="app-main">${profilAhliRoute.render(data)}</main>`;
  profilAhliRoute.init?.(data);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  getMember.mockResolvedValue(MEMBER);
  getMatrix.mockResolvedValue(MATRIX);
  getSummary.mockResolvedValue(SUMMARY);
  window.showToast = vi.fn();
  window.router = { renderCurrent: vi.fn() };
  history.replaceState(null, '', '#profil-ahli?id=12');
});

describe('Profil Ahli view', () => {
  it('is a naqib route; loads the member by ?id=', async () => {
    expect(profilAhliRoute.roles).toEqual(['naqib']);
    await mount();
    expect(getMember).toHaveBeenCalledWith('12');
    expect($('h1').textContent).toContain('Bakar Salleh');
    expect(document.body.textContent).toContain('bakar@u.my');
    expect($('[data-kpi="status"]').textContent.trim()).toBe('64%');
    expect($('[data-kpi="thisWeek"]').textContent.trim()).toBe('58%');
    expect($('[data-status-badge]').textContent.trim()).toBe('Sederhana (Level B)');
    expect($('[data-status-badge]').className).toContain('orange-vibrant');
  });

  it('generates the trend path from weekly (0 and 100 included) with no NaN', async () => {
    await mount();
    const path = $('[data-trend-line]').getAttribute('d');
    expect(path).toMatch(/^M [\d.]+,[\d.]+( L [\d.]+,[\d.]+){7}$/);
    expect($('svg').outerHTML).not.toMatch(/NaN|Infinity/);
    expect($$('[data-trend-point]')).toHaveLength(8);
    expect($('[data-trend-labels]').textContent).toContain('M41');
  });

  it('trend line starts at the first week with something expected; earlier weeks keep only their axis label', async () => {
    const weekly = MEMBER.weekly.map((w, i) => (i < 3 ? { ...w, percentage: 0, expected: 0 } : { ...w, expected: 12 }));
    getMember.mockResolvedValue({ ...MEMBER, weekly });
    await mount();
    expect($$('[data-trend-point]')).toHaveLength(5);
    expect($('[data-trend-line]').getAttribute('d')).toMatch(/^M [\d.]+,[\d.]+( L [\d.]+,[\d.]+){4}$/);
    expect($('[data-trend-labels]').textContent).toContain('M34');
    expect($('svg').outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('Skor Minggu Ini shows "—" when nothing is expected this week yet', async () => {
    const weekly = MEMBER.weekly.map((w, i) => (i === 7 ? { ...w, percentage: 0, expected: 0 } : { ...w, expected: 12 }));
    getMember.mockResolvedValue({ ...MEMBER, weekly });
    await mount();
    expect($('[data-kpi="thisWeek"]').textContent.trim()).toBe('—');
  });

  it('no week with data at all → empty-state text instead of a chart', async () => {
    getMember.mockResolvedValue({ ...MEMBER, weekly: MEMBER.weekly.map((w) => ({ ...w, percentage: 0, expected: 0 })) });
    await mount();
    expect($('[data-trend-line]')).toBeNull();
    expect(document.body.textContent).toContain('Belum ada data mingguan.');
  });

  it('single-point weekly renders without NaN', async () => {
    getMember.mockResolvedValue({ ...MEMBER, weekly: [{ week: '2026-W41', start: '2026-10-05', percentage: 100 }] });
    await mount();
    expect($('[data-trend-line]').getAttribute('d')).toMatch(/^M [\d.]+,[\d.]+$/);
    expect(document.body.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('top / bottom amalan come from the matrix row', async () => {
    await mount();
    expect($$('[data-strength] [data-name]').map((e) => e.textContent.trim())).toEqual(['Solat Fardhu', 'Riadah', 'Puasa Sunat']);
    expect($$('[data-weakness] [data-name]').map((e) => e.textContent.trim())).toEqual(['Tilawah', 'Puasa Sunat', 'Riadah']);
  });

  it('shows the last 14 days of logging from recentLogs', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T04:00:00Z'));
    await mount();
    vi.useRealTimers();
    expect($('[data-day]').dataset.day).toBe('2026-09-26');
    expect($$('[data-day]')).toHaveLength(14);
    expect($$('[data-day][data-logged="1"]').map((e) => e.dataset.day)).toEqual(['2026-10-07', '2026-10-09']);
  });

  it('Baru status renders a neutral badge and "—" instead of 0% (KPI, donut, switcher)', async () => {
    getMember.mockResolvedValue({ ...MEMBER, status: { percentage: 0, level: null, label: 'Baru' } });
    getMatrix.mockResolvedValue({ ...MATRIX, rows: [MATRIX.rows[0], { memberId: 12, name: 'Bakar Salleh', cells: {}, average: 0 }] });
    await mount();
    const b = $('[data-status-badge]');
    expect(b.textContent.trim()).toBe('Baru');
    expect(b.className).not.toMatch(/success-amal|orange-vibrant|error/);
    expect($('[data-kpi="status"]').textContent.trim()).toBe('—');
    expect($('[data-donut-label]').textContent.trim()).toBe('—');
    expect($('[data-donut-arc]')).toBeNull();
    const opts = [...$('#memberSelectorSelect').options].map((o) => o.textContent.trim());
    expect(opts).toEqual(['Ali Bin Abu (88%)', 'Bakar Salleh (Baru)']);
  });

  it('guidance history: escaped body with line breaks and replies', async () => {
    await mount();
    const item = $('[data-guidance-id="5"]');
    expect(item.querySelector('[data-body]').innerHTML).toBe('Baris satu<br>Baris dua');
    expect(item.textContent).toContain('Terima kasih');
  });

  it('Hantar bimbingan posts a personal note to the member', async () => {
    await mount();
    $('#guidanceCategorySelect').value = 'qiamullail';
    $('#guidanceTitleInput').value = ' Bangun malam ';
    $('#guidanceContentTextarea').value = 'Cuba 2 rakaat.';
    $('#guidanceReferenceInput').value = '';
    sendGuidance.mockResolvedValue({});
    $('#guidanceDispatchForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(sendGuidance).toHaveBeenCalledWith({ toUserId: 12, category: 'qiamullail', title: 'Bangun malam', body: 'Cuba 2 rakaat.' });
    expect(window.showToast).toHaveBeenCalledWith(expect.stringContaining('Bakar Salleh'), 'success');
    expect(window.router.renderCurrent).toHaveBeenCalled();
  });

  it('Hantar bimbingan shows field errors from the API', async () => {
    await mount();
    $('#guidanceTitleInput').value = 'x';
    $('#guidanceContentTextarea').value = 'y';
    sendGuidance.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Data tidak sah', { title: 'Tajuk terlalu panjang' }));
    $('#guidanceDispatchForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect($('[data-field-error="title"]').textContent).toBe('Tajuk terlalu panjang');
    expect(window.router.renderCurrent).not.toHaveBeenCalled();
  });

  it('Set semula kata laluan: confirm → API → modal with the temporary password + copy', async () => {
    await mount();
    const confirmSpy = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('confirm', confirmSpy);
    $('[data-action="reset-password"]').click();
    await flush();
    expect(resetMemberPassword).not.toHaveBeenCalled();
    resetMemberPassword.mockResolvedValue({ temporaryPassword: 'Tmp7pAss9xyz' });
    $('[data-action="reset-password"]').click();
    await flush();
    expect(resetMemberPassword).toHaveBeenCalledWith(12);
    const modal = $('[data-temp-password-modal]');
    expect(modal).not.toBeNull();
    expect(modal.querySelector('[data-temp-password]').value).toBe('Tmp7pAss9xyz');
    copyText.mockResolvedValue(true);
    modal.querySelector('[data-copy]').click();
    await flush();
    expect(copyText).toHaveBeenCalledWith('Tmp7pAss9xyz');
    modal.querySelector('[data-close]').click();
    expect($('[data-temp-password-modal]')).toBeNull();
  });

  it('Keluarkan ahli requires typing the exact name, then removes and goes to #ringkasan', async () => {
    await mount();
    vi.stubGlobal('prompt', vi.fn().mockReturnValueOnce('bakar salleh').mockReturnValueOnce(null).mockReturnValueOnce('Bakar Salleh'));
    $('[data-action="remove-member"]').click();
    await flush();
    expect(removeMember).not.toHaveBeenCalled();
    expect(window.showToast).toHaveBeenLastCalledWith(expect.stringContaining('tidak sepadan'), 'warning');
    $('[data-action="remove-member"]').click();
    await flush();
    expect(removeMember).not.toHaveBeenCalled();
    removeMember.mockResolvedValue(null);
    $('[data-action="remove-member"]').click();
    await flush();
    expect(removeMember).toHaveBeenCalledWith(12);
    expect(window.showToast).toHaveBeenLastCalledWith(expect.stringContaining('Bakar Salleh'), 'success');
    expect(window.location.hash).toBe('#ringkasan');
  });

  it('404 from getMember → "Ahli tidak dijumpai"', async () => {
    getMember.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Tidak dijumpai'));
    await expect(profilAhliRoute.load(new URLSearchParams('id=999'))).rejects.toThrow('Ahli tidak dijumpai');
  });

  it('no id → member picker from the summary roster', async () => {
    await mount('');
    expect(getMember).not.toHaveBeenCalled();
    expect(getSummary).toHaveBeenCalled();
    const links = $$('a[data-member-link]');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#profil-ahli?id=11', '#profil-ahli?id=12', '#profil-ahli?id=14']);
    expect(links[2].querySelector('[data-level]').textContent.trim()).toBe('Baru');
  });

  it('member selector switches profile', async () => {
    await mount();
    const sel = $('#memberSelectorSelect');
    expect([...sel.options].map((o) => o.value)).toEqual(['11', '12']);
    expect(sel.value).toBe('12');
    sel.value = '11';
    sel.dispatchEvent(new Event('change'));
    expect(window.location.hash).toBe('#profil-ahli?id=11');
  });

  it('navigateToMember sets the hash', () => {
    navigateToMember(7);
    expect(window.location.hash).toBe('#profil-ahli?id=7');
  });

  it('escapes hostile strings', async () => {
    const evil = '"><img src=x onerror=alert(1)>';
    getMember.mockResolvedValue({
      ...MEMBER,
      member: { id: 12, name: evil, email: evil, phone: evil, initials: evil, joinedOn: '2026-08-01' },
      status: { percentage: 50, level: 'C', label: evil },
      guidance: [{ ...MEMBER.guidance[0], title: evil, body: `${evil}\n${evil}`, reference: evil, fromName: evil, replies: [{ id: 1, userName: evil, body: evil, createdAt: '2026-10-02T02:00:00.000Z' }] }],
    });
    getMatrix.mockResolvedValue({ amalan: [{ id: 1, code: evil, name: evil }], rows: [{ memberId: 12, name: evil, cells: { 1: 10 }, average: 10 }] });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect(document.body.textContent).toContain(evil);

    getSummary.mockResolvedValue({ ...SUMMARY, roster: [{ id: evil, name: evil, initials: evil, percentage4w: 1, level: 'C', lastLogDate: null }] });
    await mount('');
    expect(document.querySelector('img')).toBeNull();
  });
});
