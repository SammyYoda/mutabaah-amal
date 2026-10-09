import { vi } from 'vitest';

vi.mock('../api.js', async (importOriginal) => {
  const orig = await importOriginal();
  return { ...orig, getMatrix: vi.fn() };
});

import { getMatrix } from '../api.js';
import { matriksRoute } from './matriks.js';

const MATRIX = {
  amalan: [
    { id: 1, code: '01', name: 'Tilawah' },
    { id: 2, code: '02', name: 'Solat Fardhu' },
    { id: 3, code: '03', name: 'Puasa Sunat' },
  ],
  rows: [
    { memberId: 11, name: 'Ali Bin Abu', cells: { 1: 100, 2: 90, 3: 50 }, average: 88 },
    { memberId: 12, name: 'Bakar Salleh', cells: { 1: 0, 2: 70 }, average: 62 },
    { memberId: 13, name: 'Chong Wei', cells: {}, average: 0 },
  ],
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function mount() {
  const data = await matriksRoute.load(new URLSearchParams());
  document.body.innerHTML = `<main id="app-main">${matriksRoute.render(data)}</main>`;
  matriksRoute.init?.(data);
  return data;
}
const rowIds = () => $$('#matrixBody tr[data-member-id]').map((r) => r.dataset.memberId);

beforeEach(async () => {
  vi.clearAllMocks();
  getMatrix.mockResolvedValue(MATRIX);
  window.router = { renderCurrent: vi.fn() };
  history.replaceState(null, '', '#matriks');
  // reset module-level search/filter/sort state
  await mount();
  const s = $('#matrixSearchInput');
  s.value = '';
  s.dispatchEvent(new Event('input'));
  $('#matrixFilterSelect').value = 'all';
  $('#matrixFilterSelect').dispatchEvent(new Event('change'));
  $('#matrixSortSelect').value = 'default';
  $('#matrixSortSelect').dispatchEvent(new Event('change'));
});

describe('Matriks view', () => {
  it('is a naqib route; columns come from amalan, rows from rows', async () => {
    expect(matriksRoute.roles).toEqual(['naqib']);
    await mount();
    expect($$('#matrixTable thead th[data-amalan-id]').map((th) => th.textContent.trim())).toEqual(['Tilawah', 'Solat Fardhu', 'Puasa Sunat']);
    expect(rowIds()).toEqual(['11', '12', '13']);
    expect(document.body.textContent).toContain('3 Ahli × 3 Amalan');
  });

  it('cells show percentages, absent keys show — (not 0%), averages from the API', async () => {
    await mount();
    const cells = (id) => [...$(`tr[data-member-id="${id}"]`).querySelectorAll('[data-cell]')].map((c) => c.textContent.trim());
    expect(cells(11)).toEqual(['100%', '90%', '50%']);
    expect(cells(12)).toEqual(['0%', '70%', '—']);
    expect(cells(13)).toEqual(['—', '—', '—']);
    expect($('tr[data-member-id="12"] [data-average]').textContent.trim()).toBe('62%');
  });

  it('search, filter and sort run on the client', async () => {
    await mount();
    getMatrix.mockClear();
    const s = $('#matrixSearchInput');
    s.value = 'bak';
    s.dispatchEvent(new Event('input'));
    expect(rowIds()).toEqual(['12']);
    expect(getMatrix).not.toHaveBeenCalled(); // no refetch
    s.value = '';
    s.dispatchEvent(new Event('input'));

    $('#matrixSortSelect').value = 'low';
    $('#matrixSortSelect').dispatchEvent(new Event('change'));
    expect(rowIds()).toEqual(['13', '12', '11']);

    $('#matrixFilterSelect').value = 'a';
    $('#matrixFilterSelect').dispatchEvent(new Event('change'));
    expect(rowIds()).toEqual(['11']);
    $('#matrixFilterSelect').value = 'b';
    $('#matrixFilterSelect').dispatchEvent(new Event('change'));
    expect(rowIds()).toEqual(['12']);
    $('#matrixFilterSelect').value = 'c';
    $('#matrixFilterSelect').dispatchEvent(new Event('change'));
    expect(rowIds()).toEqual(['13']);
    expect(getMatrix).not.toHaveBeenCalled();
  });

  it('clicking a row navigates to the member profile', async () => {
    await mount();
    $('tr[data-member-id="11"]').click();
    expect(window.location.hash).toBe('#profil-ahli?id=11');
  });

  it('shows an empty state with no members', async () => {
    getMatrix.mockResolvedValue({ amalan: MATRIX.amalan, rows: [] });
    await mount();
    expect(document.body.textContent).toContain('Belum ada ahli');
  });

  it('escapes hostile strings (names, codes, search echo)', async () => {
    const evil = '"><img src=x onerror=alert(1)>';
    getMatrix.mockResolvedValue({ amalan: [{ id: 1, code: evil, name: evil }], rows: [{ memberId: evil, name: evil, cells: { 1: 50 }, average: 50 }] });
    await mount();
    expect(document.querySelector('img')).toBeNull();
    const s = $('#matrixSearchInput');
    s.value = evil + 'zz';
    s.dispatchEvent(new Event('input'));
    expect(document.querySelector('img')).toBeNull();
    expect($('#matrixSearchInput').value).toBe(evil + 'zz');
  });
});
