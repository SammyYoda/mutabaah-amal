/**
 * View: Naqib - Tetapan Amalan (Syllabus & Worship Item Customizer), on live data.
 * Amalan CRUD (deactivate instead of delete) + the usrah's invite code.
 */

import { getAmalan, getInviteCode, createAmalan, updateAmalan, deactivateAmalan, regenerateInviteCode } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml, copyText, setInlineError, showFieldErrors } from '../util.js';

const APP = "Mutaba'ah Amal";
const FREQ_LABELS = { harian: 'Harian', mingguan: 'Mingguan', bulanan: 'Bulanan' };
const INPUT_TYPE_LABELS = { count: 'Kiraan', check: 'Tanda', prayers: 'Solat 5 waktu' };
const ICONS = [
  ['star', 'star (Umum)'],
  ['mosque', 'mosque (Solat)'],
  ['menu_book', 'menu_book (Quran/Kitab)'],
  ['volunteer_activism', 'volunteer_activism (Infaq)'],
  ['directions_run', 'directions_run (Jasmani)'],
  ['family_restroom', 'family_restroom (Keluarga)'],
];

let activeFreqFilter = 'semua';
let showInactive = false;

const toast = (msg, type = 'info') => window.showToast?.(msg, type);
const reload = () => window.router.renderCurrent();

const FIELD_CLS = 'w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container';
const ERR_CLS = 'hidden text-xs text-error mt-1';

function optionsHtml(map, selected) {
  return Object.entries(map)
    .map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`)
    .join('');
}

function iconOptions(selected) {
  const list = ICONS.some(([v]) => v === selected) || !selected ? ICONS : [...ICONS, [selected, selected]];
  return list
    .map(([v, l]) => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(l)}</option>`)
    .join('');
}

function rowHtml(item) {
  const id = escapeHtml(item.id);
  return `
    <tr class="hover:bg-surface-container-low/40 transition-colors ${!item.active ? 'opacity-60' : ''}" data-id="${id}">
      <td class="py-3 px-4 text-center font-bold text-on-surface-variant text-xs">${escapeHtml(item.code)}</td>
      <td class="py-3 px-4">
        <div class="flex items-start gap-space-sm">
          <div class="p-1.5 rounded-lg bg-teal-light text-primary-container shrink-0 mt-0.5">
            <span class="material-symbols-outlined text-[18px]">${escapeHtml(item.icon || 'star')}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-on-surface text-sm">${escapeHtml(item.name)}${item.active ? '' : ' <span class="text-[11px] font-semibold text-on-surface-variant">(tidak aktif)</span>'}</div>
            <div class="text-xs text-on-surface-variant">${escapeHtml(item.description)}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-xs font-semibold">${escapeHtml(FREQ_LABELS[item.freq] ?? item.freq)}</td>
      <td class="py-3 px-4 text-xs">${escapeHtml(INPUT_TYPE_LABELS[item.inputType] ?? item.inputType)}</td>
      <td class="py-3 px-4 font-bold text-xs md:text-sm tabular-nums">${escapeHtml(item.targetVal)}</td>
      <td class="py-3 px-4 text-xs">${escapeHtml(item.unit)}</td>
      <td class="py-3 px-4 text-right">
        <div class="flex items-center justify-end gap-1">
          <button class="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-surface-container rounded-lg transition-colors cursor-pointer" data-action="edit" data-id="${id}" title="Sunting" type="button">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          ${item.active
            ? `<button class="px-2 py-1 text-xs font-semibold text-on-surface-variant hover:text-orange-vibrant hover:bg-orange-surface rounded-lg transition-colors cursor-pointer" data-action="deactivate" data-id="${id}" type="button">Nyahaktif</button>`
            : `<button class="px-2 py-1 text-xs font-semibold text-primary hover:bg-teal-light rounded-lg transition-colors cursor-pointer" data-action="reactivate" data-id="${id}" type="button">Aktifkan semula</button>`}
        </div>
      </td>
    </tr>`;
}

