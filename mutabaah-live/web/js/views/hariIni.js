/**
 * View: Ahli - Hari Ini (Daily Mutaba'ah Tracker)
 */

import { store } from '../store.js';

export function renderHariIniView() {
  const activeDate = store.getActiveDate();
  const log = store.getLogForDate(activeDate);
  const score = store.calculateScore(log);
  const currentUser = store.getCurrentUser();

  // Generate 7-day strip centered around today (Mon-Sun of current week)
  const dayNames = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
  const dayNamesFull = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const monthNames = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Find Monday of this week (ISO week starts Monday)
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const daysMeta = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const isToday = dateKey === todayStr;
    daysMeta.push({
      key: dateKey,
      dayShort: dayNames[d.getDay()],
      dayNum: String(d.getDate()),
      label: `${dayNamesFull[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}${isToday ? ' (Hari Ini)' : ''}`
    });
  }

  // Circle circumference is 125.6
  const dashOffset = (125.6 - (125.6 * score.percentage / 100)).toFixed(1);

  // Status Badge Label
  const statusLabel = score.percentage >= 80 ? 'Sasaran Tercapai' : (score.percentage >= 60 ? 'Prestasi Stabil' : 'Perlu Perhatian');

  const prayers = log.prayers || {};

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Top Ambient Banner & Header Status -->
        <div class="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md md:p-space-xl shadow-sm mb-space-lg border border-outline-variant/30">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
            
            <!-- Date & Spiritual Context -->
            <div class="flex flex-col gap-space-xs">
              <div class="flex items-center gap-space-xs flex-wrap">
                <span class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold">
                  <span class="material-symbols-outlined text-[15px]" style="font-variation-settings: 'FILL' 1;">calendar_today</span>
                  ${activeDate === todayStr ? 'Hari Ini' : 'Log Retrospektif'}
                </span>
                <span class="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-orange-surface text-ikram-orange font-label-md text-label-md font-semibold">
                  🔥 12 Hari Berturut-turut
                </span>
                <span class="inline-flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm ml-space-xs transition-all" id="save-pill">
                  <span class="material-symbols-outlined text-[14px] text-success-amal">cloud_done</span>
                  Disimpan automatik
                </span>
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface mt-space-xs tracking-tight text-2xl md:text-3xl font-bold">
                ${daysMeta.find(d => d.key === activeDate)?.label || (() => {
                  const dt = new Date(activeDate + 'T00:00:00');
                  return `${dayNamesFull[dt.getDay()]}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
                })()}
              </h1>
              <p class="font-body-md text-body-md text-on-surface-variant">
                Sesi Muhasabah Harian • Ahli: <span class="font-medium text-on-surface">${currentUser.name}</span>
              </p>
            </div>

            <!-- Quick Metrics Summary -->
            <div class="grid grid-cols-2 sm:grid-cols-2 gap-space-md shrink-0">
              <!-- Daily Metric Card -->
              <div class="bg-surface-container-low rounded-lg p-space-md flex items-center gap-space-md shadow-sm border border-outline-variant/30">
                <div class="relative w-14 h-14 flex items-center justify-center">
                  <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 48 48">
                    <circle class="text-surface-container-highest fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4.5"></circle>
                    <circle id="daily-progress-ring" class="text-success-amal fill-none progress-ring-circle" cx="24" cy="24" r="20" stroke="currentColor" stroke-dasharray="125.6" stroke-dashoffset="${dashOffset}" stroke-linecap="round" stroke-width="4.5"></circle>
                  </svg>
                  <span class="absolute font-numeral-counter text-numeral-counter text-on-surface font-bold text-sm" id="daily-score-pct">${score.percentage}%</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px] font-semibold">Skor Rekod</span>
                  <span class="font-headline-sm text-headline-sm text-on-surface font-bold text-base" id="daily-score-fraction">${score.completed} / ${score.total}</span>
                  <span class="font-label-sm text-label-sm text-success-amal font-semibold" id="daily-score-badge">${statusLabel}</span>
                </div>
              </div>

              <!-- Weekly Metric Card -->
              <div class="bg-surface-container-low rounded-lg p-space-md flex items-center gap-space-md shadow-sm border border-outline-variant/30">
                <div class="relative w-14 h-14 flex items-center justify-center">
                  <svg class="w-14 h-14 -rotate-90 transform" viewBox="0 0 48 48">
                    <circle class="text-surface-container-highest fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4.5"></circle>
                    <circle class="text-primary-container fill-none" cx="24" cy="24" r="20" stroke="currentColor" stroke-dasharray="125.6" stroke-dashoffset="27.6" stroke-linecap="round" stroke-width="4.5"></circle>
                  </svg>
                  <span class="absolute font-numeral-counter text-numeral-counter text-on-surface font-bold text-sm">78%</span>
                </div>
                <div class="flex flex-col">
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px] font-semibold">Minggu Ini</span>
                  <span class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Usrah Ke-24</span>
                  <span class="font-label-sm text-label-sm text-primary font-semibold">Prestasi Stabil</span>
                </div>
              </div>
            </div>

          </div>

          <!-- 7-Day Strip Navigation & Retrospective Log Selector -->
          <div class="mt-space-lg pt-space-md border-t border-outline-variant/20">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 font-semibold">
                <span class="material-symbols-outlined text-[16px]">history_toggle_off</span>
                Jalur Mingguan (Pilih hari untuk semak atau log retrospektif):
              </span>
              <span class="font-label-sm text-label-sm text-primary-container font-semibold">${daysMeta[0].dayNum} – ${daysMeta[6].dayNum} ${monthNames[new Date(daysMeta[0].key + 'T00:00:00').getMonth()]} ${new Date(daysMeta[0].key + 'T00:00:00').getFullYear()}</span>
            </div>
            
            <div class="grid grid-cols-7 gap-space-xs sm:gap-space-sm mt-2">
              ${daysMeta.map(d => {
                const dayLog = store.getLogForDate(d.key);
                const dayScore = store.calculateScore(dayLog);
                const isActive = d.key === activeDate;
                const hasData = dayLog.tilawah > 0 || dayScore.completed > 0;
                const pct = hasData ? dayScore.percentage : 0;

                return `
                  <button class="day-strip-btn group flex flex-col items-center justify-between p-2 sm:p-space-sm rounded-lg transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-primary-container text-on-primary shadow-md ring-2 ring-primary-container ring-offset-2' 
                      : (hasData ? 'bg-surface-container-low hover:bg-surface-container text-on-surface' : 'bg-surface-container-low/60 hover:bg-surface-container text-on-surface opacity-75')
                  }" data-date="${d.key}" type="button">
                    <span class="font-label-sm text-label-sm ${isActive ? 'text-on-primary font-bold' : 'text-on-surface-variant'}">${d.dayShort}</span>
                    <span class="font-headline-sm text-headline-sm ${isActive ? 'text-on-primary font-bold' : 'text-on-surface'} my-0.5 text-base sm:text-lg">${d.dayNum}</span>
                    <div class="w-full bg-black/10 h-1.5 rounded-full overflow-hidden mt-1">
                      <div class="${isActive ? 'bg-white' : 'bg-success-amal'} h-full rounded-full transition-all" style="width: ${pct}%"></div>
                    </div>
                    <span class="font-label-sm text-label-sm mt-1 text-[11px] font-semibold ${isActive ? 'text-on-primary' : 'text-on-surface-variant'}">${hasData ? `${pct}%` : '-'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Category Nav Tabs -->
        <div class="flex items-center gap-space-xs mb-space-lg overflow-x-auto pb-1 sticky top-16 z-20 bg-background/90 backdrop-blur-sm py-2">
          <a class="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm whitespace-nowrap text-sm font-semibold" href="#harian">
            <span class="material-symbols-outlined text-[18px]">wb_sunny</span>
            Amalan Harian (8)
          </a>
          <a class="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-lg text-label-lg transition-colors whitespace-nowrap text-sm font-semibold" href="#mingguan">
            <span class="material-symbols-outlined text-[18px]">date_range</span>
            Amalan Mingguan (8)
          </a>
          <a class="inline-flex items-center gap-space-xs px-space-md py-space-sm rounded-full bg-surface-container-low text-on-surface-variant hover:bg-surface-container font-label-lg text-label-lg transition-colors whitespace-nowrap text-sm font-semibold" href="#bulanan">
            <span class="material-symbols-outlined text-[18px]">event_repeat</span>
            Amalan Bulanan (1)
          </a>
        </div>

        <!-- TRACKER SECTIONS -->
        <div class="flex flex-col gap-space-xl pb-24">
          
          <!-- SECTION 1: HARIAN -->
          <section class="flex flex-col gap-space-md" id="harian">
            <div class="flex items-center justify-between pb-space-xs">
              <div class="flex items-center gap-space-sm">
                <div class="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-primary-container">
                  <span class="material-symbols-outlined text-[20px]">wb_sunny</span>
                </div>
                <div>
                  <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">1. Amalan Harian</h2>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Tunjang istiqamah harian peribadi muslim</p>
                </div>
              </div>
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold text-xs" id="harian-summary-badge">
                Sasaran Yaumi
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              
              <!-- 1. Tilawah Al-Quran -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md interactive-card">
                <div class="flex items-start justify-between gap-space-sm">
                  <div class="flex items-center gap-space-sm">
                    <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">1</span>
                    <div>
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Tilawah Al-Quran</h3>
                      <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 5 muka surat sehari</p>
                    </div>
                  </div>
                  <span class="px-space-sm py-1 rounded ${log.tilawah >= 5 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold text-xs" id="tilawah-status-chip">
                    ${log.tilawah >= 5 ? '100% Selesai' : `${Math.round((log.tilawah / 5) * 100)}%`}
                  </span>
                </div>
                <div class="flex items-center justify-between bg-surface-container-low p-space-xs rounded-lg">
                  <span class="font-body-sm text-body-sm text-on-surface-variant pl-space-sm text-sm">Kiraan halaman:</span>
                  <div class="flex items-center gap-space-sm">
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="tilawah" data-delta="-1" data-min="0" data-max="30" type="button">
                      <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <div class="flex items-baseline gap-1 px-space-xs">
                      <span class="font-numeral-counter text-numeral-counter text-on-surface font-bold text-lg tabular-nums" id="tilawah-val">${log.tilawah}</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">/ 5 m/s</span>
                    </div>
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="tilawah" data-delta="1" data-min="0" data-max="30" type="button">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 3. Beristighfar -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md interactive-card">
                <div class="flex items-start justify-between gap-space-sm">
                  <div class="flex items-center gap-space-sm">
                    <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">3</span>
                    <div>
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Beristighfar</h3>
                      <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 70 kali minimum</p>
                    </div>
                  </div>
                  <span class="px-space-sm py-1 rounded ${log.istighfar >= 70 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold text-xs" id="istighfar-status-chip">
                    ${log.istighfar >= 70 ? 'Tercapai' : `${log.istighfar}/70`}
                  </span>
                </div>
                <div class="flex items-center justify-between bg-surface-container-low p-space-xs rounded-lg">
                  <span class="font-body-sm text-body-sm text-on-surface-variant pl-space-sm text-sm">Jumlah zikir:</span>
                  <div class="flex items-center gap-space-sm">
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="istighfar" data-delta="-10" data-min="0" data-max="500" type="button">
                      <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <div class="flex items-baseline gap-1 px-space-xs">
                      <span class="font-numeral-counter text-numeral-counter text-on-surface font-bold text-lg tabular-nums" id="istighfar-val">${log.istighfar}</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">/ 70 kali</span>
                    </div>
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="istighfar" data-delta="10" data-min="0" data-max="500" type="button">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 2. Solat Fardhu Berjamaah (Full width row) -->
              <div class="md:col-span-2 bg-surface-container-lowest rounded-xl p-space-md md:p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md interactive-card">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                  <div class="flex items-center gap-space-sm">
                    <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">2</span>
                    <div>
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Solat Fardhu Berjamaah</h3>
                      <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 5 waktu (terutamanya Subuh &amp; Isya' berjamaah di surau/masjid)</p>
                    </div>
                  </div>
                  <span class="px-space-sm py-1 rounded ${score.prayerCount === 5 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold self-start sm:self-auto text-xs" id="prayer-count-badge">
                    ${score.prayerCount} / 5 Waktu Selesai
                  </span>
                </div>
                
                <!-- 5 Prayer Toggle Chips -->
                <div class="grid grid-cols-2 sm:grid-cols-5 gap-space-sm">
                  ${['subuh', 'zohor', 'asar', 'maghrib', 'isya'].map(waktu => {
                    const isDone = Boolean(prayers[waktu]);
                    const label = waktu === 'subuh' ? 'Subuh (Masjid)' : (waktu === 'isya' ? 'Isya\' (Masjid)' : waktu.charAt(0).toUpperCase() + waktu.slice(1));
                    return `
                      <button class="min-h-[44px] px-space-sm py-2 rounded-lg ${isDone ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer font-semibold text-xs sm:text-sm" data-action="toggle-prayer" data-prayer="${waktu}" type="button">
                        <span class="material-symbols-outlined text-[18px]">${isDone ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>${label}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 4. Solat Sunat Rawatib -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col justify-between gap-space-md interactive-card">
                <div class="flex items-start justify-between gap-space-sm">
                  <div class="flex items-center gap-space-sm">
                    <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">4</span>
                    <div>
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Solat Sunat Rawatib</h3>
                      <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 8 rakaat (Qabliyyah &amp; Ba'diyyah)</p>
                    </div>
                  </div>
                  <span class="px-space-sm py-1 rounded ${log.rawatib >= 8 ? 'bg-teal-light text-primary' : 'bg-surface-container text-on-surface-variant'} font-label-sm text-label-sm font-semibold text-xs" id="rawatib-chip">
                    ${log.rawatib} Rakaat
                  </span>
                </div>
                <div class="flex items-center justify-between bg-surface-container-low p-space-xs rounded-lg">
                  <span class="font-body-sm text-body-sm text-on-surface-variant pl-space-sm text-sm">Jumlah rakaat:</span>
                  <div class="flex items-center gap-space-sm">
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="rawatib" data-delta="-2" data-min="0" data-max="16" type="button">
                      <span class="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <div class="flex items-baseline gap-1 px-space-xs">
                      <span class="font-numeral-counter text-numeral-counter text-on-surface font-bold text-lg tabular-nums" id="rawatib-val">${log.rawatib}</span>
                      <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">/ 8 rakaat</span>
                    </div>
                    <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="rawatib" data-delta="2" data-min="0" data-max="16" type="button">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 5. Solat Dhuha -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">5</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Solat Dhuha</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran Harian (minimum 2 rakaat)</p>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.dhuha ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="dhuha" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.dhuha ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.dhuha ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 6. Membaca Doa-Doa Pilihan -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">6</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Membaca Doa-Doa Pilihan</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Doa harian &amp; rabitah pada waktu berbeza</p>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.doa ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="doa" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.doa ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.doa ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 7. Wirid Selepas Solat -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">7</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Wirid Selepas Solat</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Tasbih, Tahmid, Takbir 33× &amp; Ayat Kursi</p>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.wirid ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="wirid" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.wirid ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.wirid ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 8. Membaca Buku Tsaqafah & Naqib Inline Highlight Note -->
              <div class="md:col-span-2 bg-surface-container-lowest rounded-xl p-space-md md:p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md interactive-card">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
                  <div class="flex items-center gap-space-sm">
                    <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">8</span>
                    <div>
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Membaca Buku Tsaqafah</h3>
                      <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran harian 30 minit pembacaan ilmiah</p>
                    </div>
                  </div>
                  <div class="flex items-center justify-between sm:justify-end gap-space-md bg-surface-container-low p-space-xs rounded-lg">
                    <span class="font-body-sm text-body-sm text-on-surface-variant pl-space-sm text-sm">Tempoh bacaan:</span>
                    <div class="flex items-center gap-space-sm">
                      <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="buku" data-delta="-5" data-min="0" data-max="180" type="button">
                        <span class="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <div class="flex items-baseline gap-1 px-space-xs">
                        <span class="font-numeral-counter text-numeral-counter text-on-surface font-bold text-lg tabular-nums" id="buku-val">${log.buku}</span>
                        <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">/ 30 minit</span>
                      </div>
                      <button class="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container shadow-sm active:scale-95 transition-all cursor-pointer font-bold" data-action="stepper" data-key="buku" data-delta="5" data-min="0" data-max="180" type="button">
                        <span class="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Inline Note from Naqib -->
                <div class="bg-orange-surface border border-ikram-orange/30 rounded-lg p-space-md flex items-start gap-space-sm">
                  <span class="material-symbols-outlined text-ikram-orange text-[20px] shrink-0 mt-0.5">tips_and_updates</span>
                  <div class="flex flex-col">
                    <span class="font-label-md text-label-md text-ikram-orange font-bold text-xs">Nota Naqib (Ustaz Hazwan Ismail):</span>
                    <p class="font-body-sm text-body-sm text-on-surface mt-0.5 text-sm">
                      Alhamdulillah teruskan pembacaan Kitab Fiqh Da'wah bab 2. Insya-Allah pada perjumpaan usrah malam Sabtu ini kita akan bincangkan aplikasi konsep maratibul amal dalam tugasan profesional Faiz.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- SECTION 2: MINGGUAN -->
          <section class="flex flex-col gap-space-md" id="mingguan">
            <div class="flex items-center justify-between pb-space-xs">
              <div class="flex items-center gap-space-sm">
                <div class="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-primary-container">
                  <span class="material-symbols-outlined text-[20px]">date_range</span>
                </div>
                <div>
                  <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">2. Amalan Mingguan</h2>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Kemajuan kumulatif bagi kitaran minggu ke-24</p>
                </div>
              </div>
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold text-xs">
                Kitaran Usrah Mingguan
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              
              <!-- 9. Menghafaz Al-Quran -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">9</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Menghafaz Al-Quran</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sukatan: An-Naba' – Al-Lail &amp; Wirid Iman</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 1 / 1 ayat disemak</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.hafaz ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="hafaz" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.hafaz ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.hafaz ? 'Disemak' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 10. Ma'thurat Sughra -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">10</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Ma'thurat Sughra</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 2 kali seminggu (Pagi &amp; Petang)</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 2 / 2 kali</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.mathurat ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="mathurat" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.mathurat ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.mathurat ? 'Lengkap' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 11. Riadah -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">11</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Riadah &amp; Kesihatan Jasmani</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 3 sesi × 15 minit</p>
                    <div class="flex items-center gap-2 mt-1">
                      <div class="w-24 bg-surface-container-highest h-2 rounded-full overflow-hidden">
                        <div class="bg-primary-container h-full rounded-full transition-all" id="riadah-bar" style="width: ${Math.round((log.riadah / 3) * 100)}%"></div>
                      </div>
                      <span class="font-label-sm text-label-sm text-on-surface-variant font-medium text-xs" id="riadah-label">${log.riadah} / 3 sesi</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button class="w-11 h-11 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer font-bold" data-action="stepper" data-key="riadah" data-delta="-1" data-min="0" data-max="3" type="button">
                    <span class="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span class="font-numeral-counter text-numeral-counter text-on-surface px-space-xs font-bold text-base tabular-nums" id="riadah-count">${log.riadah}</span>
                  <button class="w-11 h-11 rounded-lg bg-surface-container-low hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors cursor-pointer font-bold" data-action="stepper" data-key="riadah" data-delta="1" data-min="0" data-max="3" type="button">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
              </div>

              <!-- 12. Berinteraksi dengan Jiran -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">12</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Berinteraksi dengan Jiran</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sapaan, berkongsi juadah, ziarah ringkas</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 1 / 1 kali</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.jiran ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="jiran" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.jiran ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.jiran ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 13. Qiamullail -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">13</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Qiamullail</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Sasaran 1 kali seminggu (Tahajjud &amp; Witir)</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 1 / 1 kali</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.qiam ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="qiam" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.qiam ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.qiam ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 14. Bersedekah -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">14</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Bersedekah</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Infaq Jumaat / Bantuan tabung kebajikan</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 1 / 1 kali</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.sedekah ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="sedekah" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.sedekah ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.sedekah ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 15. Silaturrahim Ibu Bapa -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">15</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Silaturrahim Ibu Bapa</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Panggilan telefon, bertanya khabar &amp; doa</p>
                    <span class="font-label-sm text-label-sm text-primary-container font-medium text-xs">Minggu ini: 1 / 1 kali</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.ibubapa ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="ibubapa" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.ibubapa ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.ibubapa ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

              <!-- 16. Aktiviti Kemasyarakatan -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex items-center justify-between gap-space-md interactive-card">
                <div class="flex items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant font-bold text-xs">16</span>
                  <div>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Aktiviti Kemasyarakatan</h3>
                    <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Gotong-royong, program surau / ziarah amal</p>
                    <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">Sasaran: 1 kali seminggu</span>
                  </div>
                </div>
                <button class="min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.masyarakat ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="masyarakat" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.masyarakat ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.masyarakat ? 'Selesai' : 'Tanda'}</span>
                </button>
              </div>

            </div>
          </section>

          <!-- SECTION 3: BULANAN -->
          <section class="flex flex-col gap-space-md mb-space-xl" id="bulanan">
            <div class="flex items-center justify-between pb-space-xs">
              <div class="flex items-center gap-space-sm">
                <div class="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-primary-container">
                  <span class="material-symbols-outlined text-[20px]">event_repeat</span>
                </div>
                <div>
                  <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">3. Amalan Bulanan</h2>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Disiplin puasa sunat &amp; pembersihan jiwa bulanan</p>
                </div>
              </div>
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-md text-label-md font-semibold text-xs">
                Sasaran Bulanan
              </span>
            </div>

            <div class="grid grid-cols-1 gap-space-md">
              <!-- 17. Berpuasa Sunat -->
              <div class="bg-surface-container-lowest rounded-xl p-space-md md:p-space-lg shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md interactive-card">
                <div class="flex items-start sm:items-center gap-space-sm">
                  <span class="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md text-on-surface-variant shrink-0 font-bold text-xs">17</span>
                  <div>
                    <div class="flex items-center gap-space-xs flex-wrap">
                      <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Berpuasa Sunat</h3>
                      <span class="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm text-xs">Sasaran 1 hari / bulan</span>
                    </div>
                    <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5 text-sm">
                      Bulan ini: <span class="font-medium text-primary-container">Puasa Isnin / Khamis / Hari Putih</span>
                    </p>
                  </div>
                </div>
                <button class="self-start sm:self-auto min-h-[44px] min-w-[44px] px-space-md rounded-lg ${log.puasa ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface'} font-label-md text-label-md flex items-center gap-2 shadow-sm transition-all cursor-pointer font-semibold text-sm" data-action="toggle-task" data-key="puasa" type="button">
                  <span class="material-symbols-outlined text-[20px]">${log.puasa ? 'check_box' : 'check_box_outline_blank'}</span>
                  <span>${log.puasa ? 'Selesai (Isnin)' : 'Tanda'}</span>
                </button>
              </div>
            </div>
          </section>

        </div>

        <!-- Personal Notes / Catatan Muhasabah -->
        <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30">
          <div class="flex items-center gap-space-sm mb-space-sm">
            <span class="material-symbols-outlined text-primary-container text-[20px]">edit_note</span>
            <div>
              <h3 class="font-label-md text-label-md text-on-surface font-semibold text-sm">Catatan Muhasabah Harian</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Tulis refleksi, syukur, atau cabaran hari ini</p>
            </div>
          </div>
          <textarea id="daily-notes" class="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg p-space-md text-sm text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container resize-none h-20 transition-colors" placeholder="Alhamdulillah, hari ini...">${log.notes || ''}</textarea>
        </div>

        <!-- Sticky Bottom Save & Affirmation Dock -->
        <div class="sticky bottom-6 z-30 mx-auto w-full max-w-xl">
          <div class="bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-space-sm px-space-md shadow-xl flex items-center justify-between gap-space-md border border-outline-variant/40">
            <div class="flex items-center gap-space-sm min-w-0">
              <div class="w-9 h-9 rounded-full bg-orange-surface flex items-center justify-center text-ikram-orange shrink-0">
                <span class="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="font-label-md text-label-md text-on-surface truncate font-semibold text-sm">Semakan Harian Sedia Disimpan</span>
                <span class="font-label-sm text-label-sm text-primary-container truncate font-medium text-xs">Sinkronisasi bersama Usrah An-Nur</span>
              </div>
            </div>
            <button class="min-h-[44px] px-space-lg rounded-lg bg-ikram-orange text-white hover:bg-orange-vibrant font-label-lg text-label-lg shrink-0 flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer font-bold text-sm" id="btn-save-manual" type="button">
              <span class="material-symbols-outlined text-[18px]">save</span>
              <span>Simpan Mutaba'ah</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function initHariIniHandlers() {
  const activeDate = store.getActiveDate();
  let log = store.getLogForDate(activeDate);

  function syncLiveScore() {
    const score = store.calculateScore(log);
    const dashOffset = (125.6 - (125.6 * score.percentage / 100)).toFixed(1);

    const ring = document.getElementById('daily-progress-ring');
    const pct = document.getElementById('daily-score-pct');
    const frac = document.getElementById('daily-score-fraction');
    const badge = document.getElementById('daily-score-badge');

    if (ring) ring.setAttribute('stroke-dashoffset', dashOffset);
    if (pct) pct.textContent = `${score.percentage}%`;
    if (frac) frac.textContent = `${score.completed} / ${score.total}`;
    if (badge) {
      badge.textContent = score.percentage >= 80 ? 'Sasaran Tercapai' : (score.percentage >= 60 ? 'Prestasi Stabil' : 'Perlu Dipertingkatkan');
    }

    const prayerBadge = document.getElementById('prayer-count-badge');
    if (prayerBadge) {
      prayerBadge.textContent = `${score.prayerCount} / 5 Waktu Selesai`;
      prayerBadge.className = `px-space-sm py-1 rounded ${score.prayerCount === 5 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold self-start sm:self-auto text-xs`;
    }

    // Flash save indicator
    const pill = document.getElementById('save-pill');
    if (pill) {
      pill.innerHTML = '<span class="material-symbols-outlined text-[14px] text-primary-container animate-spin">sync</span> Menyimpan...';
      setTimeout(() => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        pill.innerHTML = `<span class="material-symbols-outlined text-[14px] text-success-amal">cloud_done</span> Disimpan automatik ${timeStr}`;
      }, 350);
    }
  }

  // 1. Day Strip Buttons
  document.querySelectorAll('.day-strip-btn').forEach(btn => {
    btn.onclick = () => {
      const selected = btn.dataset.date;
      store.setActiveDate(selected);
      window.router.renderCurrent();
      window.showToast(`Memuatkan log bagi ${btn.querySelector('span:first-child')?.textContent || selected}`, 'info');
    };
  });

  // 2. Steppers
  document.querySelectorAll('[data-action="stepper"]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.key;
      const delta = parseInt(btn.dataset.delta, 10);
      const min = parseInt(btn.dataset.min, 10);
      const max = parseInt(btn.dataset.max, 10);

      const valEl = document.getElementById(`${key}-val`) || document.getElementById(`${key}-count`);
      let currentVal = parseInt(log[key] ?? 0, 10);
      currentVal = Math.max(min, Math.min(max, currentVal + delta));
      log[key] = currentVal;
      store.updateLog(activeDate, { [key]: currentVal });

      if (valEl) valEl.textContent = currentVal;

      // Update specific chips
      if (key === 'tilawah') {
        const chip = document.getElementById('tilawah-status-chip');
        if (chip) {
          chip.textContent = currentVal >= 5 ? '100% Selesai' : `${Math.round((currentVal / 5) * 100)}%`;
          chip.className = `px-space-sm py-1 rounded ${currentVal >= 5 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold text-xs`;
        }
      } else if (key === 'istighfar') {
        const chip = document.getElementById('istighfar-status-chip');
        if (chip) {
          chip.textContent = currentVal >= 70 ? 'Tercapai' : `${currentVal}/70`;
          chip.className = `px-space-sm py-1 rounded ${currentVal >= 70 ? 'bg-teal-light text-primary' : 'bg-orange-surface text-secondary'} font-label-sm text-label-sm font-semibold text-xs`;
        }
      } else if (key === 'rawatib') {
        const chip = document.getElementById('rawatib-chip');
        if (chip) {
          chip.textContent = `${currentVal} Rakaat`;
          chip.className = `px-space-sm py-1 rounded ${currentVal >= 8 ? 'bg-teal-light text-primary' : 'bg-surface-container text-on-surface-variant'} font-label-sm text-label-sm font-semibold text-xs`;
        }
      } else if (key === 'riadah') {
        const bar = document.getElementById('riadah-bar');
        const label = document.getElementById('riadah-label');
        if (bar) bar.style.width = `${Math.round((currentVal / 3) * 100)}%`;
        if (label) label.textContent = `${currentVal} / 3 sesi`;
      }

      syncLiveScore();
    };
  });

  // 3. Toggle Prayer buttons
  document.querySelectorAll('[data-action="toggle-prayer"]').forEach(btn => {
    btn.onclick = () => {
      const waktu = btn.dataset.prayer;
      if (!log.prayers) log.prayers = {};
      const nextState = !log.prayers[waktu];
      log.prayers[waktu] = nextState;
      store.updateLog(activeDate, { prayers: log.prayers });

      const icon = btn.querySelector('.material-symbols-outlined');
      if (nextState) {
        btn.classList.remove('bg-surface-container-high', 'text-on-surface');
        btn.classList.add('bg-primary-container', 'text-on-primary');
        if (icon) icon.textContent = 'check_circle';
      } else {
        btn.classList.remove('bg-primary-container', 'text-on-primary');
        btn.classList.add('bg-surface-container-high', 'text-on-surface');
        if (icon) icon.textContent = 'radio_button_unchecked';
      }

      syncLiveScore();
    };
  });

  // 4. Toggle Task buttons
  document.querySelectorAll('[data-action="toggle-task"]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.key;
      const nextState = !Boolean(log[key]);
      log[key] = nextState;
      store.updateLog(activeDate, { [key]: nextState });

      const icon = btn.querySelector('.material-symbols-outlined');
      const textSpan = btn.querySelector('span:not(.material-symbols-outlined)');

      if (nextState) {
        btn.classList.remove('bg-surface-container-high', 'text-on-surface');
        btn.classList.add('bg-primary-container', 'text-on-primary');
        if (icon) icon.textContent = 'check_box';
        if (textSpan) {
          textSpan.textContent = key === 'hafaz' ? 'Disemak' : (key === 'mathurat' ? 'Lengkap' : (key === 'puasa' ? 'Selesai (Isnin)' : 'Selesai'));
        }
      } else {
        btn.classList.remove('bg-primary-container', 'text-on-primary');
        btn.classList.add('bg-surface-container-high', 'text-on-surface');
        if (icon) icon.textContent = 'check_box_outline_blank';
        if (textSpan) textSpan.textContent = 'Tanda';
      }

      syncLiveScore();
    };
  });

  // 5. Notes textarea auto-save on blur
  const notesEl = document.getElementById('daily-notes');
  if (notesEl) {
    notesEl.onblur = () => {
      log.notes = notesEl.value.trim();
      store.updateLog(activeDate, { notes: log.notes });
      syncLiveScore();
    };
  }

  // 7. Manual Save Button
  const saveBtn = document.getElementById('btn-save-manual');
  if (saveBtn) {
    saveBtn.onclick = () => {
      // Capture notes before saving
      const notesTextarea = document.getElementById('daily-notes');
      if (notesTextarea) log.notes = notesTextarea.value.trim();
      store.updateLog(activeDate, log);
      window.showToast('Rekod Mutaba\'ah berjaya disimpan dan disegerakkan dengan usrah!', 'success');
      const pill = document.getElementById('save-pill');
      if (pill) {
        pill.innerHTML = '<span class="material-symbols-outlined text-[14px] text-ikram-orange">verified</span> Rekod berjaya disahkan!';
        setTimeout(() => {
          pill.innerHTML = '<span class="material-symbols-outlined text-[14px] text-success-amal">cloud_done</span> Disimpan automatik';
        }, 1800);
      }
    };
  }
}
