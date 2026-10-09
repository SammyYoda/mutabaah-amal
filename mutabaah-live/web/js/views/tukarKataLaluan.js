/**
 * View: Tukar Kata Laluan (forced after a password reset, or voluntary).
 */

import { changePassword } from '../api.js';
import { loadSession, getSession, defaultRouteFor } from '../session.js';
import { setInlineError, showFieldErrors } from '../util.js';

const MIN_PASSWORD = 8;
const inputClass =
  'w-full py-2.5 px-3 bg-surface-container-low border border-surface-dim/60 rounded-lg text-on-surface text-sm shadow-sm focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20';

function field(name, label, autocomplete) {
  return `
    <div class="flex flex-col gap-1">
      <label class="text-sm text-on-surface font-semibold" for="tukar-${name}">${label}</label>
      <input class="${inputClass}" id="tukar-${name}" name="${name}" type="password" autocomplete="${autocomplete}" required/>
      <span class="hidden text-xs text-error" data-field-error="${name}"></span>
    </div>`;
}

export function renderTukarKataLaluanView() {
  const forced = !!getSession()?.user?.mustChangePassword;
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-xl flex justify-center">
      <div class="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-space-lg">
        <div class="flex items-center gap-space-sm mb-space-md">
          <div class="w-10 h-10 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
            <span class="material-symbols-outlined">lock_reset</span>
          </div>
          <div>
            <h1 class="font-bold text-xl text-on-surface">Tukar Kata Laluan</h1>
            <p class="text-xs text-on-surface-variant">${
              forced
                ? 'Kata laluan anda telah ditetapkan semula. Sila tetapkan kata laluan baharu untuk meneruskan.'
                : 'Tetapkan kata laluan baharu untuk akaun anda.'
            }</p>
          </div>
        </div>
        <form class="flex flex-col gap-space-sm" id="tukarForm" novalidate>
          <p class="hidden text-sm text-on-error-container bg-error-container border border-error/30 rounded-lg px-3 py-2" id="tukarError" role="alert"></p>
          ${field('currentPassword', 'Kata Laluan Semasa', 'current-password')}
          ${field('newPassword', 'Kata Laluan Baharu', 'new-password')}
          ${field('confirmPassword', 'Sahkan Kata Laluan Baharu', 'new-password')}
          <button class="mt-space-sm w-full h-11 bg-primary-container hover:bg-teal-dark text-on-primary rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait" id="tukarSubmit" type="submit">
            <span class="material-symbols-outlined text-xl">key</span>
            <span>Simpan Kata Laluan</span>
          </button>
        </form>
      </div>
    </div>`;
}

export function initTukarKataLaluanHandlers() {
  const form = document.getElementById('tukarForm');
  if (!form) return;
  const errorEl = document.getElementById('tukarError');
  const submit = document.getElementById('tukarSubmit');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const cur = form.elements.namedItem('currentPassword').value;
    const next = form.elements.namedItem('newPassword').value;
    const confirm = form.elements.namedItem('confirmPassword').value;
    const errors = {};
    if (!cur) errors.currentPassword = 'Sila isi kata laluan semasa.';
    if (next.length < MIN_PASSWORD) errors.newPassword = `Kata laluan sekurang-kurangnya ${MIN_PASSWORD} aksara.`;
    if (next !== confirm) errors.confirmPassword = 'Kata laluan tidak sepadan.';
    showFieldErrors(form, errors);
    if (Object.keys(errors).length) {
      setInlineError(errorEl, 'Sila semak maklumat yang ditanda.');
      return;
    }
    setInlineError(errorEl, '');
    submit.disabled = true;
    try {
      await changePassword(cur, next);
      const me = await loadSession(true);
      window.showToast?.('Kata laluan berjaya ditukar.', 'success');
      window.location.hash = `#${defaultRouteFor(me)}`;
    } catch (err) {
      showFieldErrors(form, err?.fields);
      setInlineError(errorEl, err?.message ?? 'Gagal — cuba lagi.');
      submit.disabled = false;
    }
  };
}

/** Router entry (any logged-in user). */
export const tukarKataLaluanRoute = {
  title: "Tukar Kata Laluan | Mutaba'ah Amal",
  roles: ['member', 'naqib', 'admin'],
  render: renderTukarKataLaluanView,
  init: initTukarKataLaluanHandlers,
};