function inviteCardHtml(invite) {
  return `
    <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col gap-space-sm" id="inviteCard">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
          <span class="material-symbols-outlined text-[20px]">key</span>
        </div>
        <h2 class="font-bold text-on-surface text-base">Kod Jemputan Ahli</h2>
      </div>
      <div class="flex flex-col md:flex-row md:items-center gap-space-sm">
        <div class="flex items-center gap-2">
          <code class="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-bold tracking-widest text-sm" id="inviteCode">${escapeHtml(invite.inviteCode)}</code>
          <button class="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-semibold cursor-pointer" data-copy="${escapeHtml(invite.inviteCode)}" type="button">Salin kod</button>
        </div>
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <input class="${FIELD_CLS} min-w-0" id="inviteLink" readonly type="text" value="${escapeHtml(invite.link)}"/>
          <button class="px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-semibold cursor-pointer shrink-0" data-copy="${escapeHtml(invite.link)}" type="button">Salin pautan</button>
        </div>
        <button class="px-3 py-1.5 rounded-lg bg-orange-surface text-secondary text-xs font-bold cursor-pointer shrink-0" id="btnRegenerate" type="button">Jana kod baru</button>
      </div>
      <p class="text-xs text-on-surface-variant">Kongsi pautan ini kepada ahli baharu. Kod lama tidak lagi sah selepas kod baru dijana.</p>
    </div>`;
}

function formFieldsHtml() {
  return `
    <div>
      <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanName">Nama Amalan</label>
      <input class="${FIELD_CLS}" id="amalanName" name="name" placeholder="cth: Solat Sunat Taubat" required type="text"/>
      <span class="${ERR_CLS}" data-field-error="name"></span>
    </div>
    <div>
      <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanDesc">Keterangan / Huraian Amalan</label>
      <input class="${FIELD_CLS}" id="amalanDesc" name="description" placeholder="cth: Minimum 2 rakaat seminggu sebelum tidur" type="text"/>
      <span class="${ERR_CLS}" data-field-error="description"></span>
    </div>
    <div class="grid grid-cols-2 gap-space-sm">
      <div>
        <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanFreq">Kekerapan</label>
        <select class="${FIELD_CLS} cursor-pointer" id="amalanFreq" name="freq">${optionsHtml(FREQ_LABELS, 'mingguan')}</select>
        <span class="${ERR_CLS}" data-field-error="freq"></span>
      </div>
      <div>
        <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanInputType">Jenis input</label>
        <select class="${FIELD_CLS} cursor-pointer" id="amalanInputType" name="inputType">${optionsHtml(INPUT_TYPE_LABELS, 'check')}</select>
        <span class="${ERR_CLS}" data-field-error="inputType"></span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-space-sm">
      <div>
        <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanTarget">Sasaran Nilai</label>
        <input class="${FIELD_CLS}" id="amalanTarget" name="targetVal" min="1" step="1" required type="number" value="1"/>
        <span class="${ERR_CLS}" data-field-error="targetVal"></span>
      </div>
      <div>
        <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanUnit">Unit / Format</label>
        <input class="${FIELD_CLS}" id="amalanUnit" name="unit" placeholder="cth: kali / minggu" required type="text" value="kali / minggu"/>
        <span class="${ERR_CLS}" data-field-error="unit"></span>
      </div>
    </div>
    <div>
      <label class="block text-xs font-semibold text-on-surface mb-1" for="amalanIcon">Ikon Material</label>
      <select class="${FIELD_CLS} cursor-pointer" id="amalanIcon" name="icon">${iconOptions('star')}</select>
      <span class="${ERR_CLS}" data-field-error="icon"></span>
    </div>`;
}

