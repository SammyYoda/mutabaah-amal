/**
 * View: Bimbingan (Mentorship Feed & Direct Guidance) on live data. Both roles read the feed
 * and reply; the naqib can also send guidance to the whole usrah or to one member.
 */

import { getGuidance, getSummary, sendGuidance, replyGuidance, markGuidanceRead } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml, setInlineError, showFieldErrors } from '../util.js';

const APP = "Mutaba'ah Amal";
const CATEGORY_LABELS = {
  peribadi: 'Nota Peribadi',
  tilawah: 'Tilawah Al-Quran',
  qiamullail: 'Qiamullail',
  riadah: 'Riadah & Kesihatan',
};
const FILTER_DOTS = { peribadi: 'bg-primary-container', tilawah: 'bg-secondary-container', qiamullail: 'bg-tertiary', riadah: 'bg-success-amal' };
const FIELD_CLS = 'w-full bg-surface-container-low border border-surface-dim/60 rounded-lg p-2.5 text-xs md:text-sm text-on-surface focus:outline-none focus:border-primary-container';
const ERR_CLS = 'hidden text-xs text-error mt-1';

let activeCategoryFilter = 'semua';
/** Ids of expanded cards (kept across re-renders within the page session). */
const openIds = new Set();

const toast = (msg, type = 'info') => window.showToast?.(msg, type);

/** Escape first, then turn newlines into <br>. */
const multiline = (text) => escapeHtml(text).replace(/\r?\n/g, '<br>');

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

