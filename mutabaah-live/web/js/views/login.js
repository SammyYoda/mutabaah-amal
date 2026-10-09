/**
 * View: Log Masuk (email + password against POST /api/auth/login).
 * Also exports the shared two-panel auth layout used by Daftar.
 */

import { login } from '../api.js';
import { setSession, defaultRouteFor } from '../session.js';
import { setInlineError } from '../util.js';

/**
 * The demo's two-panel auth card: IKRAM identity on the left, `rightPanelHtml` on the right.
 * @param {string} rightPanelHtml trusted markup (escape any API strings inside it)
 */
export function renderAuthShell(rightPanelHtml) {
  return `
    <div class="view-container flex items-center justify-center min-h-screen py-6 px-4">
      <main class="w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-[0_4px_16px_-2px_rgba(15,23,42,0.12)] p-0 overflow-hidden border border-outline-variant/30">
        <div class="grid grid-cols-1 lg:grid-cols-12 min-h-[600px] bg-surface-container-lowest">
  <!-- Left Panel: Deep Teal IKRAM Identity -->
            <div class="lg:col-span-5 bg-gradient-to-br from-[#007A87] via-[#005E68] to-[#00474F] text-on-primary p-space-lg lg:p-space-xl relative flex flex-col justify-between overflow-hidden">
              <!-- Decorative Star Pattern Overlay -->
              <div class="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
                <svg class="w-[500px] h-[500px] -mr-24 -mt-20" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 200 200">
                  <polygon points="100,10 120,60 175,60 135,95 150,150 100,120 50,150 65,95 25,60 80,60"></polygon>
                  <circle cx="100" cy="100" r="70"></circle>
                  <polygon points="100,30 145,100 100,170 55,100"></polygon>
                  <polygon points="30,100 100,55 170,100 100,145"></polygon>
                  <circle cx="100" cy="100" r="35"></circle>
                </svg>
              </div>

              <!-- Top Branding Section -->
              <div class="relative z-10 flex flex-col gap-space-md">
                <div class="inline-flex items-center gap-space-xs self-start px-space-sm py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm shadow-sm">
                  <span class="w-2 h-2 rounded-full bg-[#F37021]"></span>
                  <span class="material-symbols-outlined text-sm text-[#97f0ff]" style="font-variation-settings: 'FILL' 1;">mosque</span>
                  <span class="font-label-sm text-label-sm tracking-widest uppercase font-semibold text-white">IKRAM Tarbiyah 1446H</span>
                </div>
                <div class="flex flex-col mt-space-sm">
                  <h1 class="font-display-lg text-display-lg tracking-tight leading-none text-white text-3xl font-bold">
                    Mutaba'ah<br/>Amal
                  </h1>
                  <p class="font-headline-sm text-headline-sm text-[#ffb693] mt-space-xs font-bold tracking-tight">
                    Muhasabah diri, setiap hari.
                  </p>
                </div>
                <p class="font-body-sm text-body-sm text-[#d5f9ff]/90 max-w-sm mt-space-xs leading-relaxed">
                  Platform pemantauan disiplin ibadah fardhu &amp; nawafil harian khas buat ahli usrah demi istiqamah dan pengukuhan jiwa berasaskan manhaj IKRAM.
                </p>
              </div>

              <!-- Privacy Guarantee Card -->
              <div class="relative z-10 mt-space-lg bg-white/10 border border-white/15 backdrop-blur-md rounded-lg p-space-md shadow-sm">
                <div class="flex items-start gap-space-sm">
                  <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[#F37021]/25 border border-[#F37021]/50 flex items-center justify-center text-[#ffdbcb]">
                    <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">verified_user</span>
                  </div>
                  <div class="flex flex-col gap-space-xs min-w-0">
                    <span class="font-label-md text-label-md text-white uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      Jaminan Kerahsiaan Mutlak
                      <span class="w-1.5 h-1.5 rounded-full bg-[#fc7728]"></span>
                    </span>
                    <p class="font-body-sm text-body-sm text-white/90 leading-snug">
                      Catatan amalan anda adalah privasi sepenuhnya. Hanya anda dan <span class="font-semibold text-white underline decoration-[#F37021]/70 underline-offset-2">Naqib usrah anda</span> sahaja yang mempunyai akses kepada rekod ini.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Spiritual Quote Ribbon -->
              <div class="relative z-10 mt-space-md pt-space-sm flex items-center justify-between text-[#d5f9ff]/80 border-t border-white/15">
                <span class="font-label-sm text-label-sm italic tracking-wide">“Hisablah diri kamu sebelum kamu dihisab”</span>
                <span class="font-label-sm text-label-sm uppercase font-semibold text-white/90">Umar Al-Khattab</span>
              </div>
            </div>

          <!-- Right Panel -->
          <div class="lg:col-span-7 p-space-lg lg:p-space-xl flex flex-col justify-between bg-surface-container-lowest">
            ${rightPanelHtml}
          </div>
        </div>
      </main>
    </div>
  `;
}

/** Inline error box used by auth forms (filled via textContent). */
export const formErrorHtml = (id) =>
  `<p class="hidden text-sm text-on-error-container bg-error-container border border-error/30 rounded-lg px-3 py-2" id="${id}" role="alert"></p>`;

