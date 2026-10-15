/**
 * View: Admin — usrah list, create usrah, naqib invite links.
 */

import { adminListUsrah, adminCreateUsrah, adminNaqibInvite, adminResetPassword } from '../api.js';
import { showTempPasswordModal } from './tempPasswordModal.js';
import { escapeHtml, copyText, setInlineError, showFieldErrors } from '../util.js';

const fmtDate = (iso) =>
  new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function rowHtml(u) {
  return `
    <tr class="border-t border-outline-variant/20 align-top" data-usrah-row="${escapeHtml(u.id)}">
      <td class="py-3 pr-3 font-semibold text-on-surface">${escapeHtml(u.name)}</td>
      <td class="py-3 pr-3"><code class="px-2 py-0.5 rounded bg-surface-container-low text-primary font-bold tracking-wider">${escapeHtml(u.inviteCode)}</code></td>
      <td class="py-3 pr-3 tabular-nums">${escapeHtml(u.memberCount)}</td>
      <td class="py-3 pr-3">${u.naqibName ? escapeHtml(u.naqibName) : '<span class="text-on-surface-variant italic">Belum ada</span>'}</td>
      <td class="py-3 text-right">
        <div class="inline-flex flex-wrap justify-end gap-2">
          ${u.naqibId != null ? `
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold cursor-pointer disabled:opacity-60" data-reset-naqib="${escapeHtml(u.naqibId)}" data-usrah-id="${escapeHtml(u.id)}" type="button">
            <span class="material-symbols-outlined text-[16px]">lock_reset</span> Set semula kata laluan naqib
          </button>` : ''}
          <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary-container/40 text-primary-container hover:bg-teal-light text-xs font-semibold cursor-pointer disabled:opacity-60" data-invite="${escapeHtml(u.id)}" type="button">
            <span class="material-symbols-outlined text-[16px]">person_add</span> Jemput Naqib
          </button>
        </div>
      </td>
    </tr>
    <tr class="hidden" data-invite-row="${escapeHtml(u.id)}"><td colspan="5" class="pb-3"></td></tr>`;
}

/** Markup for a generated invite link with a copy button. */
export function inviteBoxHtml(usrahName, invite) {
  return `
    <div class="bg-teal-light/50 border border-primary-container/20 rounded-lg p-3 flex flex-col gap-2">
      <span class="text-xs text-on-surface">Pautan jemputan naqib untuk <strong>${escapeHtml(usrahName)}</strong> (sekali guna, tamat ${escapeHtml(fmtDate(invite.expiresAt))}):</span>
      <div class="flex gap-2">
        <input class="flex-1 min-w-0 px-2 py-1.5 text-xs rounded border border-outline-variant/50 bg-surface-container-lowest" readonly value="${escapeHtml(invite.link)}" data-invite-link/>
        <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold cursor-pointer" data-copy type="button">
          <span class="material-symbols-outlined text-[16px]">content_copy</span> Salin
        </button>
      </div>
    </div>`;
}

