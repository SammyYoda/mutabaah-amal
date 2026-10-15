/**
 * View: Naqib - Matriks Amalan (Ahli × Amalan heatmap table), on live data from GET /usrah/matrix.
 * Search / filter / sort run on the client and re-render only the table body (no refetch).
 */

import { getMatrix } from '../api.js';
import { escapeHtml } from '../util.js';
import { bandOf, levelBadgeClass } from './charts.js';
import { navigateToMember } from './profilAhli.js';

const APP = "Mutaba'ah Amal";
const WEEKS = 4;

let searchQuery = '';
let filterTier = 'all'; // 'all' | 'a' | 'b' | 'c' (status bands on the row average)
let sortBy = 'default'; // 'default' | 'high' | 'low' | 'name'

/** Cell colour by status band: A success, B warning, C error. */
function cellClass(val) {
  const band = bandOf(val);
  if (band === 'A') return 'text-success-amal bg-success-surface font-semibold';
  if (band === 'B') return 'text-orange-vibrant bg-orange-surface font-semibold';
  return 'text-on-error-container bg-error-container font-bold';
}

function averageClass(val) {
  const band = bandOf(val);
  if (band === 'A') return 'bg-success-surface text-success-amal';
  if (band === 'B') return 'bg-orange-surface text-orange-vibrant';
  return 'bg-error-container text-error';
}

/** R19: a member with nothing expected in the period (no cells) is "Baru" — no band, no failing 0%. */
export const isBaruRow = (row) => !row.cells || Object.keys(row.cells).length === 0;

/** Rows after the current search / filter / sort. */
export function visibleRows(rows) {
  const q = searchQuery.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    if (q && !String(row.name).toLowerCase().includes(q)) return false;
    if (filterTier !== 'all' && isBaruRow(row)) return false; // Baru rows only under "semua"
    if (filterTier === 'a') return bandOf(row.average) === 'A';
    if (filterTier === 'b') return bandOf(row.average) === 'B';
    if (filterTier === 'c') return bandOf(row.average) === 'C';
    return true;
  });
  if (sortBy === 'high') filtered.sort((a, b) => b.average - a.average);
  else if (sortBy === 'low') filtered.sort((a, b) => a.average - b.average);
  else if (sortBy === 'name') filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return filtered;
}

function bodyHtml(data) {
  const colspan = data.amalan.length + 3;
  if (!data.rows.length) {
    return `<tr><td colspan="${colspan}" class="py-8 text-center text-on-surface-variant">Belum ada ahli dalam usrah ini. Kongsi kod jemputan di <a class="text-primary font-bold" href="#tetapan">Tetapan</a>.</td></tr>`;
  }
  const rows = visibleRows(data.rows);
  if (!rows.length) {
    return `<tr><td colspan="${colspan}" class="py-8 text-center text-on-surface-variant">Tiada ahli yang sepadan dengan carian "${escapeHtml(searchQuery)}".</td></tr>`;
  }
  return rows
    .map(
      (row, idx) => `
      <tr class="hover:bg-surface-container-high/60 transition-colors group cursor-pointer" data-member-id="${escapeHtml(row.memberId)}">
        <td class="sticky left-0 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low py-2.5 px-3 text-center font-semibold text-on-surface-variant">${idx + 1}</td>
        <td class="sticky left-12 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low px-4 py-2.5 font-medium text-on-surface shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
          <span class="flex items-center justify-between gap-1">
            <span class="truncate font-semibold text-primary group-hover:underline">${escapeHtml(row.name)}</span>
            <span class="material-symbols-outlined text-[14px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward_ios</span>
          </span>
        </td>
        ${data.amalan
          .map((a) => {
            const key = String(a.id);
            const has = row.cells && Object.hasOwn(row.cells, key);
            return has
              ? `<td class="p-1 text-center tabular-nums ${cellClass(row.cells[key])}" data-cell>${escapeHtml(row.cells[key])}%</td>`
              : '<td class="p-1 text-center text-on-surface-variant" data-cell title="Tiada data untuk tempoh ini">—</td>';
          })
          .join('')}
        <td class="sticky right-0 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low px-3 py-2.5 text-center shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
          ${isBaruRow(row)
            ? `<span class="inline-flex items-center gap-1"><span class="inline-block px-2 py-0.5 rounded-full font-bold text-on-surface-variant" data-average>—</span><span class="px-1.5 rounded border text-[10px] font-bold ${levelBadgeClass(null)}" data-baru>Baru</span></span>`
            : `<span class="inline-block px-2 py-0.5 rounded-full font-bold tabular-nums ${averageClass(row.average)}" data-average>${escapeHtml(row.average)}%</span>`}
        </td>
      </tr>`,
    )
    .join('');
}

