/**
 * View: Naqib - Ringkasan (Usrah Halaqah Overview Dashboard)
 */

import { store } from '../store.js';

export function renderRingkasanView() {
  const members = store.getMembers();

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                Portal Naqib Usrah
              </span>
              <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                Usrah An-Nur (20 Ahli)
              </span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
              Ringkasan Prestasi Halaqah Usrah
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
              Pemantauan kumulatif mutaba'ah amal usrah Sesi 1446H • Naqib: <span class="font-semibold text-on-surface">Ustaz Hazwan Ismail</span>
            </p>
          </div>

          <div class="flex items-center gap-space-sm">
            <a class="px-space-md py-2 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark font-label-md text-label-md flex items-center gap-2 transition-colors cursor-pointer text-sm font-semibold shadow-sm" href="#matriks">
              <span class="material-symbols-outlined text-[18px]">grid_view</span>
              <span>Buka Matriks Amalan</span>
            </a>
          </div>
        </div>

        <!-- 4 KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
          
          <!-- KPI 1 -->
          <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Kehadiran Ahli</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-2xl font-bold text-on-surface">20 / 20</span>
                <span class="text-xs font-semibold text-success-amal">100%</span>
              </div>
              <span class="text-[11px] text-on-surface-variant mt-0.5 block">Semua ahli mengisi rekod</span>
            </div>
            <div class="w-12 h-12 rounded-lg bg-teal-light flex items-center justify-center text-primary-container shrink-0">
              <span class="material-symbols-outlined text-[24px]">groups</span>
            </div>
          </div>

          <!-- KPI 2 -->
          <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Purata Halaqah</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-2xl font-bold text-primary-container">81.2%</span>
                <span class="text-xs font-semibold text-success-amal">+2.4%</span>
              </div>
              <span class="text-[11px] text-on-surface-variant mt-0.5 block">Status: Mumtaz (Sesi 24)</span>
            </div>
            <div class="w-12 h-12 rounded-lg bg-teal-light flex items-center justify-center text-primary-container shrink-0">
              <span class="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
          </div>

          <!-- KPI 3 -->
          <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Disiplin Fardhu</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-2xl font-bold text-on-surface">96.4%</span>
                <span class="text-xs font-semibold text-primary">Kamil</span>
              </div>
              <span class="text-[11px] text-on-surface-variant mt-0.5 block">Solat berjemaah di surau/masjid</span>
            </div>
            <div class="w-12 h-12 rounded-lg bg-teal-light flex items-center justify-center text-primary-container shrink-0">
              <span class="material-symbols-outlined text-[24px]">mosque</span>
            </div>
          </div>

          <!-- KPI 4 -->
          <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Perlu Perhatian</span>
              <div class="flex items-baseline gap-1 mt-1">
                <span class="text-2xl font-bold text-orange-vibrant">2 Ahli</span>
                <span class="text-xs font-semibold text-secondary">&lt;75%</span>
              </div>
              <span class="text-[11px] text-on-surface-variant mt-0.5 block">Luqman Hakim &amp; Zaim Farhan</span>
            </div>
            <div class="w-12 h-12 rounded-lg bg-orange-surface flex items-center justify-center text-orange-vibrant shrink-0">
              <span class="material-symbols-outlined text-[24px]">priority_high</span>
            </div>
          </div>

        </div>

        <!-- Trend Chart & 16-Amalan Progress Ranking -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          
          <!-- Left: 8-Week Trend Chart (5 cols) -->
          <div class="lg:col-span-5 bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-xs">
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Trend Prestasi (8 Minggu)</h3>
                <span class="font-label-sm text-label-sm px-space-sm py-1 rounded bg-surface-container text-on-surface-variant text-xs">Sesi 17 – 24</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Graf peningkatan purata disiplin amal seluruh halaqah usrah.</p>
            </div>

            <!-- Inline SVG Trend Chart -->
            <div class="my-space-md">
              <svg aria-label="Grafik garis trend 8 minggu" class="w-full h-44 overflow-visible" viewBox="0 0 420 180">
                <defs>
                  <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stop-color="#007a87" stop-opacity="0.30"></stop>
                    <stop offset="100%" stop-color="#007a87" stop-opacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <line stroke="#d5e5ed" stroke-dasharray="3 3" x1="30" x2="400" y1="20" y2="20"></line>
                <line stroke="#d5e5ed" stroke-dasharray="3 3" x1="30" x2="400" y1="60" y2="60"></line>
                <line stroke="#d5e5ed" stroke-dasharray="3 3" x1="30" x2="400" y1="100" y2="100"></line>
                <line stroke="#d5e5ed" x1="30" x2="400" y1="140" y2="140"></line>
                
                <text class="text-[10px] fill-current text-on-surface-variant" x="5" y="24">100%</text>
                <text class="text-[10px] fill-current text-on-surface-variant" x="5" y="64">80%</text>
                <text class="text-[10px] fill-current text-on-surface-variant" x="5" y="104">60%</text>
                <text class="text-[10px] fill-current text-on-surface-variant" x="5" y="144">40%</text>

                <polygon fill="url(#trendGradient)" points="50,94 100,90 150,84 200,76 250,72 300,68 350,62 400,56 400,140 50,140"></polygon>
                <polyline fill="none" points="50,94 100,90 150,84 200,76 250,72 300,68 350,62 400,56" stroke="#007a87" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"></polyline>

                <circle class="fill-surface-container-lowest stroke-primary-container" cx="50" cy="94" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="100" cy="90" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="150" cy="84" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="200" cy="76" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="250" cy="72" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="300" cy="68" r="3.5" stroke-width="2"></circle>
                <circle class="fill-surface-container-lowest stroke-primary-container" cx="350" cy="62" r="3.5" stroke-width="2"></circle>
                <circle class="fill-orange-vibrant stroke-surface-container-lowest" cx="400" cy="56" r="5" stroke-width="2"></circle>

                <rect class="fill-primary-container" height="18" rx="4" width="46" x="372" y="30"></rect>
                <text class="text-[10px] font-bold fill-white" text-anchor="middle" x="395" y="43">81.2%</text>

                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="50" y="160">M17</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="100" y="160">M18</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="150" y="160">M19</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="200" y="160">M20</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="250" y="160">M21</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="300" y="160">M22</text>
                <text class="text-[10px] fill-current text-on-surface-variant" text-anchor="middle" x="350" y="160">M23</text>
                <text class="text-[10px] font-bold fill-on-surface" text-anchor="middle" x="400" y="160">M24</text>
              </svg>
            </div>

            <!-- Trend Meta Insight -->
            <div class="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between text-on-surface border border-outline-variant/30">
              <div class="flex items-center gap-space-xs text-xs">
                <span class="material-symbols-outlined text-[18px] text-primary-container">trending_up</span>
                <span>Kenaikan 8.2% semenjak Minggu ke-17 (73.0%)</span>
              </div>
              <span class="text-xs text-primary-container font-bold">Kualiti Istiqamah</span>
            </div>
          </div>

          <!-- Right: Ranked Progress Bars across 16 Amalan (7 cols) -->
          <div class="lg:col-span-7 bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
            <div class="flex items-center justify-between mb-space-sm">
              <div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Penyempurnaan Mengikut Amalan</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Purata pelaksanaan 16 amalan utama merentasi 20 orang ahli</p>
              </div>
              <div class="flex items-center gap-space-xs text-xs">
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <span class="text-on-surface-variant mr-space-sm">&gt;75%</span>
                <span class="inline-block w-2.5 h-2.5 rounded-full bg-orange-vibrant"></span>
                <span class="text-on-surface-variant">&lt;60%</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-2 mt-space-sm">
              ${[
                { num: '1', name: 'Solat Berjamaah', pct: 96 },
                { num: '2', name: 'Istighfar Harian', pct: 94 },
                { num: '3', name: 'Wirid Solat Fardhu', pct: 91 },
                { num: '4', name: 'Tilawah (1 Juzuk/Hari)', pct: 86 },
                { num: '5', name: 'Sedekah Subuh', pct: 85 },
                { num: '6', name: 'Ziarah Ibu Bapa', pct: 80 },
                { num: '7', name: 'Solat Rawatib', pct: 78 },
                { num: '8', name: 'Solat Dhuha', pct: 75 },
                { num: '9', name: 'Ma\'thurat Kubra/Sughra', pct: 74 },
                { num: '10', name: 'Doa Rabitah & Keberkatan', pct: 72 },
                { num: '11', name: 'Hafazan Surah & Hadith', pct: 70 },
                { num: '12', name: 'Riadah Jasmani', pct: 68 },
                { num: '13', name: 'Hubungan & Ihsan Jiran', pct: 65 },
                { num: '14', name: 'Qiamullail Tahajjud', pct: 60, alert: true },
                { num: '15', name: 'Puasa Isnin / Khamis', pct: 55, alert: true },
                { num: '16', name: 'Membaca Buku Fikrah', pct: 52, alert: true }
              ].map(item => `
                <div class="flex flex-col py-1">
                  <div class="flex justify-between text-xs font-semibold">
                    <span class="text-on-surface truncate">${item.num}. ${item.name}</span>
                    <span class="${item.alert ? 'text-orange-vibrant' : 'text-primary-container'} font-bold">${item.pct}%</span>
                  </div>
                  <div class="w-full bg-surface-container rounded-full h-1.5 mt-1 overflow-hidden">
                    <div class="${item.alert ? 'bg-orange-vibrant' : 'bg-primary-container'} h-full rounded-full transition-all" style="width: ${item.pct}%;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Full Member Roster Grid -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg">
          <div class="flex items-center justify-between mb-space-md">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Senarai 20 Ahli Usrah An-Nur</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Klik untuk melihat profil terperinci ahli</p>
            </div>
            <a class="text-primary hover:text-teal-dark text-xs font-bold flex items-center gap-1" href="#matriks">
              <span>Lihat Matriks Penuh</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-space-sm">
            ${members.map(m => `
              <button class="flex items-center gap-space-sm p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary-container/40 transition-all cursor-pointer text-left group" onclick="window.navigateToMember('${m.id}')" type="button">
                <span class="w-9 h-9 rounded-full ${m.score >= 80 ? 'bg-teal-light text-primary-container border-primary-container/20' : (m.score >= 70 ? 'bg-sky-tint text-sky-support border-sky-support/20' : 'bg-orange-surface text-secondary border-secondary/20')} border flex items-center justify-center font-bold text-xs shrink-0">${m.avatarInitials}</span>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-on-surface truncate group-hover:text-primary">${m.name.split(' ').slice(0, 2).join(' ')}</p>
                  <p class="text-[11px] ${m.score >= 80 ? 'text-primary-container' : (m.score >= 70 ? 'text-sky-support' : 'text-orange-vibrant')} font-bold">${m.score}%</p>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Focus Section: Ahli Memerlukan Bimbingan Segera -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-orange-vibrant text-[20px]">notification_important</span>
                Ahli Memerlukan Perhatian &amp; Dorongan Naqib
              </h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Disyorkan untuk diberikan tausiyah khusus atau dihubungi sebelum sesi usrah Sabtu ini.</p>
            </div>
            <a class="text-primary hover:text-teal-dark text-xs font-bold flex items-center gap-1" href="#matriks">
              <span>Lihat Semua 20 Ahli</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            
            <!-- Member 1: Luqman Hakim -->
            <div class="p-space-md rounded-xl bg-orange-surface/50 border border-orange-vibrant/20 flex flex-col justify-between gap-3">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-space-sm">
                  <span class="w-10 h-10 rounded-full bg-orange-surface text-secondary-container border border-secondary-container/30 flex items-center justify-center font-bold text-sm">LH</span>
                  <div>
                    <h4 class="font-bold text-on-surface text-sm">Luqman Hakim</h4>
                    <span class="text-xs text-on-surface-variant">Skor Sesi Ini: <strong class="text-secondary">74%</strong></span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-orange-vibrant text-white font-bold text-[10px]">Perlu Dorongan</span>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                Penurunan ketara pada <strong>Membaca Buku Tsaqafah (35%)</strong> dan <strong>Qiamullail (55%)</strong> akibat bebanan projek luar daerah.
              </p>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-orange-vibrant/10">
                <button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark text-xs font-bold transition-all flex items-center gap-1 cursor-pointer" onclick="window.navigateToMember('luqman')" type="button">
                  <span class="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Beri Bimbingan</span>
                </button>
              </div>
            </div>

            <!-- Member 2: Zaim Farhan -->
            <div class="p-space-md rounded-xl bg-orange-surface/50 border border-orange-vibrant/20 flex flex-col justify-between gap-3">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-space-sm">
                  <span class="w-10 h-10 rounded-full bg-orange-surface text-secondary-container border border-secondary-container/30 flex items-center justify-center font-bold text-sm">ZF</span>
                  <div>
                    <h4 class="font-bold text-on-surface text-sm">Zaim Farhan</h4>
                    <span class="text-xs text-on-surface-variant">Skor Sesi Ini: <strong class="text-secondary">63%</strong></span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded bg-orange-vibrant text-white font-bold text-[10px]">Tindakan Segera</span>
              </div>
              <p class="text-xs text-on-surface-variant leading-relaxed">
                Catatan <strong>Qiamullail (32%)</strong> dan <strong>Rawatib (38%)</strong> rendah sepanjang 2 minggu lepas. Perlu sokongan motivasi rohani.
              </p>
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-orange-vibrant/10">
                <button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark text-xs font-bold transition-all flex items-center gap-1 cursor-pointer" onclick="window.navigateToMember('zaim')" type="button">
                  <span class="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Beri Bimbingan</span>
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  `;
}

export function initRingkasanHandlers() {
  // Handlers attached via global navigateToMember
}
