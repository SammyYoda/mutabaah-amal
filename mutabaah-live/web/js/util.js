/**
 * Small DOM helpers shared by every view.
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapes a value for interpolation into an innerHTML template string, in text or (quoted) attribute
 * position. null/undefined → ''. Use it for EVERY API-sourced value.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Copies text to the clipboard: navigator.clipboard when available, else a hidden-textarea
 * execCommand fallback. Resolves true on success, false when both are unavailable/blocked.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

/**
 * Loading placeholder: `<div class="skeleton">` shimmer blocks (styled in css/style.css).
 * The router shows this while a route's load() runs; views may reuse it for partial reloads.
 * @param {number} [rows=3]
 * @returns {string}
 */
export function skeletonHtml(rows = 3) {
  const blocks = Array.from(
    { length: rows },
    () => '<div class="skeleton h-24 w-full rounded-xl"></div>',
  ).join('');
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg" aria-busy="true" aria-label="Memuatkan">
      <div class="skeleton h-8 w-1/3 rounded-lg mb-space-lg"></div>
      <div class="flex flex-col gap-space-md">${blocks}</div>
    </div>`;
}

/**
 * Shows a validation/API error inline: sets the text of `el` (or hides it when message is empty).
 * Uses textContent, so no escaping is needed.
 * @param {HTMLElement|null} el
 * @param {string} [message]
 */
export function setInlineError(el, message) {
  if (!el) return;
  el.textContent = message ?? '';
  el.classList.toggle('hidden', !message);
}

/**
 * Maps an ApiError's `fields` onto form inputs: each `[data-field-error="<key>"]` element in `form`
 * gets that field's message. Returns true when at least one field matched. Clears previous ones first.
 * @param {HTMLElement} form
 * @param {Record<string,string>|undefined} fields
 * @returns {boolean}
 */
export function showFieldErrors(form, fields) {
  let matched = false;
  for (const el of form.querySelectorAll('[data-field-error]')) {
    const msg = fields?.[el.getAttribute('data-field-error')];
    setInlineError(el, msg);
    if (msg) matched = true;
  }
  return matched;
}