export function renderMatriksView(data) {
  const { amalan, rows } = data;
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg" id="matriksView">
      <div class="flex flex-col w-full">

        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">Matriks Halaqah Usrah</span>
              <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">${WEEKS} Minggu Terakhir</span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
              Matriks Amalan Mutaba'ah (${rows.length} Ahli × ${amalan.length} Amalan)
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
              Peratus pencapaian setiap amalan bagi setiap ahli. "—" bermaksud tiada data untuk tempoh ini.
            </p>
          </div>
        </div>

        <!-- Toolbar: Search, Filters & Legend -->
        <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 mb-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div class="flex flex-col sm:flex-row sm:items-center gap-space-sm flex-1">
            <div class="relative flex-1 max-w-sm">
              <span class="material-symbols-outlined text-outline absolute left-3 top-2.5 text-lg pointer-events-none">search</span>
              <input class="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-surface-dim/60 rounded-lg text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container transition-all" id="matrixSearchInput" placeholder="Cari nama ahli usrah..." type="text" value="${escapeHtml(searchQuery)}"/>
            </div>
            <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="matrixFilterSelect">
              <option value="all" ${filterTier === 'all' ? 'selected' : ''}>Semua Tahap Prestasi (${rows.length})</option>
              <option value="a" ${filterTier === 'a' ? 'selected' : ''}>Teguh (Level A) ≥80%</option>
              <option value="b" ${filterTier === 'b' ? 'selected' : ''}>Sederhana (Level B) 60–79%</option>
              <option value="c" ${filterTier === 'c' ? 'selected' : ''}>Perlu Perhatian (Level C) &lt;60%</option>
            </select>
            <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="matrixSortSelect">
              <option value="default" ${sortBy === 'default' ? 'selected' : ''}>Susunan Asal</option>
              <option value="high" ${sortBy === 'high' ? 'selected' : ''}>Skor: Tertinggi Dahulu</option>
              <option value="low" ${sortBy === 'low' ? 'selected' : ''}>Skor: Terendah Dahulu</option>
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Susunan Abjad (A-Z)</option>
            </select>
          </div>
          <div class="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap">
            <span class="font-semibold text-on-surface">Petunjuk:</span>
            <span class="px-2 py-0.5 rounded bg-success-surface text-success-amal font-bold">≥80%</span>
            <span class="px-2 py-0.5 rounded bg-orange-surface text-orange-vibrant font-bold">60–79%</span>
            <span class="px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold">&lt;60%</span>
            <span class="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-bold">— tiada data</span>
          </div>
        </div>

        <!-- Scrollable Heatmap Table -->
        <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-space-2xl">
          <div class="w-full overflow-x-auto relative">
            <table class="w-full border-collapse text-left select-none text-xs" id="matrixTable">
              <thead>
                <tr class="bg-surface-container text-on-surface border-b border-outline-variant/40 text-[11px]">
                  <th class="sticky left-0 z-30 bg-surface-container px-3 py-3 w-12 text-center text-on-surface-variant font-bold">Bil</th>
                  <th class="sticky left-12 z-30 bg-surface-container px-4 py-3 min-w-[170px] max-w-[210px] text-on-surface font-bold shadow-[2px_0_4px_rgba(0,0,0,0.03)]">Nama Ahli Usrah</th>
                  ${amalan
                    .map(
                      (a) => `<th class="px-1 py-3 text-center min-w-[56px] max-w-[80px]" data-amalan-id="${escapeHtml(a.id)}"><span class="block font-semibold truncate" title="${escapeHtml(a.code)} — ${escapeHtml(a.name)}">${escapeHtml(a.name)}</span></th>`,
                    )
                    .join('')}
                  <th class="sticky right-0 z-30 bg-surface-container px-4 py-3 min-w-[110px] text-center font-bold text-on-surface shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">Purata Ahli</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-container text-xs" id="matrixBody">${bodyHtml(data)}</tbody>
            </table>
          </div>
        </div>

      </div>
    </div>`;
}

export function initMatriksHandlers(data) {
  const body = document.getElementById('matrixBody');
  const refresh = () => {
    if (body) body.innerHTML = bodyHtml(data);
  };
  const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('matrixSearchInput'));
  const filterSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('matrixFilterSelect'));
  const sortSelect = /** @type {HTMLSelectElement|null} */ (document.getElementById('matrixSortSelect'));
  if (searchInput) {
    searchInput.oninput = () => {
      searchQuery = searchInput.value;
      refresh();
    };
  }
  if (filterSelect) {
    filterSelect.onchange = () => {
      filterTier = filterSelect.value;
      refresh();
    };
  }
  if (sortSelect) {
    sortSelect.onchange = () => {
      sortBy = sortSelect.value;
      refresh();
    };
  }
  if (body) {
    body.onclick = (e) => {
      const tr = /** @type {HTMLElement} */ (e.target).closest('tr[data-member-id]');
      if (tr) navigateToMember(tr.getAttribute('data-member-id'));
    };
  }
}

export const matriksRoute = {
  title: `Matriks Amalan | ${APP}`,
  roles: ['naqib'],
  load: () => getMatrix(WEEKS),
  render: renderMatriksView,
  init: initMatriksHandlers,
};