export function renderLoginView() {
  return renderAuthShell(`
            <div>
              <!-- Heading -->
              <div class="flex flex-col mb-space-lg">
                <div class="flex items-center justify-between">
                  <h2 class="font-headline-lg text-headline-lg text-[#005E68] text-2xl font-bold">Selamat Kembali</h2>
                  <span class="inline-flex items-center gap-1.5 text-[#005E68] font-label-sm text-label-sm bg-[#E6F5F6] border border-[#007A87]/20 px-2.5 py-1 rounded-full font-medium">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#007A87]"></span>
                    Sesi 1446H Aktif
                  </span>
                </div>
                <p class="font-body-md text-body-md text-on-surface-variant mt-1">
                  Sila log masuk ke akaun mutaba'ah anda untuk melengkapkan catatan hari ini.
                </p>
              </div>

              <!-- Login Form -->
              <form class="flex flex-col gap-space-md" id="loginForm" novalidate>
                ${formErrorHtml('loginError')}

                <!-- Email Input -->
                <div class="flex flex-col gap-1.5">
                  <label class="font-label-md text-label-md text-on-surface font-semibold" for="emailInput">Alamat Emel</label>
                  <div class="relative flex items-center bg-surface-container-low border border-surface-dim/60 rounded-lg overflow-hidden shadow-sm focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <span class="material-symbols-outlined text-outline text-xl pl-3 pr-2 pointer-events-none">mail</span>
                    <input class="w-full py-2.5 pr-3 bg-transparent text-on-surface font-body-md text-body-md focus:outline-none placeholder:text-outline/70 border-none ring-0 focus:ring-0" id="emailInput" name="email" autocomplete="email" placeholder="nama@contoh.my" required type="email"/>
                  </div>
                </div>

                <!-- Password Input -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <label class="font-label-md text-label-md text-on-surface font-semibold" for="passwordInput">Kata Laluan</label>
                    <span class="font-label-sm text-label-sm text-on-surface-variant">Lupa kata laluan? Hubungi naqib anda.</span>
                  </div>
                  <div class="relative flex items-center bg-surface-container-low border border-surface-dim/60 rounded-lg overflow-hidden shadow-sm focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <span class="material-symbols-outlined text-outline text-xl pl-3 pr-2 pointer-events-none">lock</span>
                    <input class="w-full py-2.5 pr-10 bg-transparent text-on-surface font-body-md text-body-md focus:outline-none placeholder:text-outline/70 border-none ring-0 focus:ring-0" id="passwordInput" name="password" autocomplete="current-password" placeholder="Masukkan kata laluan" required type="password"/>
                    <button class="absolute right-2 text-outline hover:text-on-surface p-1 rounded-full focus:outline-none cursor-pointer" id="togglePassBtn" type="button" aria-label="Tunjuk kata laluan">
                      <span class="material-symbols-outlined text-[19px]" id="togglePassIcon">visibility</span>
                    </button>
                  </div>
                </div>

                <div class="flex items-center justify-end pt-1">
                  <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                    <span class="material-symbols-outlined text-sm text-[#007A87]">lock_clock</span> Sesi kekal 30 hari
                  </span>
                </div>

                <!-- Primary Submit Button -->
                <button class="mt-space-sm w-full h-11 bg-[#007A87] hover:bg-[#005E68] text-on-primary font-label-lg text-label-lg rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] border border-transparent cursor-pointer font-bold disabled:opacity-70 disabled:cursor-wait" id="submitBtn" type="submit">
                  <span class="material-symbols-outlined text-xl">login</span>
                  <span>Log Masuk ke Mutaba'ah</span>
                </button>
              </form>
            </div>

            <!-- Bottom: signup link -->
            <a class="mt-space-lg pt-space-md bg-surface-container-low border border-surface-dim/40 rounded-lg p-space-sm flex items-center justify-between gap-space-sm hover:bg-surface-container transition-colors" href="#daftar">
              <div class="flex items-center gap-space-sm min-w-0">
                <span class="material-symbols-outlined text-[#EA580C] text-xl flex-shrink-0">person_add</span>
                <div class="min-w-0">
                  <p class="font-label-md text-label-md text-on-surface font-semibold">Belum ada akaun?</p>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Daftar dengan kod jemputan daripada naqib anda.</p>
                </div>
              </div>
              <span class="material-symbols-outlined text-[#007A87] text-base">arrow_forward</span>
            </a>`);
}

const SUBMIT_IDLE = '<span class="material-symbols-outlined text-xl">login</span><span>Log Masuk ke Mutaba\'ah</span>';
const SUBMIT_BUSY = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span><span>Memasuki Portal...</span>';

export function initLoginHandlers() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  const emailInput = document.getElementById('emailInput');
  const passInput = document.getElementById('passwordInput');
  const submitBtn = document.getElementById('submitBtn');
  const errorEl = document.getElementById('loginError');
  const toggle = document.getElementById('togglePassBtn');
  const icon = document.getElementById('togglePassIcon');

  toggle.onclick = () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    icon.textContent = show ? 'visibility_off' : 'visibility';
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passInput.value;
    if (!email || !password) {
      setInlineError(errorEl, 'Sila isi emel dan kata laluan.');
      return;
    }
    setInlineError(errorEl, '');
    submitBtn.disabled = true;
    submitBtn.innerHTML = SUBMIT_BUSY;
    try {
      const me = await login(email, password);
      setSession(me);
      window.showToast?.(`Selamat datang, ${me.user.name}!`, 'success');
      window.location.hash = `#${defaultRouteFor(me)}`;
    } catch (err) {
      setInlineError(errorEl, err?.message ?? 'Log masuk gagal — cuba lagi.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = SUBMIT_IDLE;
    }
  };
}

/** Router entry (public). */
export const loginRoute = {
  title: "Log Masuk | Mutaba'ah Amal",
  roles: ['public'],
  render: renderLoginView,
  init: initLoginHandlers,
};
