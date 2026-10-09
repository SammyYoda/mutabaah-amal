/**
 * View: Daftar (signup). Reads `?kod=<invite code>` (member) or `?jemputan=<token>` (naqib invite).
 */

import { signup } from '../api.js';
import { loadSession, defaultRouteFor } from '../session.js';
import { escapeHtml, setInlineError, showFieldErrors } from '../util.js';
import { renderAuthShell, formErrorHtml } from './login.js';

const MIN_PASSWORD = 8;

const inputClass =
  'w-full py-2.5 px-3 bg-surface-container-low border border-surface-dim/60 rounded-lg text-on-surface text-sm shadow-sm focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 placeholder:text-outline/70';

/** One labelled input + its field-error slot. `value` is escaped. */
function field({ name, label, type = 'text', value = '', autocomplete = '', placeholder = '', required = true, hint = '' }) {
  return `
    <div class="flex flex-col gap-1">
      <label class="text-sm text-on-surface font-semibold" for="daftar-${name}">${label}${required ? '' : ' <span class="font-normal text-on-surface-variant">(pilihan)</span>'}</label>
      <input class="${inputClass}" id="daftar-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}"
        ${autocomplete ? `autocomplete="${autocomplete}"` : ''} ${placeholder ? `placeholder="${placeholder}"` : ''} ${required ? 'required' : ''}/>
      ${hint ? `<span class="text-xs text-on-surface-variant">${hint}</span>` : ''}
      <span class="hidden text-xs text-error" data-field-error="${name}"></span>
    </div>`;
}

/**
 * @param {{ kod: string, jemputan: string }} data
 */
export function renderDaftarView(data) {
  const isNaqib = !!data.jemputan;
  const codeBlock = isNaqib
    ? `<div class="flex items-center gap-2 bg-teal-light border border-primary-container/20 rounded-lg px-3 py-2 text-sm text-primary-container font-semibold" data-jemputan-naqib>
         <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
         <span>Jemputan Naqib — anda akan didaftarkan sebagai naqib usrah.</span>
       </div>
       <span class="hidden text-xs text-error" data-field-error="naqibInvite"></span>`
    : field({ name: 'inviteCode', label: 'Kod Jemputan', value: data.kod, placeholder: 'ABC-2345', autocomplete: 'off', hint: 'Dapatkan kod daripada naqib usrah anda.' });

  return renderAuthShell(`
    <div>
      <div class="flex flex-col mb-space-md">
        <h2 class="text-2xl font-bold text-[#005E68]">Daftar Akaun</h2>
        <p class="text-sm text-on-surface-variant mt-1">Isi maklumat di bawah untuk menyertai usrah anda.</p>
      </div>
      <form class="flex flex-col gap-space-sm" id="daftarForm" novalidate>
        ${formErrorHtml('daftarError')}
        ${codeBlock}
        ${field({ name: 'name', label: 'Nama Penuh', autocomplete: 'name' })}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          ${field({ name: 'email', label: 'Emel', type: 'email', autocomplete: 'email', placeholder: 'nama@contoh.my' })}
          ${field({ name: 'confirmEmail', label: 'Sahkan Emel', type: 'email', autocomplete: 'email' })}
        </div>
        ${field({ name: 'phone', label: 'No. Telefon', type: 'tel', autocomplete: 'tel', required: false })}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          ${field({ name: 'password', label: 'Kata Laluan', type: 'password', autocomplete: 'new-password', hint: `Sekurang-kurangnya ${MIN_PASSWORD} aksara.` })}
          ${field({ name: 'confirmPassword', label: 'Sahkan Kata Laluan', type: 'password', autocomplete: 'new-password' })}
        </div>
        <button class="mt-space-sm w-full h-11 bg-[#007A87] hover:bg-[#005E68] text-on-primary rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer font-bold disabled:opacity-70 disabled:cursor-wait" id="daftarSubmit" type="submit">
          <span class="material-symbols-outlined text-xl">person_add</span>
          <span>Daftar</span>
        </button>
      </form>
    </div>
    <p class="mt-space-md text-sm text-on-surface-variant text-center">
      Sudah ada akaun? <a class="text-primary font-semibold hover:underline" href="#login">Log masuk</a>
    </p>`);
}

/** Client-side checks; returns { fieldName: message } (empty when valid). */
export function validateSignup(v, { needsCode }) {
  const errors = {};
  if (!v.name) errors.name = 'Sila isi nama.';
  if (!v.email) errors.email = 'Sila isi emel.';
  if (v.email && v.email.toLowerCase() !== v.confirmEmail.toLowerCase()) errors.confirmEmail = 'Emel tidak sepadan.';
  if (v.password.length < MIN_PASSWORD) errors.password = `Kata laluan sekurang-kurangnya ${MIN_PASSWORD} aksara.`;
  if (v.password !== v.confirmPassword) errors.confirmPassword = 'Kata laluan tidak sepadan.';
  if (needsCode && !v.inviteCode) errors.inviteCode = 'Sila isi kod jemputan.';
  return errors;
}

export function initDaftarHandlers(data) {
  const form = document.getElementById('daftarForm');
  if (!form) return;
  const errorEl = document.getElementById('daftarError');
  const submit = document.getElementById('daftarSubmit');
  const isNaqib = !!data.jemputan;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const val = (n) => (form.elements.namedItem(n)?.value ?? '').trim();
    const v = {
      name: val('name'),
      email: val('email'),
      confirmEmail: val('confirmEmail'),
      phone: val('phone'),
      password: form.elements.namedItem('password').value,
      confirmPassword: form.elements.namedItem('confirmPassword').value,
      inviteCode: isNaqib ? '' : val('inviteCode'),
    };
    const errors = validateSignup(v, { needsCode: !isNaqib });
    showFieldErrors(form, errors);
    if (Object.keys(errors).length) {
      setInlineError(errorEl, 'Sila semak maklumat yang ditanda.');
      return;
    }
    setInlineError(errorEl, '');

    const payload = { name: v.name, email: v.email, password: v.password };
    if (v.phone) payload.phone = v.phone;
    if (isNaqib) payload.naqibInvite = data.jemputan;
    else payload.inviteCode = v.inviteCode;

    submit.disabled = true;
    try {
      await signup(payload);
      const me = await loadSession(true);
      window.showToast?.('Pendaftaran berjaya. Selamat datang!', 'success');
      window.location.hash = `#${defaultRouteFor(me)}`;
    } catch (err) {
      showFieldErrors(form, err?.fields);
      setInlineError(errorEl, err?.message ?? 'Pendaftaran gagal — cuba lagi.');
      submit.disabled = false;
    }
  };
}

/** Router entry (public). */
export const daftarRoute = {
  title: "Daftar | Mutaba'ah Amal",
  roles: ['public'],
  load: async (params) => ({ kod: params.get('kod') ?? '', jemputan: params.get('jemputan') ?? '' }),
  render: renderDaftarView,
  init: initDaftarHandlers,
};
