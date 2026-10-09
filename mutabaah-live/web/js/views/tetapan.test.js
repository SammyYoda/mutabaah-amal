import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getAmalan: vi.fn(), getInviteCode: vi.fn(), createAmalan: vi.fn(), updateAmalan: vi.fn(), deactivateAmalan: vi.fn(), regenerateInviteCode: vi.fn() };
});
vi.mock('../util.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, copyText: vi.fn() };
});

import { ApiError, getAmalan, getInviteCode, createAmalan, updateAmalan, deactivateAmalan, regenerateInviteCode } from '../api.js';
import { copyText } from '../util.js';
import { tetapanRoute } from './tetapan.js';
import { setSession, clearSession } from '../session.js';

const base = { description: '', unit: 'kali', icon: 'star', active: true, createdOn: '2026-01-01', deactivatedOn: null, sort: 0 };
const AMALAN = [
  { ...base, id: 1, code: '01', name: 'Tilawah', description: 'Baca Quran', freq: 'harian', inputType: 'count', targetVal: 5, icon: 'menu_book' },
  { ...base, id: 2, code: '02', name: 'Puasa Sunat', freq: 'mingguan', inputType: 'check', targetVal: 2 },
  { ...base, id: 3, code: '03', name: 'Wirid Lama', freq: 'harian', inputType: 'check', targetVal: 1, active: false, deactivatedOn: '2026-10-05' },
];
const INVITE = { inviteCode: 'ABC-2345', link: 'http://localhost:3000/#daftar?kod=ABC-2345' };
const flush = () => new Promise((r) => setTimeout(r, 0));
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function mount() {
  const data = await tetapanRoute.load(new URLSearchParams());
  document.body.innerHTML = `<main id="app-main">${tetapanRoute.render(data)}</main>`;
  tetapanRoute.init(data);
  return data;
}
const submit = () => $('#formAddAmalan').dispatchEvent(new Event('submit', { cancelable: true }));
const fill = (id, v) => { $(id).value = v; };