/** @param {Array<{id,name,inviteCode,memberCount,naqibId,naqibName}>} list */
export function renderAdminView(list) {
  const rows = list.length
    ? list.map(rowHtml).join('')
    : '<tr><td colspan="5" class="py-6 text-center text-on-surface-variant">Belum ada usrah. Cipta usrah pertama di atas.</td></tr>';
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg flex flex-col gap-space-lg">
      <div>
        <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container text-xs font-semibold">Panel Pentadbir</span>
        <h1 class="font-bold text-2xl md:text-3xl text-on-surface mt-1">Pengurusan Usrah</h1>
        <p class="text-sm text-on-surface-variant mt-0.5">Cipta usrah, kongsi kod jemputan ahli dan jemput naqib.</p>
      </div>

      <section class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-space-md md:p-space-lg">
        <h2 class="font-bold text-base text-on-surface mb-space-sm">Cipta Usrah</h2>
        <form class="flex flex-col sm:flex-row gap-space-sm sm:items-start" id="createUsrahForm" novalidate>
          <div class="flex-1 flex flex-col gap-1">
            <label class="sr-only" for="usrahName">Nama usrah</label>
            <input class="w-full py-2 px-3 bg-surface-container-low border border-surface-dim/60 rounded-lg text-sm focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20" id="usrahName" name="name" maxlength="100" placeholder="Nama usrah, cth. Usrah An-Nur" required/>
            <span class="hidden text-xs text-error" data-field-error="name"></span>
          </div>
          <button class="inline-flex items-center justify-center gap-1.5 px-space-md py-2 rounded-lg bg-primary-container hover:bg-teal-dark text-on-primary text-sm font-semibold cursor-pointer disabled:opacity-70" id="createUsrahBtn" type="submit">
            <span class="material-symbols-outlined text-[18px]">add</span> Cipta
          </button>
        </form>
        <p class="hidden mt-2 text-sm text-on-error-container bg-error-container border border-error/30 rounded-lg px-3 py-2" id="createUsrahError" role="alert"></p>
      </section>

      <section class="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-space-md md:p-space-lg">
        <h2 class="font-bold text-base text-on-surface mb-space-sm">Senarai Usrah (${list.length})</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="text-xs uppercase tracking-wider text-on-surface-variant">
              <tr><th class="pb-2 pr-3">Nama</th><th class="pb-2 pr-3">Kod Jemputan</th><th class="pb-2 pr-3">Ahli</th><th class="pb-2 pr-3">Naqib</th><th class="pb-2"></th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </div>`;
}

export function initAdminHandlers(list) {
  bindNaqibReset(list);
  const form = document.getElementById('createUsrahForm');
  const errorEl = document.getElementById('createUsrahError');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = form.elements.namedItem('name');
      const name = input.value.trim();
      if (!name) {
        showFieldErrors(form, { name: 'Sila isi nama usrah.' });
        return;
      }
      showFieldErrors(form, {});
      setInlineError(errorEl, '');
      const btn = document.getElementById('createUsrahBtn');
      btn.disabled = true;
      try {
        const created = await adminCreateUsrah(name);
        window.showToast?.(`Usrah "${created.name}" dicipta. Kod jemputan: ${created.inviteCode}`, 'success');
        await window.router?.renderCurrent();
      } catch (err) {
        showFieldErrors(form, err?.fields);
        setInlineError(errorEl, err?.message ?? 'Gagal — cuba lagi.');
        btn.disabled = false;
      }
    };
  }

  for (const btn of document.querySelectorAll('[data-invite]')) {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-invite');
      const usrah = list.find((u) => String(u.id) === id);
      const row = [...document.querySelectorAll('[data-invite-row]')].find((r) => r.getAttribute('data-invite-row') === id);
      btn.disabled = true;
      try {
        const invite = await adminNaqibInvite(id);
        const cell = row.querySelector('td');
        cell.innerHTML = inviteBoxHtml(usrah?.name ?? '', invite);
        row.classList.remove('hidden');
        const linkInput = cell.querySelector('[data-invite-link]');
        cell.querySelector('[data-copy]').onclick = async () => {
          if (await copyText(invite.link)) {
            window.showToast?.('Pautan disalin.', 'success');
          } else {
            linkInput.focus();
            linkInput.select();
            window.showToast?.('Tidak dapat menyalin secara automatik — salin pautan yang dipilih.', 'warning');
          }
        };
      } catch (err) {
        window.showToast?.(err?.message ?? 'Gagal — cuba lagi.', 'error');
      } finally {
        btn.disabled = false;
      }
    };
  }
}

/** "Set semula kata laluan naqib": confirm → POST /admin/users/:id/reset-password → one-time modal. */
function bindNaqibReset(list) {
  for (const btn of document.querySelectorAll('[data-reset-naqib]')) {
    btn.onclick = async () => {
      const usrah = list.find((u) => String(u.id) === btn.getAttribute('data-usrah-id'));
      const name = usrah?.naqibName ?? '';
      if (!confirm(`Set semula kata laluan naqib ${name}? Semua sesi log masuknya akan ditamatkan.`)) return;
      btn.disabled = true;
      try {
        const { temporaryPassword } = await adminResetPassword(btn.getAttribute('data-reset-naqib'));
        showTempPasswordModal({ name, temporaryPassword });
      } catch (err) {
        window.showToast?.(err?.message ?? 'Gagal — cuba lagi.', 'error');
      } finally {
        btn.disabled = false;
      }
    };
  }
}

/** Router entry (admin only). */
export const adminRoute = {
  title: "Admin | Mutaba'ah Amal",
  roles: ['admin'],
  load: () => adminListUsrah(),
  render: renderAdminView,
  init: initAdminHandlers,
};