function renderTetapan({ amalan, invite }) {
  const activeCount = amalan.filter((a) => a.active).length;
  const inactiveCount = amalan.length - activeCount;
  const usrahName = getSession()?.usrah?.name;
  const filtered = amalan
    .filter((a) => showInactive || a.active)
    .filter((a) => activeFreqFilter === 'semua' || a.freq === activeFreqFilter);

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
              Konfigurasi senarai amalan harian, mingguan, dan bulanan${usrahName ? ` bagi ${escapeHtml(usrahName)}` : ''}.
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button class="px-space-md py-2 rounded-lg bg-primary-container hover:bg-teal-dark text-on-primary font-semibold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm" id="btnOpenAddModal" type="button">
              <span class="material-symbols-outlined text-[18px]">add</span>
              <span>Tambah Amalan</span>
            </button>
          </div>
        </div>

        ${inviteCardHtml(invite)}

        <!-- Filter Tabs -->
        <div class="flex items-center gap-2 mb-space-md overflow-x-auto pb-1">
          ${['semua', 'harian', 'mingguan', 'bulanan'].map((freq) => `
            <button class="freq-filter-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer text-xs sm:text-sm ${
              activeFreqFilter === freq
                ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'
            }" data-freq="${freq}" type="button">
              <span>${freq.charAt(0).toUpperCase() + freq.slice(1)}</span>
            </button>
          `).join('')}
          <label class="ml-auto flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer whitespace-nowrap">
            <input id="toggleInactive" type="checkbox" ${showInactive ? 'checked' : ''}/>
            <span>Tunjuk yang tidak aktif${inactiveCount ? ` (${inactiveCount})` : ''}</span>
          </label>
        </div>

        <!-- Syllabus Items Table -->
        <div class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden mb-space-2xl">
          <div class="w-full overflow-x-auto">
            <table class="w-full min-w-[950px] border-collapse text-left text-xs md:text-sm">
              <thead>
                <tr class="bg-surface-container text-on-surface border-b border-outline-variant/40 text-[11px]">
                  <th class="py-3 px-4 text-center w-14 font-bold text-on-surface-variant">Kod</th>
                  <th class="py-3 px-4 min-w-[240px] font-bold">Nama Amalan &amp; Keterangan</th>
                  <th class="py-3 px-4 min-w-[110px] font-bold">Kekerapan</th>
                  <th class="py-3 px-4 min-w-[120px] font-bold">Jenis input</th>
                  <th class="py-3 px-4 min-w-[80px] font-bold">Sasaran</th>
                  <th class="py-3 px-4 min-w-[140px] font-bold">Unit / Format</th>
                  <th class="py-3 px-4 text-right min-w-[160px] font-bold">Tindakan</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-container" id="amalanTableBody">
                ${filtered.length
                  ? filtered.map(rowHtml).join('')
                  : '<tr><td class="py-6 px-4 text-center text-on-surface-variant" colspan="7">Tiada amalan untuk dipaparkan.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal Dialog: Tambah / Sunting Amalan -->
    <div class="modal-overlay hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" id="addAmalanModal">
      <div class="modal-content w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-space-lg overflow-hidden">
        <div class="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-md">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">add_task</span>
            </div>
            <h3 class="font-bold text-on-surface text-base md:text-lg" id="amalanModalTitle">Tambah Amalan Baharu ke Sukatan</h3>
          </div>
          <button class="text-on-surface-variant hover:text-on-surface cursor-pointer" id="btnCloseAddModal" type="button">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form class="space-y-space-md" id="formAddAmalan" novalidate>
          ${formFieldsHtml()}
          <p class="${ERR_CLS}" id="amalanFormError" role="alert"></p>
          <div class="flex justify-end gap-2 pt-space-sm border-t border-outline-variant/20">
            <button class="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer" id="btnCancelAddModal" type="button">Batal</button>
            <button class="px-5 py-2 bg-primary-container hover:bg-teal-dark text-on-primary rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer" id="btnSubmitAmalan" type="submit">Tambah ke Sukatan</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function initTetapan(data) {
  const $ = (id) => document.getElementById(id);
  const modal = $('addAmalanModal');
  const form = $('formAddAmalan');
  const formError = $('amalanFormError');
  let editingId = null;

  const openModal = (item) => {
    editingId = item ? item.id : null;
    form.reset();
    showFieldErrors(form, undefined);
    setInlineError(formError, '');
    $('amalanModalTitle').textContent = item ? 'Sunting Amalan' : 'Tambah Amalan Baharu ke Sukatan';
    $('btnSubmitAmalan').textContent = item ? 'Simpan Perubahan' : 'Tambah ke Sukatan';
    const type = $('amalanInputType');
    type.disabled = Boolean(item);
    if (item) {
      $('amalanName').value = item.name;
      $('amalanDesc').value = item.description ?? '';
      $('amalanFreq').value = item.freq;
      type.value = item.inputType;
      $('amalanTarget').value = String(item.targetVal);
      $('amalanUnit').value = item.unit;
      $('amalanIcon').innerHTML = iconOptions(item.icon);
      $('amalanIcon').value = item.icon;
    }
    modal.classList.remove('hidden');
  };
  const closeModal = () => modal.classList.add('hidden');

  $('btnOpenAddModal').onclick = () => openModal(null);
  $('btnCloseAddModal').onclick = closeModal;
  $('btnCancelAddModal').onclick = closeModal;

  document.querySelectorAll('.freq-filter-btn').forEach((btn) => {
    btn.onclick = () => {
      activeFreqFilter = btn.dataset.freq;
      reload();
    };
  });
  $('toggleInactive').onchange = (e) => {
    showInactive = e.target.checked;
    reload();
  };

  const mutate = async (fn, okMessage, type = 'success') => {
    try {
      await fn();
      toast(okMessage, type);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.onclick = () => {
      const item = data.amalan.find((a) => String(a.id) === btn.dataset.id);
      if (item) openModal(item);
    };
  });
  document.querySelectorAll('[data-action="deactivate"]').forEach((btn) => {
    btn.onclick = () => mutate(() => deactivateAmalan(Number(btn.dataset.id)), 'Amalan dinyahaktifkan.', 'warning');
  });
  document.querySelectorAll('[data-action="reactivate"]').forEach((btn) => {
    btn.onclick = () => mutate(() => updateAmalan(Number(btn.dataset.id), { active: true }), 'Amalan diaktifkan semula.');
  });

  // Invite code
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.onclick = async () => {
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? 'Disalin' : 'Tidak dapat menyalin — sila salin secara manual.', ok ? 'success' : 'warning');
    };
  });
  $('btnRegenerate').onclick = async () => {
    if (!confirm('Jana kod baru? Kod dan pautan lama tidak lagi boleh digunakan untuk mendaftar.')) return;
    await mutate(() => regenerateInviteCode(), 'Kod jemputan baru telah dijana.');
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    showFieldErrors(form, undefined);
    setInlineError(formError, '');
    const targetRaw = $('amalanTarget').value.trim();
    const targetVal = Number(targetRaw);
    if (!/^\d+$/.test(targetRaw) || !Number.isInteger(targetVal) || targetVal < 1) {
      showFieldErrors(form, { targetVal: 'Sasaran mesti nombor bulat sekurang-kurangnya 1.' });
      return;
    }
    const body = {
      name: $('amalanName').value.trim(),
      description: $('amalanDesc').value.trim(),
      freq: $('amalanFreq').value,
      targetVal,
      unit: $('amalanUnit').value.trim(),
      icon: $('amalanIcon').value,
    };
    try {
      if (editingId === null) {
        await createAmalan({ ...body, inputType: $('amalanInputType').value });
        toast(`Amalan "${body.name}" berjaya ditambah ke dalam sukatan!`, 'success');
      } else {
        await updateAmalan(editingId, body);
        toast('Amalan berjaya dikemaskini.', 'success');
      }
      closeModal();
      reload();
    } catch (err) {
      if (!showFieldErrors(form, err.fields)) setInlineError(formError, err.message);
    }
  };
}

export const tetapanRoute = {
  title: `Tetapan Sukatan | ${APP}`,
  roles: ['naqib'],
  load: async () => {
    const [amalan, invite] = await Promise.all([getAmalan(), getInviteCode()]);
    return { amalan, invite };
  },
  render: renderTetapan,
  init: initTetapan,
};
