/**
 * View: Naqib - Profil Ahli (Member Deep-Dive Profile & Mentorship Dispatch)
 */

import { store } from '../store.js';

export function renderProfilAhliView() {
  const members = store.getMembers();
  const selectedMemberId = store.getSelectedMemberId();
  const member = store.getMemberById(selectedMemberId);
  const guidanceList = store.getGuidanceList().filter(g => g.targetMemberId === selectedMemberId || (!g.targetMemberId && selectedMemberId === 'faiz'));

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Member Quick Selector Header -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div class="flex items-start sm:items-center gap-space-md">
            <span class="w-14 h-14 rounded-full bg-teal-light text-primary border-2 border-primary-container flex items-center justify-center font-bold text-xl shrink-0">
              ${member.avatarInitials}
            </span>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                  Profil Mutaba'ah Ahli
                </span>
                <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                  ${member.status}
                </span>
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
                ${member.name}
              </h1>
              <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
                Usrah An-Nur • Tempoh Bersama Usrah: ${member.usrahTenure} • Emel: ${member.email}
              </p>
            </div>
          </div>

          <!-- Switch Member Dropdown -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start md:self-auto">
            <label class="text-xs font-semibold text-on-surface-variant" for="memberSelectorSelect">Pilih Ahli:</label>
            <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container font-semibold cursor-pointer" id="memberSelectorSelect">
              ${members.map(m => `
                <option value="${m.id}" ${m.id === selectedMemberId ? 'selected' : ''}>
                  ${m.name} (${m.score}%)
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- 3 Key KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-lg">
          
          <!-- KPI 1: Skor Sesi Ini -->
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Skor Sesi Ini</span>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold text-primary-container">${member.score}%</span>
                <span class="text-xs font-semibold text-success-amal">+3%</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">Sesi Mingguan Ke-24</span>
            </div>
            <div class="relative w-16 h-16 shrink-0">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle class="stroke-current text-surface-container" cx="18" cy="18" fill="none" r="15.9" stroke-width="3"></circle>
                <circle class="stroke-current text-primary-container" cx="18" cy="18" fill="none" r="15.9" stroke-dasharray="${member.score}, 100" stroke-linecap="round" stroke-width="3"></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center font-bold text-xs">
                ${member.score}%
              </div>
            </div>
          </div>

          <!-- KPI 2: Purata 8 Minggu -->
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Purata 8 Minggu</span>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold text-on-surface">81.4%</span>
                <span class="text-xs font-semibold text-primary">Stabil</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">Amalan konsisten sesi 17-24</span>
            </div>
            <div class="w-14 h-14 rounded-full bg-teal-light flex items-center justify-center text-primary-container shrink-0">
              <span class="material-symbols-outlined text-[28px]">trending_up</span>
            </div>
          </div>

          <!-- KPI 3: Status Momentum Ruhani -->
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Status Disiplin Sesi</span>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold ${member.score >= 80 ? 'text-primary-container' : 'text-orange-vibrant'}">${member.score >= 80 ? 'Teguh' : 'Perlu Dorongan'}</span>
                <span class="text-xs text-on-surface-variant">(${member.status})</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">Komitmen ibadah fardhu &amp; usrah</span>
            </div>
            <div class="w-14 h-14 rounded-full bg-orange-surface flex items-center justify-center text-secondary-container shrink-0">
              <span class="material-symbols-outlined text-[28px]">stars</span>
            </div>
          </div>

        </div>

        <!-- Trend Chart & 60-Day Consistency Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          
          <!-- Left: Weekly Trend Chart (7 cols) -->
          <div class="lg:col-span-7 bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-sm">
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Trend Mutaba'ah 8 Minggu</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Prestasi kumulatif fardhu, tilawah, ma'thurat, &amp; nawafil</p>
                </div>
                <span class="font-label-sm text-label-sm bg-surface-container-low px-space-sm py-1 rounded text-on-surface-variant text-xs">Sasaran 80%</span>
              </div>

              <!-- SVG Trend Chart -->
              <div class="w-full h-48 sm:h-56 mt-space-md relative">
                <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 180">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="#007a87" stop-opacity="0.25"></stop>
                      <stop offset="100%" stop-color="#007a87" stop-opacity="0.0"></stop>
                    </linearGradient>
                  </defs>
                  <line stroke="#bdc8cb" stroke-dasharray="4 4" stroke-width="1.5" x1="0" x2="500" y1="54" y2="54"></line>
                  <text class="text-[11px]" fill="#3e494a" opacity="0.7" x="5" y="48">Garis Sasaran 80%</text>

                  <path d="M 0,80 Q 70,60 140,75 T 280,45 T 420,65 T 500,48 L 500,180 L 0,180 Z" fill="url(#chartGradient)"></path>
                  <path d="M 0,80 Q 70,60 140,75 T 280,45 T 420,65 T 500,48" fill="none" stroke="#007a87" stroke-linecap="round" stroke-width="3"></path>

                  <circle cx="0" cy="80" fill="#007a87" r="4"></circle>
                  <circle cx="71" cy="70" fill="#007a87" r="4"></circle>
                  <circle cx="142" cy="75" fill="#007a87" r="4"></circle>
                  <circle cx="213" cy="58" fill="#007a87" r="4"></circle>
                  <circle cx="284" cy="45" fill="#007a87" r="4"></circle>
                  <circle cx="355" cy="55" fill="#007a87" r="4"></circle>
                  <circle cx="426" cy="65" fill="#007a87" r="4"></circle>
                  <circle cx="500" cy="48" fill="#EA580C" r="5" stroke="#ffffff" stroke-width="2"></circle>
                </svg>
              </div>

              <div class="grid grid-cols-8 text-center text-xs text-on-surface-variant pt-space-xs">
                <span>M-17</span>
                <span>M-18</span>
                <span>M-19</span>
                <span>M-20</span>
                <span>M-21</span>
                <span>M-22</span>
                <span>M-23</span>
                <span class="font-bold text-primary-container">M-24 (Kini)</span>
              </div>
            </div>

            <div class="mt-space-md pt-space-sm bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between text-on-surface-variant text-xs">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px] text-primary-container">info</span>
                Momentum ${member.name} meningkat semula sejak Sesi M-23 (+5%).
              </span>
              <span class="font-semibold text-on-surface">Skor Sesi Ini: ${member.score}%</span>
            </div>
          </div>

          <!-- Right: 60-Day Consistency Grid (5 cols) -->
          <div class="lg:col-span-5 bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-sm">
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Peta Konsistensi (60 Hari)</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Kekhusyukan harian ${member.name} sejak 2 bulan lalu</p>
                </div>
                <span class="text-xs text-primary font-bold">52/60 Hari Aktif</span>
              </div>

              <div class="grid grid-cols-10 gap-1.5 sm:gap-2 my-space-md">
                ${Array.from({ length: 60 }).map((_, i) => {
                  const isLow = i === 6 || i === 15 || i === 22 || i === 28 || i === 44;
                  const isMed = i % 5 === 0;
                  const isToday = i === 59;
                  const bg = isLow ? 'bg-surface-container-highest' : (isMed ? 'bg-sky-tint' : 'bg-primary-container');
                  const ring = isToday ? 'ring-2 ring-orange-vibrant' : '';

                  return `<div class="h-5 sm:h-6 rounded ${bg} ${ring}" title="Hari ${i + 1}"></div>`;
                }).join('')}
              </div>

              <div class="flex items-center justify-between text-on-surface-variant text-[11px] pt-space-xs border-t border-outline-variant/20">
                <span>60 Hari Lalu</span>
                <div class="flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded bg-surface-container-highest"></span>
                  <span>&lt;50%</span>
                  <span class="w-2.5 h-2.5 rounded bg-sky-tint ml-1"></span>
                  <span>50-84%</span>
                  <span class="w-2.5 h-2.5 rounded bg-primary-container ml-1"></span>
                  <span>&gt;85%</span>
                </div>
                <span class="font-bold text-on-surface">Hari Ini</span>
              </div>
            </div>

            <div class="mt-space-md p-space-sm bg-surface-container-low rounded-lg text-xs text-on-surface-variant flex items-center gap-space-xs">
              <span class="material-symbols-outlined text-[16px] text-primary">psychology</span>
              <span>Konsistensi solat fardhu &amp; ma'thurat kekal tidak putus selama 18 hari berturut-turut.</span>
            </div>
          </div>

        </div>

        <!-- Breakdown: Kekuatan (Top 3) vs Perlu Perhatian (Bottom 3) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-lg">
          <!-- Top 3 Kekuatan -->
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
            <div class="flex items-center justify-between mb-space-md">
              <div class="flex items-center gap-space-sm">
                <div class="w-8 h-8 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
                </div>
                <div>
                  <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Kekuatan Amalan (Top 3)</h4>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Disiplin tinggi &amp; istiqamah terpuji</p>
                </div>
              </div>
              <span class="text-xs text-primary-container bg-teal-light px-2 py-0.5 rounded font-bold">Kamil</span>
            </div>
            
            <div class="space-y-space-md">
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-primary-container text-[18px]">mosque</span>
                    Solat Fardhu Berjamaah
                  </span>
                  <span class="font-bold text-primary-container">98%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-primary-container rounded-full" style="width: 98%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">Subuh di masjid: 6/7 hari minggu ini</span>
              </div>
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-primary-container text-[18px]">counter_3</span>
                    Istighfar &amp; Zikir Taubat (70x)
                  </span>
                  <span class="font-bold text-primary-container">96%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-primary-container rounded-full" style="width: 96%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">Konsisten mengulang wirid selepas Asar &amp; sebelum tidur</span>
              </div>
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-primary-container text-[18px]">menu_book</span>
                    Wirid Ma'thurat Kubra / Sughra
                  </span>
                  <span class="font-bold text-primary-container">94%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-primary-container rounded-full" style="width: 94%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">Sempurna kedua-dua sesi pagi &amp; petang</span>
              </div>
            </div>
          </div>

          <!-- Bottom 3 Perlu Perhatian -->
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
            <div class="flex items-center justify-between mb-space-md">
              <div class="flex items-center gap-space-sm">
                <div class="w-8 h-8 rounded-lg bg-orange-surface text-orange-vibrant flex items-center justify-center">
                  <span class="material-symbols-outlined text-[18px]">priority_high</span>
                </div>
                <div>
                  <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Perlu Perhatian (Bottom 3)</h4>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Memerlukan sokongan &amp; dorongan naqib</p>
                </div>
              </div>
              <span class="text-xs text-orange-vibrant bg-orange-surface px-2 py-0.5 rounded font-bold">Fokus Bimbingan</span>
            </div>
            
            <div class="space-y-space-md">
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-orange-vibrant text-[18px]">bedtime</span>
                    Qiamullail &amp; Tahajjud
                  </span>
                  <span class="font-bold text-orange-vibrant">60%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-orange-vibrant rounded-full" style="width: 60%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">Hanya 3 malam sebulan lalu, sasaran usrah: 2x seminggu</span>
              </div>
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-tertiary text-[18px]">directions_run</span>
                    Riadah Jasmani (Min 30 min)
                  </span>
                  <span class="font-bold text-tertiary">65%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-tertiary rounded-full" style="width: 65%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">Kekangan kerja syif menyebabkan riadah sering terabai</span>
              </div>
              <div>
                <div class="flex justify-between items-center mb-1 text-xs">
                  <span class="font-semibold text-on-surface flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-orange-vibrant text-[18px]">restaurant</span>
                    Puasa Sunat (Isnin/Khamis/Putih)
                  </span>
                  <span class="font-bold text-orange-vibrant">55%</span>
                </div>
                <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                  <div class="h-full bg-orange-vibrant rounded-full" style="width: 55%;"></div>
                </div>
                <span class="text-[11px] text-on-surface-variant mt-1 block">1 hari sahaja dalam 2 minggu kebelakangan ini</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Dedicated Panel: Beri Bimbingan Peribadi kepada Ahli -->
        <div class="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-xl shadow-md border border-outline-variant/30 mb-space-lg relative overflow-hidden" id="panel-bimbingan">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-lg pb-space-sm bg-surface-container-low -mx-space-md -mt-space-md sm:-mx-space-xl sm:-mt-space-xl p-space-md sm:p-space-lg">
            <div class="flex items-center gap-space-sm">
              <div class="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">edit_note</span>
              </div>
              <div>
                <h3 class="font-headline-md text-headline-md text-on-surface font-bold text-lg">Beri Bimbingan Peribadi kepada Ahli</h3>
                <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Tausiyah khusus untuk ${member.name} • Notifikasi eksklusif akan dihantar ke aplikasi beliau</p>
              </div>
            </div>
            <div class="flex items-center gap-space-xs font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-space-sm py-1 rounded-md text-xs">
              <span class="material-symbols-outlined text-[16px] text-primary-container">shield</span>
              <span>Covenant Naqib-Ahli</span>
            </div>
          </div>

          <!-- Guidance Form -->
          <form class="space-y-space-md" id="guidanceDispatchForm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <!-- Dropdown Kategori / Amalan -->
              <div>
                <label class="block font-label-md text-label-md text-on-surface font-semibold mb-1 text-xs" for="guidanceCategorySelect">
                  Kategori Fokus Amalan
                </label>
                <select class="w-full bg-surface-container-low rounded-lg p-2.5 text-xs md:text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary-container cursor-pointer" id="guidanceCategorySelect">
                  <option value="umum">Bimbingan Umum (Tazkiyatun Nafs &amp; Disiplin)</option>
                  <option selected value="qiamullail">Qiamullail &amp; Tahajjud (Keutamaan Semasa: 60%)</option>
                  <option value="riadah">Riadah Jasmani (Kesihatan &amp; Stamina: 65%)</option>
                  <option value="puasa">Puasa Sunat (Isnin / Khamis: 55%)</option>
                  <option value="tilawah">Tilawah Al-Quran &amp; Tadabbur</option>
                  <option value="infaq">Infaq &amp; Khidmat Ummah</option>
                </select>
              </div>

              <!-- Tajuk Ringkas -->
              <div>
                <label class="block font-label-md text-label-md text-on-surface font-semibold mb-1 text-xs" for="guidanceTitleInput">
                  Tajuk Nasihat / Tausiyah
                </label>
                <input class="w-full bg-surface-container-low rounded-lg p-2.5 text-xs md:text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary-container" id="guidanceTitleInput" placeholder="cth: Tips Istiqamah Bangun Sepertiga Malam" required type="text" value="Tips Istiqamah Bangun Sepertiga Malam &amp; Mengatur Waktu Tidur"/>
              </div>
            </div>

            <!-- Ruang Teks (Textarea) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block font-label-md text-label-md text-on-surface font-semibold text-xs" for="guidanceContentTextarea">
                  Kandungan Bimbingan &amp; Tausiyah
                </label>
                <span class="text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px]">format_quote</span>
                  Sertakan dalil, doa, atau cadangan praktikal
                </span>
              </div>
              <textarea class="w-full bg-surface-container-low rounded-lg p-3 text-xs md:text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary-container resize-none h-28" id="guidanceContentTextarea" required placeholder="Tulis nasihat, doa, tadabbur, atau kata-kata perangsang rohani di sini...">Akhi ${member.name.split(' ')[0]} yang dimuliakan Allah, alhamdulillah solat fardhu berjamaah dan istighfar enta berada pada tahap yang membanggakan (${member.score}%).

Berkenaan qiamullail yang tercicir sedikit kebelakangan ini kerana bebanan tugasan:
1. Mulakan dengan tidur seawal jam 11 malam bila tiada kecemasan.
2. Amalkan wuduk dan zikir tidur sebelum melelapkan mata.
3. Cukupkan sekadar bangun 15 minit sebelum Subuh untuk 2 rakaat witir ringkas dan istighfar sahurlah terlebih dahulu bagi membina momentum semula.</textarea>
            </div>

            <!-- Priority & Submit Button -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-2 border-t border-outline-variant/20">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input checked class="w-4 h-4 rounded text-orange-vibrant accent-orange-vibrant cursor-pointer" id="guidancePriorityCheckbox" type="checkbox"/>
                <span class="text-xs text-on-surface">Tandakan sebagai <strong class="text-orange-vibrant font-semibold">keutamaan tinggi</strong> untuk usrah akan datang</span>
              </label>

              <button class="px-space-xl py-2.5 bg-primary-container text-on-primary hover:bg-teal-dark rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer" id="btnDispatchGuidance" type="submit">
                <span class="material-symbols-outlined text-[18px]">send</span>
                <span>Hantar Nota Bimbingan</span>
              </button>
            </div>
          </form>

          <!-- Success Alert -->
          <div class="hidden mt-space-md p-space-md bg-teal-light border border-primary/20 rounded-lg flex items-center justify-between text-primary-container" id="dispatchSuccessAlert">
            <div class="flex items-center gap-space-sm text-xs md:text-sm">
              <span class="material-symbols-outlined text-[20px] text-primary-container">check_circle</span>
              <span class="font-semibold">Nota bimbingan berjaya dihantar ke peti masuk peribadi ${member.name}!</span>
            </div>
            <button class="text-on-surface-variant hover:text-on-surface cursor-pointer" onclick="document.getElementById('dispatchSuccessAlert').classList.add('hidden')" type="button">
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Sejarah Bimbingan Diberikan (Timeline) -->
        <div class="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm border border-outline-variant/30 mb-space-2xl">
          <div class="flex items-center justify-between mb-space-md">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Sejarah Bimbingan Diberikan</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Log bimbingan yang dihantar oleh Ustaz Hazwan kepada ${member.name}</p>
            </div>
            <span class="text-xs bg-surface-container-low px-2.5 py-1 rounded text-on-surface-variant font-medium">
              Jumlah Rekod: ${guidanceList.length} Entri
            </span>
          </div>

          <div class="space-y-space-md">
            ${guidanceList.length === 0 ? `
              <p class="text-xs text-on-surface-variant text-center py-6">Belum ada nota bimbingan yang dihantar kepada ahli ini.</p>
            ` : guidanceList.map(item => `
              <div class="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="bg-orange-surface text-orange-vibrant text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ${item.categoryLabel || item.category}
                    </span>
                    <span class="text-xs text-on-surface-variant">${item.date}</span>
                  </div>
                  <div class="flex items-center gap-1 text-primary-container text-xs bg-teal-light px-2 py-0.5 rounded self-start sm:self-auto font-medium">
                    <span class="material-symbols-outlined text-[15px]">${item.read ? 'done_all' : 'mark_chat_read'}</span>
                    <span>${item.read ? `Telah dibaca &amp; difahami (${item.readDate || 'Selesai'})` : 'Menunggu bacaan ahli'}</span>
                  </div>
                </div>

                <h4 class="font-bold text-on-surface text-xs md:text-sm mb-1">${item.title}</h4>
                <p class="text-xs text-on-surface-variant leading-relaxed mb-2">${item.content}</p>

                ${item.replies && item.replies.length > 0 ? `
                  <div class="mt-2 pt-2 border-t border-outline-variant/20 text-xs">
                    <span class="font-semibold text-primary">Respons ${item.replies[0].author}:</span>
                    <p class="text-on-surface italic mt-0.5">"${item.replies[0].text}"</p>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    </div>
  `;
}

export function initProfilAhliHandlers() {
  const memberSelect = document.getElementById('memberSelectorSelect');
  if (memberSelect) {
    memberSelect.onchange = (e) => {
      store.setSelectedMember(e.target.value);
      window.router.renderCurrent();
      window.showToast(`Memuatkan profil ${store.getMemberById(e.target.value).name}`, 'info');
    };
  }

  const dispatchForm = document.getElementById('guidanceDispatchForm');
  if (dispatchForm) {
    dispatchForm.onsubmit = (e) => {
      e.preventDefault();
      const selectedMemberId = store.getSelectedMemberId();
      const member = store.getMemberById(selectedMemberId);
      const catSelect = document.getElementById('guidanceCategorySelect');
      const titleInput = document.getElementById('guidanceTitleInput');
      const contentInput = document.getElementById('guidanceContentTextarea');
      const priorityCheckbox = document.getElementById('guidancePriorityCheckbox');

      const newGuidance = {
        category: catSelect.value,
        categoryLabel: catSelect.options[catSelect.selectedIndex].text.split('(')[0].trim(),
        targetMemberId: selectedMemberId,
        targetMemberName: member.name,
        title: titleInput.value.trim(),
        content: contentInput.value.trim(),
        priority: priorityCheckbox.checked
      };

      store.sendGuidanceFromNaqib(newGuidance);

      const alert = document.getElementById('dispatchSuccessAlert');
      if (alert) alert.classList.remove('hidden');

      window.showToast(`Nota bimbingan berjaya dihantar kepada ${member.name}!`, 'success');

      setTimeout(() => {
        window.router.renderCurrent();
      }, 900);
    };
  }
}
