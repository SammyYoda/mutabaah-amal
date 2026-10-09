/**
 * View: Log Masuk (Authentication & Role Switcher)
 */

import { store } from '../store.js';

export function renderLoginView() {
  const currentRole = store.getRole();
  const defaultEmail = currentRole === 'naqib' ? 'hazwan.ismail@usrah.my' : 'ahmad.faiz@usrah.my';
  const defaultPass = currentRole === 'naqib' ? 'NaqibAmanah1446' : 'IbadahDisiplin1446';

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
                Platform pemantauan disiplin ibadah fardhu &amp; nawafil harian khas buat 20 ikhwah Usrah An-Nur demi istiqamah dan pengukuhan jiwa berasaskan manhaj IKRAM.
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
                    Catatan amalan anda adalah privasi sepenuhnya. Hanya anda dan Naqib usrah (<span class="font-semibold text-white underline decoration-[#F37021]/70 underline-offset-2">Ustaz Hazwan Ismail</span>) sahaja yang mempunyai akses kepada rekod ini.
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

          <!-- Right Panel: Authentication Form -->
          <div class="lg:col-span-7 p-space-lg lg:p-space-xl flex flex-col justify-between bg-surface-container-lowest">
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

              <!-- Role Quick Toggle Switcher -->
              <div class="mb-space-lg bg-surface-container-low border border-surface-dim/40 p-1.5 rounded-lg">
                <div class="flex items-center justify-between px-2 pb-1.5 pt-0.5">
                  <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Akaun Contoh Pantas</span>
                  <span class="font-label-sm text-label-sm text-[#007A87] font-semibold">Pilih Profil Sesi</span>
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                  <button class="flex items-center gap-space-sm p-2 rounded-md ${currentRole === 'member' ? 'bg-surface-container-lowest shadow-sm border border-outline-variant/50' : 'bg-transparent hover:bg-surface-container'} text-left transition-all cursor-pointer" id="role-btn-member" type="button">
                    <span class="w-7 h-7 rounded-full bg-[#FFF4EC] text-[#a04100] border border-[#ffdbcb] flex items-center justify-center font-label-md text-label-md font-bold">AF</span>
                    <div class="min-w-0">
                      <p class="font-label-md text-label-md text-on-surface truncate font-semibold">Ahmad Faiz</p>
                      <p class="font-label-sm text-label-sm text-on-surface-variant truncate">Ahli Usrah</p>
                    </div>
                  </button>
                  <button class="flex items-center gap-space-sm p-2 rounded-md ${currentRole === 'naqib' ? 'bg-surface-container-lowest shadow-sm border border-outline-variant/50' : 'bg-transparent hover:bg-surface-container'} text-left transition-all cursor-pointer" id="role-btn-naqib" type="button">
                    <span class="w-7 h-7 rounded-full bg-teal-light text-primary border border-primary/20 flex items-center justify-center font-label-md text-label-md font-bold">UH</span>
                    <div class="min-w-0">
                      <p class="font-label-md text-label-md text-on-surface truncate font-semibold">Ustaz Hazwan</p>
                      <p class="font-label-sm text-label-sm text-on-surface-variant truncate">Naqib Usrah</p>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Login Form -->
              <form class="flex flex-col gap-space-md" id="loginForm">
                <!-- Email Input -->
                <div class="flex flex-col gap-1.5">
                  <label class="font-label-md text-label-md text-on-surface font-semibold" for="emailInput">Alamat Emel</label>
                  <div class="relative flex items-center bg-surface-container-low border border-surface-dim/60 rounded-lg overflow-hidden shadow-sm focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <span class="material-symbols-outlined text-outline text-xl pl-3 pr-2 pointer-events-none">mail</span>
                    <input class="w-full py-2.5 pr-3 bg-transparent text-on-surface font-body-md text-body-md focus:outline-none placeholder:text-outline/70 border-none ring-0 focus:ring-0" id="emailInput" placeholder="nama@usrah.my" required="" type="email" value="${defaultEmail}"/>
                  </div>
                </div>

                <!-- Password Input -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <label class="font-label-md text-label-md text-on-surface font-semibold" for="passwordInput">Kata Laluan</label>
                    <a class="font-label-sm text-label-sm text-primary hover:text-primary-container hover:underline font-semibold" href="javascript:void(0)" onclick="window.showToast('Pautan tetapan semula kata laluan telah dihantar ke emel anda.', 'info')">Lupa kata laluan?</a>
                  </div>
                  <div class="relative flex items-center bg-surface-container-low border border-surface-dim/60 rounded-lg overflow-hidden shadow-sm focus-within:border-primary-container focus-within:ring-2 focus-within:ring-primary-container/20 transition-all">
                    <span class="material-symbols-outlined text-outline text-xl pl-3 pr-2 pointer-events-none">lock</span>
                    <input class="w-full py-2.5 pr-10 bg-transparent text-on-surface font-body-md text-body-md focus:outline-none placeholder:text-outline/70 border-none ring-0 focus:ring-0" id="passwordInput" placeholder="Masukkan kata laluan" required="" type="password" value="${defaultPass}"/>
                    <button class="absolute right-2 text-outline hover:text-on-surface p-1 rounded-full focus:outline-none cursor-pointer" id="togglePassBtn" type="button">
                      <span class="material-symbols-outlined text-[19px]" id="togglePassIcon">visibility</span>
                    </button>
                  </div>
                </div>

                <!-- Remember Me Checkbox -->
                <div class="flex items-center justify-between pt-1">
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input checked="" class="w-4 h-4 rounded text-[#007A87] accent-[#007A87] focus:ring-0 cursor-pointer" id="rememberMe" type="checkbox"/>
                    <span class="font-body-sm text-body-sm text-on-surface-variant">Ingat saya selama 30 hari</span>
                  </label>
                  <span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
                    <span class="material-symbols-outlined text-sm text-[#007A87]">lock_clock</span> 256-bit SSL
                  </span>
                </div>

                <!-- Primary Submit Button -->
                <button class="mt-space-sm w-full h-11 bg-[#007A87] hover:bg-[#005E68] text-on-primary font-label-lg text-label-lg rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] border border-transparent cursor-pointer font-bold" id="submitBtn" type="submit">
                  <span class="material-symbols-outlined text-xl">login</span>
                  <span>Log Masuk ke Mutaba'ah</span>
                </button>
              </form>
            </div>

            <!-- Bottom Usrah Support Note -->
            <div class="mt-space-lg pt-space-md bg-surface-container-low border border-surface-dim/40 rounded-lg p-space-sm flex items-center justify-between gap-space-sm">
              <div class="flex items-center gap-space-sm min-w-0">
                <span class="material-symbols-outlined text-[#EA580C] text-xl flex-shrink-0">support_agent</span>
                <div class="min-w-0">
                  <p class="font-label-md text-label-md text-on-surface truncate font-semibold">Bantuan Akaun &amp; Teknikal Usrah</p>
                  <p class="font-body-sm text-body-sm text-on-surface-variant truncate">Hubungi Setiausaha di <span class="font-medium text-[#007A87]">bantuan@usrah.my</span></p>
                </div>
              </div>
              <span class="material-symbols-outlined text-[#007A87] text-base">arrow_forward</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  `;
}

export function initLoginHandlers() {
  const emailInput = document.getElementById('emailInput');
  const passInput = document.getElementById('passwordInput');
  const memberBtn = document.getElementById('role-btn-member');
  const naqibBtn = document.getElementById('role-btn-naqib');
  const togglePassBtn = document.getElementById('togglePassBtn');
  const passIcon = document.getElementById('togglePassIcon');
  const loginForm = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');

  if (memberBtn && naqibBtn) {
    memberBtn.onclick = () => {
      store.setRole('member');
      store.setSelectedMember('faiz');
      emailInput.value = 'ahmad.faiz@usrah.my';
      passInput.value = 'IbadahDisiplin1446';
      memberBtn.className = 'flex items-center gap-space-sm p-2 rounded-md bg-surface-container-lowest shadow-sm border border-outline-variant/50 text-left transition-all cursor-pointer';
      naqibBtn.className = 'flex items-center gap-space-sm p-2 rounded-md bg-transparent hover:bg-surface-container text-left transition-all cursor-pointer';
    };

    naqibBtn.onclick = () => {
      store.setRole('naqib');
      emailInput.value = 'hazwan.ismail@usrah.my';
      passInput.value = 'NaqibAmanah1446';
      naqibBtn.className = 'flex items-center gap-space-sm p-2 rounded-md bg-surface-container-lowest shadow-sm border border-outline-variant/50 text-left transition-all cursor-pointer';
      memberBtn.className = 'flex items-center gap-space-sm p-2 rounded-md bg-transparent hover:bg-surface-container text-left transition-all cursor-pointer';
    };
  }

  if (togglePassBtn) {
    togglePassBtn.onclick = () => {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        passIcon.textContent = 'visibility_off';
      } else {
        passInput.type = 'password';
        passIcon.textContent = 'visibility';
      }
    };
  }

  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-xl">progress_activity</span><span>Memasuki Portal...</span>';

      setTimeout(() => {
        submitBtn.innerHTML = '<span class="material-symbols-outlined text-xl">check_circle</span><span>Berjaya Dimuatkan</span>';
        submitBtn.classList.remove('bg-[#007A87]', 'hover:bg-[#005E68]');
        submitBtn.classList.add('bg-[#059669]', 'text-on-primary');

        setTimeout(() => {
          const role = store.getRole();
          if (role === 'naqib') {
            window.location.hash = '#ringkasan';
          } else {
            window.location.hash = '#hari-ini';
          }
          window.showToast(`Selamat datang, ${store.getCurrentUser().name}!`, 'success');
        }, 600);
      }, 700);
    };
  }
}
