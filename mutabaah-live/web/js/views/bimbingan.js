/**
 * View: Ahli - Bimbingan (Mentorship Feed & Direct Guidance)
 */

import { store } from '../store.js';

let activeCategoryFilter = 'semua';

export function renderBimbinganView() {
  const guidanceList = store.getGuidanceList();
  const currentUser = store.getCurrentUser();

  const filtered = activeCategoryFilter === 'semua'
    ? guidanceList
    : guidanceList.filter(g => g.category === activeCategoryFilter);

  // Category counts
  const counts = {
    semua: guidanceList.length,
    peribadi: guidanceList.filter(g => g.category === 'peribadi').length,
    tilawah: guidanceList.filter(g => g.category === 'tilawah').length,
    qiamullail: guidanceList.filter(g => g.category === 'qiamullail').length,
    riadah: guidanceList.filter(g => g.category === 'riadah').length
  };

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div class="flex items-start sm:items-center gap-space-md">
            <img class="w-14 h-14 rounded-full object-cover ring-2 ring-primary-container shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCG8arHxJkHpmt_CEiA5whktEytjHwu_bnkWDLmUKQEIvIthlskaQptE3pXU7ZxWam1r3aogn82pE5opML5DOwI6B7DhSRx-5LzyAUvihKomgeptayu1PRDuLRBm9OgRLbTx1WAPeaxPiIJ03vRy5SmtnLX-Iks0GU8ktBlVYMOzt_kSBKP_LnAcH-hPKC7Mj7rhIw3UTXT4-pjpIJT47F6cYXdmjeIaTbe7XPtBQ" alt="Ustaz Hazwan Ismail"/>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                  Bimbingan Khusus Naqib
                </span>
                <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                  Kerahsiaan Terpelihara
                </span>
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
                Peti Bimbingan &amp; Tausiyah
              </h1>
              <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
                Bimbingan rohani daripada <span class="font-semibold text-on-surface">Ustaz Hazwan Ismail</span> (Naqib Usrah An-Nur) khas buat <span class="font-semibold text-on-surface">${currentUser.name}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start md:self-auto">
            <span class="text-xs text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/40 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-success-amal">verified</span>
              Akses Peribadi Sahaja
            </span>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="flex items-center gap-2 mb-space-lg overflow-x-auto pb-1">
          <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${activeCategoryFilter === 'semua' ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="semua" type="button">
            <span>Semua Bimbingan</span>
            <span class="px-1.5 py-0.2 rounded-full ${activeCategoryFilter === 'semua' ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${counts.semua}</span>
          </button>
          <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${activeCategoryFilter === 'peribadi' ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="peribadi" type="button">
            <span class="w-2 h-2 rounded-full bg-primary-container"></span>
            <span>Nota Peribadi</span>
            <span class="px-1.5 py-0.2 rounded-full ${activeCategoryFilter === 'peribadi' ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${counts.peribadi}</span>
          </button>
          <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${activeCategoryFilter === 'tilawah' ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="tilawah" type="button">
            <span class="w-2 h-2 rounded-full bg-secondary-container"></span>
            <span>Tilawah Al-Quran</span>
            <span class="px-1.5 py-0.2 rounded-full ${activeCategoryFilter === 'tilawah' ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${counts.tilawah}</span>
          </button>
          <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${activeCategoryFilter === 'qiamullail' ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="qiamullail" type="button">
            <span class="w-2 h-2 rounded-full bg-tertiary"></span>
            <span>Qiamullail</span>
            <span class="px-1.5 py-0.2 rounded-full ${activeCategoryFilter === 'qiamullail' ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${counts.qiamullail}</span>
          </button>
          <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${activeCategoryFilter === 'riadah' ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="riadah" type="button">
            <span class="w-2 h-2 rounded-full bg-success-amal"></span>
            <span>Riadah &amp; Kesihatan</span>
            <span class="px-1.5 py-0.2 rounded-full ${activeCategoryFilter === 'riadah' ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${counts.riadah}</span>
          </button>
        </div>

        <!-- 2-Column Grid: Main Feed & Sidebar -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-2xl">
          
          <!-- Guidance Feed (8 cols) -->
          <div class="lg:col-span-8 flex flex-col gap-space-lg" id="feed-cards">
            ${filtered.length === 0 ? `
              <div class="bg-surface-container-lowest p-space-xl rounded-xl text-center border border-outline-variant/30">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant">inbox</span>
                <p class="font-body-md text-body-md text-on-surface-variant mt-2">Tiada rekod bimbingan bagi kategori ini.</p>
              </div>
            ` : filtered.map(item => `
              <article class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow p-space-md md:p-space-lg flex flex-col gap-space-md interactive-card" data-id="${item.id}">
                
                <!-- Card Header -->
                <div class="flex items-start justify-between gap-space-sm flex-wrap">
                  <div class="flex items-center gap-space-sm">
                    <span class="px-space-sm py-1 rounded-full bg-teal-light text-primary-container border border-primary-container/20 font-label-sm text-label-sm font-semibold flex items-center gap-1 text-xs">
                      <span class="material-symbols-outlined text-[14px]">shield_person</span>
                      ${item.categoryLabel || item.category}
                    </span>
                    <span class="px-space-sm py-1 rounded-full bg-orange-surface text-secondary-container border border-secondary-container/20 font-label-sm text-label-sm font-semibold text-xs">
                      ${item.title}
                    </span>
                  </div>
                  <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm text-xs">
                    <span class="material-symbols-outlined text-[15px]">schedule</span>
                    <time>${item.date}</time>
                  </div>
                </div>

                <!-- Author Info -->
                <div class="flex items-center gap-space-sm pb-space-xs">
                  <img class="w-9 h-9 rounded-full object-cover ring-1 ring-primary-container/20 shrink-0" src="${item.authorAvatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG8arHxJkHpmt_CEiA5whktEytjHwu_bnkWDLmUKQEIvIthlskaQptE3pXU7ZxWam1r3aogn82pE5opML5DOwI6B7DhSRx-5LzyAUvihKomgeptayu1PRDuLRBm9OgRLbTx1WAPeaxPiIJ03vRy5SmtnLX-Iks0GU8ktBlVYMOzt_kSBKP_LnAcH-hPKC7Mj7rhIw3UTXT4-pjpIJT47F6cYXdmjeIaTbe7XPtBQ'}" alt="${item.author}"/>
                  <div class="flex flex-col">
                    <span class="font-label-md text-label-md text-on-surface font-semibold text-sm">${item.author}</span>
                    <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">${item.authorRole}</span>
                  </div>
                </div>

                <!-- Message Content -->
                <div class="rounded-lg bg-surface-container-low/70 border border-outline-variant/20 p-space-md">
                  <p class="font-body-lg text-body-lg text-on-surface leading-relaxed text-sm md:text-base">
                    ${item.content}
                  </p>
                </div>

                <!-- Optional Reference -->
                ${item.reference ? `
                  <div class="rounded-lg bg-teal-light/60 border border-primary-container/20 p-space-md shadow-xs">
                    <div class="flex items-start gap-space-sm">
                      <div class="p-2 rounded-lg bg-primary-container text-on-primary shrink-0">
                        <span class="material-symbols-outlined text-[20px]">auto_stories</span>
                      </div>
                      <div class="flex flex-col">
                        <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary-container font-bold text-xs">Dalil / Rujukan Tausiyah</span>
                        <blockquote class="font-body-md text-body-md text-on-surface italic mt-0.5 text-xs sm:text-sm">
                          ${item.reference}
                        </blockquote>
                      </div>
                    </div>
                  </div>
                ` : ''}

                <!-- Member Replies Thread (if any) -->
                ${item.replies && item.replies.length > 0 ? `
                  <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
                    <span class="text-xs font-semibold text-primary uppercase tracking-wider">Maklum Balas Ahli:</span>
                    ${item.replies.map(r => `
                      <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-3 text-xs sm:text-sm">
                        <div class="flex items-center justify-between text-on-surface-variant text-[11px] mb-1">
                          <span class="font-bold text-on-surface">${r.author}</span>
                          <span>${r.date}</span>
                        </div>
                        <p class="text-on-surface leading-relaxed">${r.text}</p>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <!-- Action Buttons & Read Receipt -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/15">
                  <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm text-xs">
                    <span class="material-symbols-outlined text-[16px] ${item.read ? 'text-success-amal' : 'text-primary'}">${item.read ? 'check_circle' : 'mark_chat_read'}</span>
                    <span>${item.read ? `Disahkan dibaca (${item.readDate || 'Selesai'})` : 'Belum disahkan bacaan'}</span>
                  </div>
                  
                  <div class="flex items-center gap-space-sm">
                    <button class="btn-reply px-space-md py-1.5 rounded-lg font-label-md text-label-md bg-teal-light text-primary hover:bg-surface-container transition-colors border border-primary-container/20 flex items-center justify-center gap-space-xs cursor-pointer text-xs font-semibold" data-id="${item.id}" type="button">
                      <span class="material-symbols-outlined text-[16px]">reply</span>
                      <span>Balas Bimbingan</span>
                    </button>
                    ${!item.read ? `
                      <button class="btn-mark-read px-space-md py-1.5 rounded-lg font-label-md text-label-md bg-secondary-container text-white hover:bg-orange-vibrant transition-all flex items-center justify-center gap-space-xs shadow-sm cursor-pointer text-xs font-bold" data-id="${item.id}" type="button">
                        <span class="material-symbols-outlined text-[16px]">done_all</span>
                        <span>Tanda Sudah Dibaca ✓</span>
                      </button>
                    ` : ''}
                  </div>
                </div>

                <!-- Collapsible Reply Box -->
                <div class="reply-container hidden flex-col gap-space-sm pt-space-sm mt-space-xs" id="reply-container-${item.id}">
                  <textarea class="w-full rounded-lg bg-surface-container-low border border-outline-variant/40 p-space-md font-body-md text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container resize-none h-24 text-sm" id="reply-text-${item.id}" placeholder="Tulis maklum balas atau catatan muhasabah peribadi kepada Ustaz Hazwan..."></textarea>
                  <div class="flex justify-end gap-space-sm">
                    <button class="btn-cancel-reply px-space-sm py-1 rounded-md font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container cursor-pointer text-xs" data-id="${item.id}" type="button">Batal</button>
                    <button class="btn-send-reply px-space-md py-1.5 rounded-md font-label-md text-label-md bg-primary-container text-on-primary hover:bg-teal-dark shadow-sm cursor-pointer font-bold text-xs" data-id="${item.id}" type="button">Hantar Jawapan</button>
                  </div>
                </div>

              </article>
            `).join('')}
          </div>

          <!-- Sidebar (4 cols) -->
          <div class="lg:col-span-4 flex flex-col gap-space-lg">
            
            <!-- Adab & Covenant Card -->
            <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
              <div class="flex items-center gap-space-sm">
                <div class="w-9 h-9 rounded-lg bg-teal-light text-primary-container flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[20px]">handshake</span>
                </div>
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Adab Bimbingan Usrah</h3>
                  <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">Paksi Tarbiyah Fardiyah</span>
                </div>
              </div>

              <div class="flex flex-col gap-space-sm text-xs text-on-surface-variant leading-relaxed">
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary-container text-[16px] shrink-0 mt-0.5">lock</span>
                  <p><strong class="text-on-surface">Kerahsiaan Terpelihara:</strong> Tiada ahli lain yang dapat melihat rekod mutaba'ah anda selain Naqib.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary-container text-[16px] shrink-0 mt-0.5">favorite</span>
                  <p><strong class="text-on-surface">Ikhlas Muhasabah:</strong> Rekodlah amalan dengan penuh ketulusan demi menilai kelemahan diri.</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-primary-container text-[16px] shrink-0 mt-0.5">forum</span>
                  <p><strong class="text-on-surface">Komunikasi Dua Hala:</strong> Balas ulasan Naqib bagi membincangkan kekangan masa atau cabaran ruhani.</p>
                </div>
              </div>
            </div>

            <!-- Naqib Contact & Support -->
            <div class="bg-gradient-to-br from-teal-light to-surface-container-low p-space-md md:p-space-lg rounded-xl border border-primary-container/20 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <span class="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider text-xs">Hubungi Naqib</span>
                <span class="w-2 h-2 rounded-full bg-success-amal"></span>
              </div>
              <p class="text-xs text-on-surface leading-relaxed">
                Sekiranya anda memerlukan sesi perjumpaan peribadi atau perkongsian mendalam, sila hubungi Ustaz Hazwan melalui saluran usrah.
              </p>
              <button class="w-full py-2 bg-primary-container hover:bg-teal-dark text-on-primary rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs" onclick="window.showToast('Permintaan sesi bimbingan peribadi telah disampaikan kepada Ustaz Hazwan.', 'success')" type="button">
                <span class="material-symbols-outlined text-[16px]">calendar_month</span>
                <span>Minta Sesi Peribadi</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  `;
}

export function initBimbinganHandlers() {
  // 1. Filter tabs
  document.querySelectorAll('.filter-tab-btn').forEach(btn => {
    btn.onclick = () => {
      activeCategoryFilter = btn.dataset.filter;
      window.router.renderCurrent();
    };
  });

  // 2. Mark as read
  document.querySelectorAll('.btn-mark-read').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id, 10);
      store.markGuidanceAsRead(id);
      window.showToast('Nota bimbingan disahkan telah dibaca dan difahami ✓', 'success');
      window.router.renderCurrent();
    };
  });

  // 3. Toggle reply box
  document.querySelectorAll('.btn-reply').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const container = document.getElementById(`reply-container-${id}`);
      if (container) {
        container.classList.toggle('hidden');
        container.classList.toggle('flex');
      }
    };
  });

  // 4. Cancel reply
  document.querySelectorAll('.btn-cancel-reply').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const container = document.getElementById(`reply-container-${id}`);
      if (container) {
        container.classList.add('hidden');
        container.classList.remove('flex');
      }
    };
  });

  // 5. Send reply
  document.querySelectorAll('.btn-send-reply').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id, 10);
      const textEl = document.getElementById(`reply-text-${id}`);
      const text = textEl?.value?.trim();

      if (!text) {
        window.showToast('Sila masukkan teks maklum balas terlebih dahulu.', 'warning');
        return;
      }

      store.addGuidanceReply(id, text, store.getCurrentUser().name);
      window.showToast('Jawapan berjaya dihantar kepada Ustaz Hazwan!', 'success');
      window.router.renderCurrent();
    };
  });
}