function initialsOf(name) {
  return (String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();
}

function filterButton(key, label, count) {
  const on = activeCategoryFilter === key;
  const dot = FILTER_DOTS[key] ? `<span class="w-2 h-2 rounded-full ${FILTER_DOTS[key]}"></span>` : '';
  return `
    <button class="filter-tab-btn px-space-md py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm ${on ? 'bg-primary-container text-on-primary font-bold shadow-sm' : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-primary'}" data-filter="${key}" type="button">
      ${dot}
      <span>${escapeHtml(label)}</span>
      <span class="px-1.5 py-0.2 rounded-full ${on ? 'bg-white/20' : 'bg-surface-container'} text-[11px] font-bold">${count}</span>
    </button>`;
}

function cardHtml(item, isNaqib) {
  const id = escapeHtml(item.id);
  const open = openIds.has(item.id);
  const groupThread = item.toUserId == null;
  const audience = groupThread ? 'Seluruh usrah' : `Kepada ${item.toName ?? 'ahli'}`;
  const replies = item.replies ?? [];
  return `
    <article class="rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm hover:shadow-md transition-shadow p-space-md md:p-space-lg flex flex-col gap-space-md interactive-card" data-id="${id}">

      <!-- Card Header (click to expand) -->
      <button class="guidance-toggle w-full text-left flex items-start justify-between gap-space-sm flex-wrap cursor-pointer" data-action="toggle" data-id="${id}" aria-expanded="${open}" type="button">
        <div class="flex items-center gap-space-sm flex-wrap">
          <span class="px-space-sm py-1 rounded-full bg-teal-light text-primary-container border border-primary-container/20 font-label-sm text-label-sm font-semibold flex items-center gap-1 text-xs">
            <span class="material-symbols-outlined text-[14px]">shield_person</span>
            ${escapeHtml(CATEGORY_LABELS[item.category] ?? item.category)}
          </span>
          <span class="px-space-sm py-1 rounded-full bg-orange-surface text-secondary-container border border-secondary-container/20 font-label-sm text-label-sm font-semibold text-xs">
            ${escapeHtml(item.title)}
          </span>
          ${item.read ? '' : '<span class="unread-dot w-2 h-2 rounded-full bg-secondary-container" title="Belum dibaca"></span>'}
        </div>
        <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm text-xs">
          <span class="material-symbols-outlined text-[15px]">schedule</span>
          <time>${escapeHtml(formatDate(item.createdAt))}</time>
        </div>
      </button>

      <!-- Author Info -->
      <div class="flex items-center gap-space-sm pb-space-xs">
        <div class="w-9 h-9 rounded-full bg-teal-light text-primary-container ring-1 ring-primary-container/20 shrink-0 flex items-center justify-center text-xs font-bold">${escapeHtml(initialsOf(item.fromName))}</div>
        <div class="flex flex-col">
          <span class="font-label-md text-label-md text-on-surface font-semibold text-sm">${escapeHtml(item.fromName)}</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant text-xs">${escapeHtml(isNaqib ? audience : 'Naqib')}</span>
        </div>
      </div>

      <div class="guidance-detail flex-col gap-space-md ${open ? 'flex' : 'hidden'}" id="detail-${id}">
        <!-- Message Content -->
        <div class="rounded-lg bg-surface-container-low/70 border border-outline-variant/20 p-space-md">
          <p class="font-body-lg text-body-lg text-on-surface leading-relaxed text-sm md:text-base">${multiline(item.body)}</p>
        </div>

        ${item.reference ? `
          <div class="rounded-lg bg-teal-light/60 border border-primary-container/20 p-space-md shadow-xs">
            <div class="flex items-start gap-space-sm">
              <div class="p-2 rounded-lg bg-primary-container text-on-primary shrink-0">
                <span class="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
              <div class="flex flex-col">
                <span class="font-label-sm text-label-sm uppercase tracking-wider text-primary-container font-bold text-xs">Dalil / Rujukan Tausiyah</span>
                <blockquote class="font-body-md text-body-md text-on-surface italic mt-0.5 text-xs sm:text-sm">${multiline(item.reference)}</blockquote>
              </div>
            </div>
          </div>` : ''}

        ${replies.length > 0 ? `
          <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
            <span class="text-xs font-semibold text-primary uppercase tracking-wider">${groupThread ? 'Perbincangan usrah' : 'Maklum Balas Ahli'}:</span>
            ${replies.map((r) => `
              <div class="bg-surface-container-lowest border border-outline-variant/40 rounded-lg p-3 text-xs sm:text-sm">
                <div class="flex items-center justify-between text-on-surface-variant text-[11px] mb-1">
                  <span class="font-bold text-on-surface">${escapeHtml(r.userName)}</span>
                  <span>${escapeHtml(formatDate(r.createdAt))}</span>
                </div>
                <p class="text-on-surface leading-relaxed">${multiline(r.body)}</p>
              </div>`).join('')}
          </div>` : ''}

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/15">
          <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm text-xs">
            <span class="material-symbols-outlined text-[16px] ${item.read ? 'text-success-amal' : 'text-primary'}">${item.read ? 'check_circle' : 'mark_chat_read'}</span>
            <span>${item.read ? 'Telah dibaca' : 'Belum dibaca'}</span>
          </div>
          <button class="btn-reply px-space-md py-1.5 rounded-lg font-label-md text-label-md bg-teal-light text-primary hover:bg-surface-container transition-colors border border-primary-container/20 flex items-center justify-center gap-space-xs cursor-pointer text-xs font-semibold" data-id="${id}" type="button">
            <span class="material-symbols-outlined text-[16px]">reply</span>
            <span>Balas Bimbingan</span>
          </button>
        </div>

        <!-- Collapsible Reply Box -->
        <div class="reply-container hidden flex-col gap-space-sm pt-space-sm mt-space-xs" id="reply-container-${id}">
          <textarea class="w-full rounded-lg bg-surface-container-low border border-outline-variant/40 p-space-md font-body-md text-body-md text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary-container resize-none h-24 text-sm" id="reply-text-${id}" maxlength="2000" placeholder="Tulis maklum balas atau catatan muhasabah..."></textarea>
          <p class="${ERR_CLS}" id="reply-error-${id}" role="alert"></p>
          <div class="flex justify-end gap-space-sm">
            <button class="btn-cancel-reply px-space-sm py-1 rounded-md font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container cursor-pointer text-xs" data-id="${id}" type="button">Batal</button>
            <button class="btn-send-reply px-space-md py-1.5 rounded-md font-label-md text-label-md bg-primary-container text-on-primary hover:bg-teal-dark shadow-sm cursor-pointer font-bold text-xs" data-id="${id}" type="button">Hantar Jawapan</button>
          </div>
        </div>
      </div>
    </article>`;
}

function sendFormHtml(roster) {
  return `
    <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col gap-space-md" id="sendGuidanceCard">
      <h3 class="font-bold text-on-surface text-base">Hantar bimbingan</h3>
      <form class="flex flex-col gap-space-sm" id="formSendGuidance" novalidate>
        <div>
          <label class="block text-xs font-semibold text-on-surface mb-1" for="gTo">Kepada</label>
          <select class="${FIELD_CLS} cursor-pointer" id="gTo" name="toUserId">
            <option value="">Seluruh usrah</option>
            ${roster.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('')}
          </select>
          <span class="${ERR_CLS}" data-field-error="toUserId"></span>
        </div>
        <div>
          <label class="block text-xs font-semibold text-on-surface mb-1" for="gCategory">Kategori</label>
          <select class="${FIELD_CLS} cursor-pointer" id="gCategory" name="category">
            ${Object.entries(CATEGORY_LABELS).map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('')}
          </select>
          <span class="${ERR_CLS}" data-field-error="category"></span>
        </div>
        <div>
          <label class="block text-xs font-semibold text-on-surface mb-1" for="gTitle">Tajuk</label>
          <input class="${FIELD_CLS}" id="gTitle" maxlength="200" name="title" required type="text"/>
          <span class="${ERR_CLS}" data-field-error="title"></span>
        </div>
        <div>
          <label class="block text-xs font-semibold text-on-surface mb-1" for="gBody">Mesej</label>
          <textarea class="${FIELD_CLS} resize-none h-28" id="gBody" maxlength="5000" name="body" required></textarea>
          <span class="${ERR_CLS}" data-field-error="body"></span>
        </div>
        <div>
          <label class="block text-xs font-semibold text-on-surface mb-1" for="gReference">Dalil / Rujukan (pilihan)</label>
          <input class="${FIELD_CLS}" id="gReference" maxlength="500" name="reference" type="text"/>
          <span class="${ERR_CLS}" data-field-error="reference"></span>
        </div>
        <p class="${ERR_CLS}" id="sendGuidanceError" role="alert"></p>
        <button class="w-full py-2 bg-primary-container hover:bg-teal-dark text-on-primary rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs" type="submit">Hantar bimbingan</button>
      </form>
    </div>`;
}

function renderBimbingan({ items, roster, role }) {
  const isNaqib = role === 'naqib';
  const me = getSession();
  const filtered = activeCategoryFilter === 'semua' ? items : items.filter((g) => g.category === activeCategoryFilter);
  const counts = { semua: items.length };
  for (const k of Object.keys(CATEGORY_LABELS)) counts[k] = items.filter((g) => g.category === k).length;
  const naqibName = me?.usrah?.naqibName;

  const intro = isNaqib
    ? 'Hantar bimbingan kepada seluruh usrah atau seorang ahli, dan lihat maklum balas mereka.'
    : `Bimbingan rohani${naqibName ? ` daripada <span class="font-semibold text-on-surface">${escapeHtml(naqibName)}</span> (Naqib)` : ' daripada Naqib'} khas buat <span class="font-semibold text-on-surface">${escapeHtml(me?.user?.name ?? '')}</span>`;

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">

        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div class="flex items-start sm:items-center gap-space-md">
            <div class="w-14 h-14 rounded-full bg-teal-light text-primary-container ring-2 ring-primary-container shrink-0 flex items-center justify-center">
              <span class="material-symbols-outlined text-[28px]">forum</span>
            </div>
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
              <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">${intro}</p>
            </div>
          </div>
        </div>

        <!-- Filter Buttons -->
        <div class="flex items-center gap-2 mb-space-lg overflow-x-auto pb-1">
          ${filterButton('semua', 'Semua Bimbingan', counts.semua)}
          ${Object.entries(CATEGORY_LABELS).map(([k, l]) => filterButton(k, l, counts[k])).join('')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-2xl">

          <!-- Guidance Feed (8 cols) -->
          <div class="lg:col-span-8 flex flex-col gap-space-lg" id="feed-cards">
            ${filtered.length === 0 ? `
              <div class="bg-surface-container-lowest p-space-xl rounded-xl text-center border border-outline-variant/30">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant">inbox</span>
                <p class="font-body-md text-body-md text-on-surface-variant mt-2">${items.length === 0 ? 'Tiada bimbingan lagi.' : 'Tiada rekod bimbingan bagi kategori ini.'}</p>
              </div>
            ` : filtered.map((item) => cardHtml(item, isNaqib)).join('')}
          </div>

          <!-- Sidebar (4 cols) -->
          <div class="lg:col-span-4 flex flex-col gap-space-lg">
            ${isNaqib ? sendFormHtml(roster) : ''}
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

          </div>
        </div>
      </div>
    </div>
  `;
}

function initBimbingan(data) {
  const rerender = () => {
    const main = document.getElementById('app-main');
    if (!main) return window.router?.renderCurrent();
    main.innerHTML = renderBimbingan(data);
    initBimbingan(data);
  };
  const reload = () => window.router.renderCurrent();

  document.querySelectorAll('.filter-tab-btn').forEach((btn) => {
    btn.onclick = () => {
      activeCategoryFilter = btn.dataset.filter;
      rerender();
    };
  });

  // Expand / collapse; first expansion of an unread item confirms the reading.
  document.querySelectorAll('[data-action="toggle"]').forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.id);
      const detail = document.getElementById(`detail-${id}`);
      const open = detail.classList.contains('hidden');
      detail.classList.toggle('hidden', !open);
      detail.classList.toggle('flex', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) openIds.add(id);
      else openIds.delete(id);
      const item = data.items.find((g) => g.id === id);
      if (open && item && !item.read && !item.marking) {
        item.marking = true;
        try {
          await markGuidanceRead(id);
          item.read = true;
          btn.querySelector('.unread-dot')?.remove();
          const status = detail.querySelector('.material-symbols-outlined.text-primary');
          if (status) {
            status.classList.replace('text-primary', 'text-success-amal');
            status.textContent = 'check_circle';
            status.nextElementSibling.textContent = 'Telah dibaca';
          }
          window.router?.refreshNotifications?.();
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          item.marking = false;
        }
      }
    };
  });

  document.querySelectorAll('.btn-reply').forEach((btn) => {
    btn.onclick = () => {
      const c = document.getElementById(`reply-container-${btn.dataset.id}`);
      c?.classList.toggle('hidden');
      c?.classList.toggle('flex');
    };
  });
  document.querySelectorAll('.btn-cancel-reply').forEach((btn) => {
    btn.onclick = () => {
      const c = document.getElementById(`reply-container-${btn.dataset.id}`);
      c?.classList.add('hidden');
      c?.classList.remove('flex');
    };
  });
  document.querySelectorAll('.btn-send-reply').forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.id);
      const text = document.getElementById(`reply-text-${id}`)?.value?.trim();
      const errEl = document.getElementById(`reply-error-${id}`);
      if (!text) {
        setInlineError(errEl, 'Sila masukkan teks maklum balas terlebih dahulu.');
        return;
      }
      setInlineError(errEl, '');
      btn.disabled = true;
      try {
        await replyGuidance(id, text);
        openIds.add(id);
        toast('Jawapan berjaya dihantar.', 'success');
        reload();
      } catch (err) {
        btn.disabled = false;
        setInlineError(errEl, err.message);
      }
    };
  });

  const form = document.getElementById('formSendGuidance');
  if (form) {
    const errEl = document.getElementById('sendGuidanceError');
    form.onsubmit = async (e) => {
      e.preventDefault();
      showFieldErrors(form, undefined);
      setInlineError(errEl, '');
      const to = document.getElementById('gTo').value;
      const body = {
        toUserId: to === '' ? null : Number(to),
        category: document.getElementById('gCategory').value,
        title: document.getElementById('gTitle').value.trim(),
        body: document.getElementById('gBody').value.trim(),
      };
      const ref = document.getElementById('gReference').value.trim();
      if (ref) body.reference = ref;
      if (!body.title || !body.body) {
        showFieldErrors(form, {
          ...(body.title ? {} : { title: 'Tajuk diperlukan.' }),
          ...(body.body ? {} : { body: 'Mesej diperlukan.' }),
        });
        return;
      }
      try {
        await sendGuidance(body);
        toast('Bimbingan berjaya dihantar.', 'success');
        reload();
      } catch (err) {
        if (!showFieldErrors(form, err.fields)) setInlineError(errEl, err.message);
      }
    };
  }
}

export const bimbinganRoute = {
  title: `Bimbingan | ${APP}`,
  roles: ['member', 'naqib'],
  load: async () => {
    const role = getSession()?.role ?? 'member';
    const [items, summary] = await Promise.all([getGuidance(), role === 'naqib' ? getSummary() : null]);
    return { items, roster: summary?.roster ?? [], role };
  },
  render: renderBimbingan,
  init: initBimbingan,
};
