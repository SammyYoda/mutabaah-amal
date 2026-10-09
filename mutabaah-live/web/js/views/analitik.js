/**
 * View: Ahli - Analitik (Personal Worship Analytics & Consistency)
 */

import { store } from '../store.js';

export function renderAnalitikView() {
  const currentUser = store.getCurrentUser();

  // Generate 60 heatmap points
  const heatmapData = [
    { day: 1, pct: 65, note: 'Hari 1: 65%' },
    { day: 2, pct: 70, note: 'Hari 2: 70%' },
    { day: 3, pct: 82, note: 'Hari 3: 82%' },
    { day: 4, pct: 95, note: 'Hari 4 (Jumaat): 95%' },
    { day: 5, pct: 68, note: 'Hari 5: 68%' },
    { day: 6, pct: 38, note: 'Hari 6: 38% (Sakit)' },
    { day: 7, pct: 64, note: 'Hari 7: 64%' },
    { day: 8, pct: 78, note: 'Hari 8: 78%' },
    { day: 9, pct: 80, note: 'Hari 9: 80%' },
    { day: 10, pct: 92, note: 'Hari 10: 92%' },
    { day: 11, pct: 96, note: 'Hari 11 (Jumaat): 96%' },
    { day: 12, pct: 85, note: 'Hari 12: 85%' },
    { day: 13, pct: 88, note: 'Hari 13: 88%' },
    { day: 14, pct: 68, note: 'Hari 14: 68%' },
    { day: 15, pct: 75, note: 'Hari 15: 75%' },
    { day: 16, pct: 80, note: 'Hari 16: 80%' },
    { day: 17, pct: 94, note: 'Hari 17: 94%' },
    { day: 18, pct: 98, note: 'Hari 18 (Jumaat): 98%' },
    { day: 19, pct: 76, note: 'Hari 19: 76%' },
    { day: 20, pct: 84, note: 'Hari 20: 84%' },
    { day: 21, pct: 82, note: 'Hari 21: 82%' },
    { day: 22, pct: 66, note: 'Hari 22: 66%' },
    { day: 23, pct: 35, note: 'Hari 23: 35% (Musafir)' },
    { day: 24, pct: 70, note: 'Hari 24: 70%' },
    { day: 25, pct: 96, note: 'Hari 25 (Jumaat): 96%' },
    { day: 26, pct: 86, note: 'Hari 26: 86%' },
    { day: 27, pct: 85, note: 'Hari 27: 85%' },
    { day: 28, pct: 88, note: 'Hari 28: 88%' },
    { day: 29, pct: 92, note: 'Hari 29: 92%' },
    { day: 30, pct: 84, note: 'Hari 30: 84%' },
    { day: 31, pct: 94, note: 'Hari 31: 94%' },
    { day: 32, pct: 96, note: 'Hari 32 (Jumaat): 96%' },
    { day: 33, pct: 78, note: 'Hari 33: 78%' },
    { day: 34, pct: 82, note: 'Hari 34: 82%' },
    { day: 35, pct: 90, note: 'Hari 35: 90%' },
    { day: 36, pct: 88, note: 'Hari 36: 88%' },
    { day: 37, pct: 84, note: 'Hari 37: 84%' },
    { day: 38, pct: 86, note: 'Hari 38: 86%' },
    { day: 39, pct: 95, note: 'Hari 39 (Jumaat): 95%' },
    { day: 40, pct: 80, note: 'Hari 40: 80%' },
    { day: 41, pct: 85, note: 'Hari 41: 85%' },
    { day: 42, pct: 92, note: 'Hari 42: 92%' },
    { day: 43, pct: 94, note: 'Hari 43: 94%' },
    { day: 44, pct: 86, note: 'Hari 44: 86%' },
    { day: 45, pct: 88, note: 'Hari 45: 88%' },
    { day: 46, pct: 98, note: 'Hari 46 (Jumaat): 98%' },
    { day: 47, pct: 82, note: 'Hari 47: 82%' },
    { day: 48, pct: 84, note: 'Hari 48: 84%' },
    { day: 49, pct: 90, note: 'Hari 49: 90%' },
    { day: 50, pct: 88, note: 'Hari 50: 88%' },
    { day: 51, pct: 92, note: 'Hari 51: 92%' },
    { day: 52, pct: 89, note: 'Hari 52: 89%' },
    { day: 53, pct: 95, note: 'Hari 53: 95%' },
    { day: 54, pct: 80, note: 'Hari 54: 80%' },
    { day: 55, pct: 85, note: 'Hari 55: 85%' },
    { day: 56, pct: 88, note: 'Hari 56: 88%' },
    { day: 57, pct: 91, note: 'Hari 57: 91%' },
    { day: 58, pct: 94, note: 'Hari 58: 94%' },
    { day: 59, pct: 85, note: 'Hari 59: 85%' },
    { day: 60, pct: 88, note: 'Hari 60 (Hari Ini): 88%' }
  ];

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                Analitik Prestasi Ruhani
              </span>
              <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                Sesi 1446H
              </span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
              Analitik &amp; Momentum Istiqamah
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
              Penilaian kendiri yaumi &amp; usrah bagi <span class="font-semibold text-on-surface">${currentUser.name}</span>
            </p>
          </div>
          <div class="flex items-center gap-space-sm">
            <button class="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 border border-outline-variant/40 transition-colors cursor-pointer text-sm font-semibold" onclick="window.print()" type="button">
              <span class="material-symbols-outlined text-[18px]">print</span>
              <span>Cetak / Eksport</span>
            </button>
            <button class="px-space-md py-2 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark font-label-md text-label-md flex items-center gap-2 transition-colors cursor-pointer text-sm font-semibold shadow-sm" onclick="window.showToast('Laporan PDF dijana dan sedia dimuat turun!', 'success')" type="button">
              <span class="material-symbols-outlined text-[18px]">download</span>
              <span>Muat Turun PDF</span>
            </button>
          </div>
        </div>

        <!-- 2-Column: Weekly Trend Bar Chart & 60-Day Heatmap -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          
          <!-- 1. 8-Week Momentum Bar Chart -->
          <div class="lg:col-span-7 bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-xs">
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Trend Prestasi 8 Minggu</h2>
                <span class="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-medium text-xs">Sasaran Usrah 75%</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Graf peratusan kumulatif disiplin amal mingguan.</p>
            </div>

            <!-- SVG Bar Chart -->
            <div class="my-space-md overflow-x-auto">
              <svg class="w-full min-w-[480px] h-56" viewBox="0 0 540 230">
                <!-- Grid Lines -->
                <line class="text-surface-container" stroke="currentColor" stroke-width="1" x1="40" x2="520" y1="20" y2="20"></line>
                <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="32" y="24">100%</text>
                <line class="text-surface-container" stroke="currentColor" stroke-width="1" x1="40" x2="520" y1="65" y2="65"></line>
                <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="32" y="69">75%</text>
                <line class="text-surface-container" stroke="currentColor" stroke-width="1" x1="40" x2="520" y1="110" y2="110"></line>
                <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="32" y="114">50%</text>
                <line class="text-surface-container" stroke="currentColor" stroke-width="1" x1="40" x2="520" y1="155" y2="155"></line>
                <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="32" y="159">25%</text>
                <line class="text-surface-container" stroke="currentColor" stroke-width="1.5" x1="40" x2="520" y1="200" y2="200"></line>
                <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="32" y="204">0%</text>

                <!-- Benchmark Line at 75% in Orange IKRAM -->
                <line class="text-orange-vibrant" stroke="#EA580C" stroke-dasharray="4,4" stroke-width="2" x1="40" x2="520" y1="65" y2="65"></line>

                <!-- Bars (M1 to M8) -->
                <!-- Week 1: 72% -->
                <g class="cursor-pointer group">
                  <rect class="fill-surface-variant transition-colors group-hover:fill-primary-container" height="130" rx="4" width="34" x="58" y="70"></rect>
                  <text class="fill-on-surface-variant group-hover:fill-primary-container text-[11px] font-semibold" text-anchor="middle" x="75" y="62">72%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="75" y="218">M1</text>
                </g>
                <!-- Week 2: 75% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-fixed-dim transition-colors group-hover:fill-primary-container" height="135" rx="4" width="34" x="116" y="65"></rect>
                  <text class="fill-primary-container group-hover:fill-primary text-[11px] font-semibold" text-anchor="middle" x="133" y="57">75%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="133" y="218">M2</text>
                </g>
                <!-- Week 3: 80% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-container transition-opacity group-hover:opacity-85" height="144" rx="4" width="34" x="174" y="56"></rect>
                  <text class="fill-primary-container text-[11px] font-bold" text-anchor="middle" x="191" y="48">80%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="191" y="218">M3</text>
                </g>
                <!-- Week 4: 78% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-container transition-opacity group-hover:opacity-85" height="140" rx="4" width="34" x="232" y="60"></rect>
                  <text class="fill-primary-container text-[11px] font-bold" text-anchor="middle" x="249" y="52">78%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="249" y="218">M4</text>
                </g>
                <!-- Week 5: 84% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-container transition-opacity group-hover:opacity-85" height="151" rx="4" width="34" x="290" y="49"></rect>
                  <text class="fill-primary-container text-[11px] font-bold" text-anchor="middle" x="307" y="41">84%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="307" y="218">M5</text>
                </g>
                <!-- Week 6: 82% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-container transition-opacity group-hover:opacity-85" height="148" rx="4" width="34" x="348" y="52"></rect>
                  <text class="fill-primary-container text-[11px] font-bold" text-anchor="middle" x="365" y="44">82%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="365" y="218">M6</text>
                </g>
                <!-- Week 7: 85% -->
                <g class="cursor-pointer group">
                  <rect class="fill-primary-container transition-opacity group-hover:opacity-85" height="153" rx="4" width="34" x="406" y="47"></rect>
                  <text class="fill-primary-container text-[11px] font-bold" text-anchor="middle" x="423" y="39">85%</text>
                  <text class="fill-on-surface-variant text-[11px]" text-anchor="middle" x="423" y="218">M7</text>
                </g>
                <!-- Week 8: 78% (Terkini) -->
                <g class="cursor-pointer group">
                  <rect class="fill-orange-vibrant transition-opacity group-hover:opacity-85" height="140" rx="4" width="34" x="464" y="60"></rect>
                  <text class="fill-orange-vibrant text-[11px] font-bold" text-anchor="middle" x="481" y="52">78%</text>
                  <text class="fill-on-surface text-[11px] font-bold" text-anchor="middle" x="481" y="218">M8 (Kini)</text>
                </g>
              </svg>
            </div>

            <div class="mt-space-md p-space-sm bg-surface-container-low rounded-lg flex items-center justify-between font-label-sm text-label-sm">
              <span class="text-on-surface-variant text-xs">Momentum 8 Minggu: <strong class="text-on-surface">+6% peningkatan bersih</strong> sejak M1</span>
              <span class="text-primary font-semibold text-xs">Status: Tahap Mumtaz</span>
            </div>
          </div>

          <!-- 2. 60-Day Consistency Heatmap Grid -->
          <div class="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between">
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Momentum Harian (60 Hari)</h2>
                <span class="font-label-sm text-label-sm text-primary-container bg-teal-light px-2 py-0.5 rounded-md font-semibold text-xs">8.5 Minggu</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 text-sm">Matriks ketekunan ibadah setiap hari secara berterusan.</p>

              <!-- Heatmap Grid -->
              <div class="mt-space-md bg-surface-container-low p-space-md rounded-lg">
                <div class="flex items-center justify-between text-on-surface-variant font-label-sm text-[10px] mb-2 px-1">
                  <span>60 Hari Lepas</span>
                  <span>30 Hari Lepas</span>
                  <span>Hari Ini</span>
                </div>
                <!-- 10 columns x 6 rows -->
                <div class="grid grid-cols-10 gap-1.5 justify-items-center">
                  ${heatmapData.map(item => {
                    let colorClass = 'bg-surface-container-highest';
                    if (item.pct >= 90) colorClass = 'bg-primary-container';
                    else if (item.pct >= 70) colorClass = 'bg-primary-fixed-dim';
                    else if (item.pct >= 45) colorClass = 'bg-sky-tint';

                    return `<div class="w-5 h-5 rounded-sm ${colorClass} hover:ring-2 hover:ring-orange-vibrant transition-all cursor-pointer" title="${item.note}"></div>`;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Heatmap Legend -->
            <div class="flex items-center justify-between text-on-surface-variant text-[11px] pt-space-md border-t border-outline-variant/20 mt-3">
              <span>Kurang 40%</span>
              <div class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-surface-container-highest"></span>
                <span class="w-3 h-3 rounded bg-sky-tint"></span>
                <span class="w-3 h-3 rounded bg-primary-fixed-dim"></span>
                <span class="w-3 h-3 rounded bg-primary-container"></span>
              </div>
              <span class="font-bold text-primary-container">90-100%</span>
            </div>
          </div>

        </div>

        <!-- Category Progress Breakdown -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl">
          <div class="flex items-center justify-between mb-space-md">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Penyempurnaan Mengikut Kategori Amalan</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Purata pelaksanaan 8 amalan utama bagi bulan semasa</p>
            </div>
            <span class="px-2.5 py-1 rounded bg-teal-light text-primary font-semibold text-xs">Purata Keseluruhan: 88%</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-md">
            ${[
              { name: 'Solat Fardhu Berjamaah', pct: 98, note: '5/5 Waktu di masjid/surau', icon: 'mosque' },
              { name: 'Istighfar & Zikir Harian', pct: 96, note: 'Purata 85 kali sehari', icon: 'counter_3' },
              { name: 'Wirid Selepas Solat & Ma\'thurat', pct: 94, note: 'Pagi & petang terlaksana', icon: 'menu_book' },
              { name: 'Tilawah Al-Quran (5 m/s)', pct: 86, note: 'Purata 5.2 m/s sehari', icon: 'auto_stories' },
              { name: 'Solat Sunat Rawatib (8 rakaat)', pct: 84, note: 'Qabliyyah & Ba\'diyyah', icon: 'person_play' },
              { name: 'Riadah & Kesihatan Fizikal', pct: 72, note: '2.2 sesi seminggu', icon: 'directions_run' },
              { name: 'Qiamullail & Tahajjud', pct: 60, note: 'Sasaran 1x seminggu', icon: 'bedtime', highlight: true },
              { name: 'Puasa Sunat (Isnin/Khamis)', pct: 55, note: '1 hari sebulan', icon: 'restaurant', highlight: true }
            ].map(cat => `
              <div class="flex flex-col p-2 rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-medium text-on-surface text-sm flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[18px] ${cat.highlight ? 'text-orange-vibrant' : 'text-primary-container'}">${cat.icon}</span>
                    ${cat.name}
                  </span>
                  <span class="font-bold text-sm ${cat.highlight ? 'text-orange-vibrant' : 'text-primary-container'}">${cat.pct}%</span>
                </div>
                <div class="w-full bg-surface-container rounded-full h-2 overflow-hidden mt-1">
                  <div class="${cat.highlight ? 'bg-orange-vibrant' : 'bg-primary-container'} h-full rounded-full transition-all" style="width: ${cat.pct}%"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1">${cat.note}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>
  `;
}

export function initAnalitikHandlers() {
  // Can bind interactive tooltips or filter toggle if desired
}
