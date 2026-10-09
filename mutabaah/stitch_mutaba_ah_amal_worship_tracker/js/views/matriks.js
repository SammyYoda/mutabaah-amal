/**
 * View: Naqib - Matriks Amalan (20 Ahli × 17 Amalan Heatmap Table)
 */

import { store } from '../store.js';

let searchQuery = '';
let filterTier = 'all'; // 'all', 'mumtaz', 'sederhana', 'perhatian'
let sortBy = 'default'; // 'default', 'high', 'low', 'name'

export function renderMatriksView() {
  const matrixData = store.getMatrix();
  const amalanList = store.getAmalanList();

  // Filter & Search
  let filtered = matrixData.filter(row => {
    const matchesSearch = row.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterTier === 'mumtaz') return row.avg >= 85;
    if (filterTier === 'sederhana') return row.avg >= 70 && row.avg < 85;
    if (filterTier === 'perhatian') return row.avg < 70;
    return true;
  });

  // Sort
  if (sortBy === 'high') {
    filtered.sort((a, b) => b.avg - a.avg);
  } else if (sortBy === 'low') {
    filtered.sort((a, b) => a.avg - b.avg);
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  function getCellClass(val) {
    if (val >= 85) return 'text-success-amal bg-success-surface font-semibold';
    if (val >= 70) return 'text-sky-support bg-sky-tint font-semibold';
    if (val >= 50) return 'text-orange-vibrant bg-orange-surface font-semibold';
    return 'text-on-error-container bg-error-container font-bold';
  }

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                Matriks Halaqah Usrah
              </span>
              <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                Sesi Ke-24
              </span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
              Matriks Amalan Mutaba'ah (20 Ahli × 17 Amalan)
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
              Peta haba terperinci bagi menilai ketekunan seluruh anggota usrah secara telus dan tersusun.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs bg-teal-light text-primary font-bold px-3 py-1.5 rounded-lg border border-primary-container/20">
              Purata Halaqah: 81.2%
            </span>
          </div>
        </div>

        <!-- Toolbar: Search, Filters & Legend -->
        <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 mb-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          
          <div class="flex flex-col sm:flex-row sm:items-center gap-space-sm flex-1">
            <!-- Search Bar -->
            <div class="relative flex-1 max-w-sm">
              <span class="material-symbols-outlined text-outline absolute left-3 top-2.5 text-lg pointer-events-none">search</span>
              <input class="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-surface-dim/60 rounded-lg text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container transition-all" id="matrixSearchInput" placeholder="Cari nama ahli usrah..." type="text" value="${searchQuery}"/>
            </div>

            <!-- Tier Filter -->
            <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="matrixFilterSelect">
              <option value="all" ${filterTier === 'all' ? 'selected' : ''}>Semua Tahap Prestasi (${matrixData.length})</option>
              <option value="mumtaz" ${filterTier === 'mumtaz' ? 'selected' : ''}>Mumtaz &gt;85%</option>
              <option value="sederhana" ${filterTier === 'sederhana' ? 'selected' : ''}>Sederhana 70-84%</option>
              <option value="perhatian" ${filterTier === 'perhatian' ? 'selected' : ''}>Perlu Perhatian &lt;70%</option>
            </select>

            <!-- Sort By -->
            <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="matrixSortSelect">
              <option value="default" ${sortBy === 'default' ? 'selected' : ''}>Susunan Asal Bil</option>
              <option value="high" ${sortBy === 'high' ? 'selected' : ''}>Skor: Tertinggi Dahulu</option>
              <option value="low" ${sortBy === 'low' ? 'selected' : ''}>Skor: Terendah Dahulu</option>
              <option value="name" ${sortBy === 'name' ? 'selected' : ''}>Susunan Abjad (A-Z)</option>
            </select>
          </div>

          <!-- Color Legend -->
          <div class="flex items-center gap-2 text-[11px] text-on-surface-variant flex-wrap">
            <span class="font-semibold text-on-surface">Petunjuk:</span>
            <span class="px-2 py-0.5 rounded bg-success-surface text-success-amal font-bold">&gt;85%</span>
            <span class="px-2 py-0.5 rounded bg-sky-tint text-sky-support font-bold">70-84%</span>
            <span class="px-2 py-0.5 rounded bg-orange-surface text-orange-vibrant font-bold">50-69%</span>
            <span class="px-2 py-0.5 rounded bg-error-container text-on-error-container font-bold">&lt;50%</span>
          </div>

        </div>

        <!-- Scrollable Responsive Heatmap Table -->
        <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-space-2xl">
          <div class="w-full overflow-x-auto relative">
            <table class="w-full min-w-[1100px] border-collapse text-left select-none text-xs" id="matrixTable">
              <thead>
                <tr class="bg-surface-container text-on-surface border-b border-outline-variant/40 text-[11px]">
                  <th class="sticky left-0 z-30 bg-surface-container px-3 py-3 w-12 text-center text-on-surface-variant font-bold">
                    Bil
                  </th>
                  <th class="sticky left-12 z-30 bg-surface-container px-4 py-3 min-w-[170px] max-w-[210px] text-on-surface font-bold shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                    Nama Ahli Usrah
                  </th>
                  <!-- 17 Amalan Headers -->
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Tilawah Al-Quran">Tilawah</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Menghafaz Al-Quran">Hafaz</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Solat Berjemaah 5 Waktu">Jemaah</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Al-Ma'thurat">Ma'thurat</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Istighfar Minima 70x">Istighfar</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Solat Sunat Rawatib">Rawatib</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Solat Sunat Dhuha">Dhuha</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Doa-Doa Pilihan">Doa</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Wirid Selepas Solat">Wirid</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Membaca Buku Tsaqafah">M.Buku</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Riadah Jasmani">Riadah</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Ihsan & Sapaan Jiran">Jiran</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Qiamullail Tahajjud">Qiam</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Puasa Sunat">Puasa</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Bersedekah">Sedekah</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Silaturrahim Ibu Bapa">Ibu Bapa</span></th>
                  <th class="px-1 py-3 text-center min-w-[46px] max-w-[50px]"><span class="block font-semibold" title="Aktiviti Kemasyarakatan">Masyarakat</span></th>
                  <!-- Sticky Right Summary -->
                  <th class="sticky right-0 z-30 bg-surface-container px-4 py-3 min-w-[110px] text-center font-bold text-on-surface shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                    Purata Ahli
                  </th>
                </tr>
              </thead>

              <tbody class="divide-y divide-surface-container text-xs" id="matrixBody">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="20" class="py-8 text-center text-on-surface-variant">
                      Tiada ahli yang sepadan dengan carian "${searchQuery}".
                    </td>
                  </tr>
                ` : filtered.map((row, idx) => `
                  <tr class="hover:bg-surface-container-high/60 transition-colors group cursor-pointer" onclick="window.navigateToMember('${row.id}')">
                    <td class="sticky left-0 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low py-2.5 px-3 text-center font-semibold text-on-surface-variant">
                      ${idx + 1}
                    </td>
                    <td class="sticky left-12 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low px-4 py-2.5 font-medium text-on-surface flex items-center justify-between shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                      <span class="truncate font-semibold text-primary group-hover:underline">${row.name}</span>
                      <span class="material-symbols-outlined text-[14px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward_ios</span>
                    </td>

                    ${row.scores.map(s => `
                      <td class="p-1 text-center tabular-nums ${getCellClass(s)}">
                        ${s}%
                      </td>
                    `).join('')}

                    <td class="sticky right-0 z-20 bg-surface-container-lowest group-hover:bg-surface-container-low px-3 py-2.5 text-center shadow-[-2px_0_4px_rgba(0,0,0,0.03)]">
                      <span class="inline-block px-2 py-0.5 rounded-full font-bold tabular-nums ${row.avg >= 85 ? 'bg-teal-light text-primary-container' : (row.avg >= 70 ? 'bg-sky-tint text-sky-support' : 'bg-orange-surface text-secondary')}">
                        ${row.avg}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function initMatriksHandlers() {
  const searchInput = document.getElementById('matrixSearchInput');
  const filterSelect = document.getElementById('matrixFilterSelect');
  const sortSelect = document.getElementById('matrixSortSelect');

  if (searchInput) {
    searchInput.oninput = (e) => {
      searchQuery = e.target.value;
      window.router.renderCurrent();
      const input = document.getElementById('matrixSearchInput');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    };
  }

  if (filterSelect) {
    filterSelect.onchange = (e) => {
      filterTier = e.target.value;
      window.router.renderCurrent();
    };
  }

  if (sortSelect) {
    sortSelect.onchange = (e) => {
      sortBy = e.target.value;
      window.router.renderCurrent();
    };
  }
}
