/**
 * View: Naqib - Tetapan Amalan (Syllabus & Worship Item Customizer)
 */

import { store } from '../store.js';

let activeFreqFilter = 'semua';

export function renderTetapanView() {
  const amalanList = store.getAmalanList();

  const filtered = activeFreqFilter === 'semua'
    ? amalanList
    : amalanList.filter(item => item.freq.toLowerCase() === activeFreqFilter.toLowerCase());

  const activeCount = amalanList.filter(a => a.active).length;

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">
        
        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                Pengurusan Kurikulum Usrah
              </span>
              <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs">
                ${activeCount} Amalan Aktif
              </span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
              Tetapan Sukatan Amalan Mutaba'ah
            </h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
              Konfigurasi senarai amalan harian, mingguan, dan bulanan bagi Usrah An-Nur (Sesi 1446H).
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button class="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40 font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer" id="btnOpenAddModal" type="button">
              <span class="material-symbols-outlined text-[18px]">add</span>
              <span>Tambah Amalan</span>
            </button>
            <button class="px-space-md py-2 rounded-lg bg-primary-container hover:bg-teal-dark text-on-primary font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm" id="btnSaveSyllabus" type="button">
              <span class="material-symbols-outlined text-[18px]">save</span>
              <span>Simpan Tetapan</span>
            </button>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 mb-space-md overflow-x-auto pb-1">
          ${['semua', 'harian', 'mingguan', 'bulanan'].map(freq => `
            <button class="freq-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer text-xs sm:text-sm ${
              activeFreqFilter === freq 
                ? 'bg-primary-container text-on-primary font-bold shadow-sm' 
                : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'
            }" data-freq="${freq}" type="button">
              <span>${freq.charAt(0).toUpperCase() + freq.slice(1)}</span>
            </button>
          `).join('')}
        </div>

        <!-- Syllabus Items Table -->
        <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-space-2xl">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-[950px] border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr class="bg-surface-container text-on-surface border-b border-outline-variant/40 text-[11px]">
                  <th class="py-3 px-4 text-center w-14 font-bold text-on-surface-variant">Kod</th>
                  <th class="py-3 px-4 min-w-[240px] font-bold">Nama Amalan &amp; Keterangan</th>
                  <th class="py-3 px-4 min-w-[120px] font-bold">Kekerapan</th>
                  <th class="py-3 px-4 min-w-[140px] font-bold">Sasaran</th>
                  <th class="py-3 px-4 min-w-[180px] font-bold">Unit / Format</th>
                  <th class="py-3 px-4 text-center min-w-[90px] font-bold">Aktif</th>
                  <th class="py-3 px-4 text-right min-w-[90px] font-bold">Tindakan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-container" id="amalanTableBody">
                ${filtered.map(item => `
                  <tr class="hover:bg-surface-container-low/40 transition-colors ${!item.active ? 'opacity-50' : ''}" data-id="${item.id}">
                    <td class="py-3 px-4 text-center font-bold text-on-surface-variant text-xs">
                      ${item.code}
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-start gap-space-sm">
                        <div class="p-1.5 rounded-lg bg-teal-light text-primary-container shrink-0 mt-0.5">
                          <span class="material-symbols-outlined text-[18px]">${item.icon || 'star'}</span>
                        </div>
                        <div class="min-w-0 flex-1">
                          <input class="font-bold text-on-surface bg-transparent focus:bg-surface-container-low rounded px-1.5 py-0.5 w-full focus:outline-none transition-all text-sm border-b border-transparent focus:border-primary-container" data-field="name" data-id="${item.id}" type="text" value="${item.name}"/>
                          <input class="text-xs text-on-surface-variant px-1.5 py-0.5 w-full bg-transparent focus:bg-surface-container-low rounded focus:outline-none transition-all border-b border-transparent focus:border-primary-container" data-field="desc" data-id="${item.id}" type="text" value="${item.desc}"/>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <select class="text-xs bg-surface-container-low border border-surface-dim/60 text-on-surface px-2.5 py-1 rounded-lg focus:outline-none focus:border-primary-container cursor-pointer font-semibold" data-field="freq" data-id="${item.id}">
                        <option value="Harian" ${item.freq === 'Harian' ? 'selected' : ''}>Harian</option>
                        <option value="Mingguan" ${item.freq === 'Mingguan' ? 'selected' : ''}>Mingguan</option>
                        <option value="Bulanan" ${item.freq === 'Bulanan' ? 'selected' : ''}>Bulanan</option>
                      </select>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-1 bg-surface-container-low rounded-lg p-1 w-28 border border-surface-container">
                        <button class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary rounded bg-surface-container-lowest font-bold text-xs cursor-pointer" data-action="adjust-target" data-delta="-1" data-id="${item.id}" type="button">-</button>
                        <span class="w-full text-center font-bold text-xs md:text-sm tabular-nums" id="target-display-${item.id}">${item.targetVal}</span>
                        <button class="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-primary rounded bg-surface-container-lowest font-bold text-xs cursor-pointer" data-action="adjust-target" data-delta="1" data-id="${item.id}" type="button">+</button>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <input class="bg-surface-container-low text-on-surface text-xs px-2 py-1.5 rounded-lg w-full border border-surface-container/60 focus:outline-none focus:border-primary-container" data-field="unit" data-id="${item.id}" type="text" value="${item.unit}"/>
                    </td>
                    <td class="py-3 px-4 text-center">
                      <label class="relative inline-flex items-center cursor-pointer">
                        <input class="sr-only peer toggle-active-checkbox" data-id="${item.id}" type="checkbox" ${item.active ? 'checked' : ''}/>
                        <div class="w-10 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                      </label>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button class="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-surface-container rounded-lg transition-colors cursor-pointer" onclick="window.showToast('Perubahan sukatan ${item.name} disimpan.', 'info')" title="Simpan Baris" type="button">
                          <span class="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button class="btn-delete-amalan p-1.5 text-on-surface-variant hover:text-orange-vibrant hover:bg-orange-surface rounded-lg transition-colors cursor-pointer" data-id="${item.id}" title="Padam Amalan" type="button">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal Dialog: Tambah Amalan Baharu -->
    <div class="modal-overlay hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" id="addAmalanModal">
      <div class="modal-content w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-space-lg overflow-hidden">
        <div class="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-md">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">add_task</span>
            </div>
            <h3 class="font-bold text-on-surface text-base md:text-lg">Tambah Amalan Baharu ke Sukatan</h3>
          </div>
          <button class="text-on-surface-variant hover:text-on-surface cursor-pointer" id="btnCloseAddModal" type="button">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form class="space-y-space-md" id="formAddAmalan">
          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Nama Amalan</label>
            <input class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container" id="newAmalanName" placeholder="cth: Solat Sunat Taubat" required type="text"/>
          </div>

          <div>
            <label class="block text-xs font-semibold text-on-surface mb-1">Keterangan / Huraian Amalan</label>
            <input class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container" id="newAmalanDesc" placeholder="cth: Minimum 2 rakaat seminggu sebelum tidur" required type="text"/>
          </div>

          <div class="grid grid-cols-2 gap-space-sm">
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Kekerapan</label>
              <select class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="newAmalanFreq">
                <option value="Harian">Harian</option>
                <option selected value="Mingguan">Mingguan</option>
                <option value="Bulanan">Bulanan</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Sasaran Nilai</label>
              <input class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container" id="newAmalanTarget" min="1" required type="number" value="1"/>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-space-sm">
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Unit / Format</label>
              <input class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container" id="newAmalanUnit" placeholder="cth: kali / minggu" required type="text" value="kali / minggu"/>
            </div>
            <div>
              <label class="block text-xs font-semibold text-on-surface mb-1">Ikon Material</label>
              <select class="w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer" id="newAmalanIcon">
                <option value="star">star (Umum)</option>
                <option value="mosque">mosque (Solat)</option>
                <option value="menu_book">menu_book (Quran/Kitab)</option>
                <option value="volunteer_activism">volunteer_activism (Infaq)</option>
                <option value="directions_run">directions_run (Jasmani)</option>
                <option value="family_restroom">family_restroom (Keluarga)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-space-sm border-t border-outline-variant/20">
            <button class="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer" id="btnCancelAddModal" type="button">Batal</button>
            <button class="px-5 py-2 bg-primary-container hover:bg-teal-dark text-on-primary rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer" type="submit">Tambah ke Sukatan</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function initTetapanHandlers() {
  // 1. Freq filters
  document.querySelectorAll('.freq-filter-btn').forEach(btn => {
    btn.onclick = () => {
      activeFreqFilter = btn.dataset.freq;
      window.router.renderCurrent();
    };
  });

  // 2. Adjust target values (+/-)
  document.querySelectorAll('[data-action="adjust-target"]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const delta = parseInt(btn.dataset.delta, 10);
      const list = store.getAmalanList();
      const item = list.find(a => a.id === id);
      if (item) {
        item.targetVal = Math.max(1, (item.targetVal || 1) + delta);
        store.saveAmalanList(list);
        const display = document.getElementById(`target-display-${id}`);
        if (display) display.textContent = item.targetVal;
        window.showToast(`Sasaran ${item.name} dikemaskini kepada ${item.targetVal}.`, 'info');
      }
    };
  });

  // 3. Inputs & select change
  document.querySelectorAll('#amalanTableBody [data-field]').forEach(el => {
    el.onchange = () => {
      const id = el.dataset.id;
      const field = el.dataset.field;
      const val = el.value.trim();
      store.updateAmalan(id, { [field]: val });
      window.showToast('Perubahan disimpan.', 'info');
    };
  });

  // 4. Toggle active checkbox
  document.querySelectorAll('.toggle-active-checkbox').forEach(cb => {
    cb.onchange = () => {
      const id = cb.dataset.id;
      const active = cb.checked;
      store.updateAmalan(id, { active });
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) {
        if (!active) row.classList.add('opacity-50');
        else row.classList.remove('opacity-50');
      }
      window.showToast(`Status amalan ${active ? 'diaktifkan' : 'dinyahaktifkan'}.`, 'info');
    };
  });

  // 5. Delete amalan
  document.querySelectorAll('.btn-delete-amalan').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if (confirm('Adakah anda pasti ingin memadam amalan ini daripada sukatan usrah?')) {
        store.deleteAmalan(id);
        window.showToast('Amalan berjaya dipadam daripada sukatan usrah.', 'warning');
        window.router.renderCurrent();
      }
    };
  });

  // 6. Save syllabus button
  const saveBtn = document.getElementById('btnSaveSyllabus');
  if (saveBtn) {
    saveBtn.onclick = () => {
      window.showToast('Sukatan amalan usrah berjaya disahkan dan disimpan!', 'success');
    };
  }

  // 7. Modal Open / Close
  const modal = document.getElementById('addAmalanModal');
  const btnOpen = document.getElementById('btnOpenAddModal');
  const btnClose = document.getElementById('btnCloseAddModal');
  const btnCancel = document.getElementById('btnCancelAddModal');
  const formAdd = document.getElementById('formAddAmalan');

  if (btnOpen && modal) {
    btnOpen.onclick = () => {
      modal.classList.remove('hidden');
    };
  }

  if (btnClose && modal) {
    btnClose.onclick = () => modal.classList.add('hidden');
  }
  if (btnCancel && modal) {
    btnCancel.onclick = () => modal.classList.add('hidden');
  }

  if (formAdd) {
    formAdd.onsubmit = (e) => {
      e.preventDefault();
      const name = document.getElementById('newAmalanName').value.trim();
      const desc = document.getElementById('newAmalanDesc').value.trim();
      const freq = document.getElementById('newAmalanFreq').value;
      const targetVal = document.getElementById('newAmalanTarget').value;
      const unit = document.getElementById('newAmalanUnit').value.trim();
      const icon = document.getElementById('newAmalanIcon').value;

      store.addAmalan({ name, desc, freq, targetVal, unit, icon });
      modal.classList.add('hidden');
      window.showToast(`Amalan "${name}" berjaya ditambah ke dalam sukatan!`, 'success');
      window.router.renderCurrent();
    };
  }
}
