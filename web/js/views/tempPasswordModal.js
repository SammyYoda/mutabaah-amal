/**
 * One-time temporary-password modal (spec §5.5), shared by Profil Ahli (naqib → member) and Admin (→ naqib).
 * The password is shown once with a copy button; closing removes it from the DOM.
 */

import { escapeHtml, copyText } from '../util.js';

/**
 * @param {{ name: string, temporaryPassword: string }} opts
 * @returns {HTMLElement} the overlay element (already appended to document.body)
 */
export function showTempPasswordModal({ name, temporaryPassword }) {
  document.querySelector('[data-temp-password-modal]')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4';
  overlay.setAttribute('data-temp-password-modal', '');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="modal-content w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-space-lg">
      <div class="flex items-center gap-space-sm mb-space-sm">
        <span class="material-symbols-outlined text-[24px] text-primary-container">key</span>
        <h2 class="font-bold text-lg text-on-surface">Kata laluan sementara</h2>
      </div>
      <p class="text-sm text-on-surface-variant">Kata laluan untuk <strong class="text-on-surface">${escapeHtml(name)}</strong> telah ditetapkan semula. Kongsi kata laluan ini secara peribadi — ia hanya dipaparkan <strong>sekali</strong>. Pengguna perlu menukarnya selepas log masuk.</p>
      <div class="flex gap-2 mt-space-md">
        <input class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-outline-variant/50 bg-surface-container-low font-mono font-bold tracking-wider text-on-surface" readonly value="${escapeHtml(temporaryPassword)}" data-temp-password aria-label="Kata laluan sementara"/>
        <button class="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark text-xs font-semibold cursor-pointer" data-copy type="button">
          <span class="material-symbols-outlined text-[16px]">content_copy</span> Salin
        </button>
      </div>
      <div class="flex justify-end mt-space-lg">
        <button class="px-space-md py-2 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-sm font-semibold cursor-pointer" data-close type="button">Tutup</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = /** @type {HTMLInputElement} */ (overlay.querySelector('[data-temp-password]'));
  /** @type {HTMLButtonElement} */ (overlay.querySelector('[data-copy]')).onclick = async () => {
    if (await copyText(temporaryPassword)) {
      window.showToast?.('Kata laluan disalin.', 'success');
    } else {
      input.focus();
      input.select();
      window.showToast?.('Tidak dapat menyalin secara automatik — salin kata laluan yang dipilih.', 'warning');
    }
  };
  const close = () => overlay.remove();
  /** @type {HTMLButtonElement} */ (overlay.querySelector('[data-close]')).onclick = close;
  // No close-on-backdrop: a stray click must not lose a password that is shown only once.
  return overlay;
}