beforeEach(async () => {
  vi.clearAllMocks();
  clearSession();
  setSession({ user: { id: 1, name: 'Naqib', email: 'n@u.my', phone: null, isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Naqib' }, role: 'naqib' });
  window.showToast = vi.fn();
  window.router = { renderCurrent: vi.fn() };
  getAmalan.mockResolvedValue(AMALAN);
  getInviteCode.mockResolvedValue(INVITE);
  // reset module-level filter state
  await mount();
  $$('.freq-filter-btn').find((b) => b.dataset.freq === 'semua').click();
  if ($('#toggleInactive').checked) $('#toggleInactive').click();
  window.router.renderCurrent.mockClear();
});

describe('Tetapan view', () => {
  it('loads amalan + invite, renders active items and the invite card', async () => {
    expect(getAmalan).toHaveBeenCalled();
    expect(getInviteCode).toHaveBeenCalled();
    await mount();
    expect($$('#amalanTableBody tr[data-id]').map((r) => r.dataset.id)).toEqual(['1', '2']);
    expect($('#inviteCode').textContent).toBe('ABC-2345');
    expect($('#inviteLink').value).toBe(INVITE.link);
    expect(tetapanRoute.roles).toEqual(['naqib']);
    expect($$('#amalanInputType option').map((o) => o.textContent)).toEqual(['Kiraan', 'Tanda', 'Solat 5 waktu']);
    expect($$('#amalanFreq option').map((o) => o.value)).toEqual(['harian', 'mingguan', 'bulanan']);
  });

  it('creates an amalan with the exact body and reloads', async () => {
    await mount();
    $('#btnOpenAddModal').click();
    fill('#amalanName', ' Sedekah ');
    fill('#amalanDesc', 'Setiap minggu');
    fill('#amalanFreq', 'harian');
    fill('#amalanInputType', 'count');
    fill('#amalanTarget', '3');
    fill('#amalanUnit', 'kali');
    fill('#amalanIcon', 'volunteer_activism');
    createAmalan.mockResolvedValue({});
    submit();
    await flush();
    expect(createAmalan).toHaveBeenCalledWith({ name: 'Sedekah', description: 'Setiap minggu', freq: 'harian', inputType: 'count', targetVal: 3, unit: 'kali', icon: 'volunteer_activism' });
    expect(window.router.renderCurrent).toHaveBeenCalled();
  });

  it.each(['0', '1.5', '-2', ''])('rejects targetVal %j client-side', async (v) => {
    await mount();
    $('#btnOpenAddModal').click();
    fill('#amalanName', 'X');
    fill('#amalanTarget', v);
    submit();
    await flush();
    expect(createAmalan).not.toHaveBeenCalled();
    expect($('[data-field-error="targetVal"]').textContent).not.toBe('');
  });

  it('shows API errors inline and does not reload', async () => {
    await mount();
    $('#btnOpenAddModal').click();
    fill('#amalanName', 'X');
    createAmalan.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Data tidak sah', { name: 'Nama terlalu panjang' }));
    submit();
    await flush();
    expect($('[data-field-error="name"]').textContent).toBe('Nama terlalu panjang');
    expect(window.router.renderCurrent).not.toHaveBeenCalled();
  });

  it('edit modal disables Jenis input, patches without inputType, and surfaces a 409 message', async () => {
    await mount();
    $('[data-action="edit"][data-id="1"]').click();
    expect($('#amalanInputType').disabled).toBe(true);
    expect($('#amalanInputType').value).toBe('count');
    expect($('#amalanName').value).toBe('Tilawah');
    fill('#amalanTarget', '7');
    updateAmalan.mockRejectedValueOnce(new ApiError(409, 'CONFLICT', 'Jenis input tidak boleh diubah kerana sudah ada rekod'));
    submit();
    await flush();
    expect(updateAmalan).toHaveBeenCalledWith(1, { name: 'Tilawah', description: 'Baca Quran', freq: 'harian', targetVal: 7, unit: 'kali', icon: 'menu_book' });
    expect($('#amalanFormError').textContent).toBe('Jenis input tidak boleh diubah kerana sudah ada rekod');
    expect(window.router.renderCurrent).not.toHaveBeenCalled();
  });

  it('Nyahaktif deactivates; the toggle reveals inactive items with Aktifkan semula', async () => {
    await mount();
    deactivateAmalan.mockResolvedValue({});
    $('[data-action="deactivate"][data-id="2"]').click();
    await flush();
    expect(deactivateAmalan).toHaveBeenCalledWith(2);
    expect(window.router.renderCurrent).toHaveBeenCalledTimes(1);

    $('#toggleInactive').click(); // sets showInactive, then reload (mocked)
    await mount();
    expect($$('#amalanTableBody tr[data-id]').map((r) => r.dataset.id)).toEqual(['1', '2', '3']);
    updateAmalan.mockResolvedValue({});
    $('[data-action="reactivate"][data-id="3"]').click();
    await flush();
    expect(updateAmalan).toHaveBeenCalledWith(3, { active: true });
  });

  it('Jana kod baru asks for confirmation first', async () => {
    await mount();
    regenerateInviteCode.mockResolvedValue({ inviteCode: 'XYZ-9999', link: 'l' });
    const confirmSpy = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal('confirm', confirmSpy);
    $('#btnRegenerate').click();
    await flush();
    expect(regenerateInviteCode).not.toHaveBeenCalled();
    $('#btnRegenerate').click();
    await flush();
    expect(regenerateInviteCode).toHaveBeenCalledTimes(1);
    expect(window.router.renderCurrent).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('copy buttons use copyText and toast Disalin / a fallback', async () => {
    await mount();
    copyText.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    $('[data-copy="ABC-2345"]').click();
    await flush();
    expect(copyText).toHaveBeenCalledWith('ABC-2345');
    expect(window.showToast).toHaveBeenLastCalledWith('Disalin', 'success');
    $('[data-copy="ABC-2345"]').click();
    await flush();
    expect(window.showToast.mock.calls.at(-1)[0]).toMatch(/salin/i);
    expect(window.showToast.mock.calls.at(-1)[1]).toBe('warning');
  });

  it('escapes hostile strings from the API', async () => {
    const evil = '"><img src=x onerror=alert(1)>';
    getAmalan.mockResolvedValue([{ ...base, id: 9, code: evil, name: evil, description: evil, unit: evil, icon: evil, freq: 'harian', inputType: 'check', targetVal: 1 }]);
    getInviteCode.mockResolvedValue({ inviteCode: evil, link: evil });
    getAmalan.mockClear();
    await mount();
    expect(document.querySelector('img')).toBeNull();
    expect($('#inviteLink').value).toBe(evil);
    expect($('#inviteCode').textContent).toBe(evil);
    expect($('[data-copy]').dataset.copy).toBe(evil);
    $('[data-action="edit"]').click(); // icon option is escaped too
    expect(document.querySelector('img')).toBeNull();
    expect($('#amalanName').value).toBe(evil);
  });
});
