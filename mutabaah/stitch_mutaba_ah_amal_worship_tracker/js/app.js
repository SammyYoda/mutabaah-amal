/**
 * Mutaba'ah Amal - Tarbiyah IKRAM
 * Master Application Controller & Router
 */

import { store } from './store.js';
import { renderLoginView, initLoginHandlers } from './views/login.js';
import { renderHariIniView, initHariIniHandlers } from './views/hariIni.js';
import { renderAnalitikView, initAnalitikHandlers } from './views/analitik.js';
import { renderBimbinganView, initBimbinganHandlers } from './views/bimbingan.js';
import { renderRingkasanView, initRingkasanHandlers } from './views/ringkasan.js';
import { renderMatriksView, initMatriksHandlers } from './views/matriks.js';
import { renderProfilAhliView, initProfilAhliHandlers } from './views/profilAhli.js';
import { renderTetapanView, initTetapanHandlers } from './views/tetapan.js';

class AppRouter {
  constructor() {
    this.routes = {
      'login': { render: renderLoginView, init: initLoginHandlers, title: 'Log Masuk | Mutaba\'ah Amal' },
      'hari-ini': { render: renderHariIniView, init: initHariIniHandlers, title: 'Hari Ini | Mutaba\'ah Amal' },
      'analitik': { render: renderAnalitikView, init: initAnalitikHandlers, title: 'Analitik | Mutaba\'ah Amal' },
      'bimbingan': { render: renderBimbinganView, init: initBimbinganHandlers, title: 'Bimbingan | Mutaba\'ah Amal' },
      'ringkasan': { render: renderRingkasanView, init: initRingkasanHandlers, title: 'Ringkasan Usrah | Mutaba\'ah Amal' },
      'matriks': { render: renderMatriksView, init: initMatriksHandlers, title: 'Matriks Amalan | Mutaba\'ah Amal' },
      'profil-ahli': { render: renderProfilAhliView, init: initProfilAhliHandlers, title: 'Profil Ahli | Mutaba\'ah Amal' },
      'tetapan': { render: renderTetapanView, init: initTetapanHandlers, title: 'Tetapan Sukatan | Mutaba\'ah Amal' }
    };

    window.addEventListener('hashchange', () => this.handleRoute());
  }

  getCurrentPath() {
    let hash = window.location.hash.replace('#', '').trim();
    if (hash.includes('?')) {
      hash = hash.split('?')[0];
    }
    if (!hash || !this.routes[hash]) {
      const role = store.getRole();
      return role === 'naqib' ? 'ringkasan' : 'hari-ini';
    }
    return hash;
  }

  handleRoute() {
    const path = this.getCurrentPath();
    const route = this.routes[path];

    document.title = route.title;
    this.renderHeader(path);
    this.renderContent(route);
    this.renderMobileNav(path);

    // Toggle padding for fixed header/footer (not on login page)
    const mainEl = document.getElementById('app-main');
    if (mainEl) {
      if (path === 'login') {
        mainEl.classList.remove('has-chrome');
      } else {
        mainEl.classList.add('has-chrome');
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrent() {
    this.handleRoute();
  }

  renderHeader(currentPath) {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;

    if (currentPath === 'login') {
      headerEl.innerHTML = '';
      headerEl.className = 'hidden';
      return;
    }

    headerEl.className = 'fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]';
    const role = store.getRole();
    const currentUser = store.getCurrentUser();
    const notifs = store.getNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;

    // Member links vs Naqib links
    const memberNav = `
      <a class="${currentPath === 'hari-ini' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#hari-ini">Hari Ini</a>
      <a class="${currentPath === 'analitik' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#analitik">Analitik</a>
      <a class="${currentPath === 'bimbingan' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#bimbingan">Bimbingan</a>
    `;

    const naqibNav = `
      <a class="${currentPath === 'ringkasan' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#ringkasan">Ringkasan</a>
      <a class="${currentPath === 'matriks' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#matriks">Matriks Amalan</a>
      <a class="${currentPath === 'profil-ahli' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#profil-ahli">Profil Ahli</a>
      <a class="${currentPath === 'tetapan' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#tetapan">Tetapan Sukatan</a>
    `;

    headerEl.innerHTML = `
      <!-- Top Privacy Sub-bar -->
      <div class="bg-surface-container-low px-margin md:px-margin-desktop py-1 border-b border-outline-variant/20">
        <div class="max-w-[1200px] mx-auto flex items-center justify-between text-[11px]">
          <div class="flex items-center gap-space-xs text-primary-container font-medium">
            <span class="material-symbols-outlined text-[13px]">verified_user</span>
            <span>Kerahsiaan Terpelihara: Hanya anda &amp; Naqib (${role === 'naqib' ? 'Ustaz Hazwan' : 'Ahmad Faiz'})</span>
          </div>
          <div class="flex items-center gap-space-md text-on-surface-variant">
            <span class="hidden sm:inline">Sesi Usrah Mingguan ke-24</span>
            <span class="h-2 w-2 rounded-full bg-success-amal"></span>
            <span>Sesi Aktif</span>
          </div>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <div class="h-16 max-w-[1200px] mx-auto px-margin md:px-margin-desktop flex items-center justify-between gap-space-md">
        
        <!-- Brand Logo & Title -->
        <a class="flex items-center gap-space-md shrink-0 cursor-pointer" href="${role === 'naqib' ? '#ringkasan' : '#hari-ini'}">
          <div class="w-9 h-9 rounded-lg bg-teal-light text-primary-container flex items-center justify-center font-bold text-lg shadow-xs border border-primary-container/20">
            <span class="material-symbols-outlined text-[22px]">mosque</span>
          </div>
          <div class="flex flex-col">
            <span class="font-bold text-primary-container text-base leading-tight">Mutaba'ah Amal</span>
            <span class="text-on-surface-variant text-[11px] leading-none">Usrah An-Nur 1446H</span>
          </div>
        </a>

        <!-- Desktop Navigation Tabs -->
        <nav class="hidden lg:flex items-center gap-1 bg-surface-container-low/50 p-1 rounded-xl border border-outline-variant/30">
          ${role === 'naqib' ? naqibNav : memberNav}
        </nav>

        <!-- Right Side User Menu & Actions -->
        <div class="flex items-center gap-space-sm sm:gap-space-md shrink-0">
          
          <!-- Role Switcher Button -->
          <button class="flex items-center bg-surface-container-low hover:bg-surface-container px-space-sm py-1.5 rounded-full cursor-pointer transition-colors border border-outline-variant/40" id="btnHeaderRoleToggle" title="Tukar Peranan (Ahli <-> Naqib)" type="button">
            <span class="h-2 w-2 rounded-full ${role === 'naqib' ? 'bg-orange-vibrant' : 'bg-success-amal'} mr-1.5"></span>
            <span class="font-semibold text-xs text-on-surface">${role === 'naqib' ? 'Naqib: Ustaz Hazwan' : `Ahli: ${currentUser.name.split(' ')[0]}`}</span>
            <span class="material-symbols-outlined text-[15px] text-on-surface-variant ml-1">swap_horiz</span>
          </button>

          <!-- Notifications Bell Popover Trigger -->
          <div class="relative">
            <button class="relative p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors cursor-pointer" id="btnNotificationsBell" type="button">
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              ${unreadCount > 0 ? `
                <span class="absolute top-1 right-1 h-2 w-2 rounded-full bg-ikram-orange ring-2 ring-surface-container-lowest"></span>
              ` : ''}
            </button>

            <!-- Popover Dropdown -->
            <div class="hidden absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 p-3 z-50 modal-content" id="notificationsDropdown">
              <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-2">
                <span class="font-bold text-xs text-on-surface">Pemberitahuan (${unreadCount} belum dibaca)</span>
                <button class="text-[11px] text-primary hover:underline cursor-pointer" id="btnMarkAllNotifsRead" type="button">Tanda Semua Dibaca</button>
              </div>
              <div class="space-y-2 max-h-64 overflow-y-auto">
                ${notifs.map(n => `
                  <div class="p-2 rounded-lg ${n.read ? 'bg-surface-container-low/40' : 'bg-teal-light/40 border border-primary-container/20'} text-xs cursor-pointer hover:bg-surface-container" onclick="window.location.hash='#${n.path}'; document.getElementById('notificationsDropdown').classList.add('hidden');">
                    <div class="flex items-center justify-between font-bold text-on-surface">
                      <span>${n.title}</span>
                      <span class="text-[10px] text-on-surface-variant font-normal">${n.time}</span>
                    </div>
                    <p class="text-on-surface-variant text-[11px] mt-0.5 leading-snug">${n.desc}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Log Keluar -->
          <a class="hidden sm:flex items-center gap-1 text-xs text-error hover:bg-error-container hover:text-on-error-container px-2.5 py-1.5 rounded-lg transition-colors font-semibold" href="#login">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            <span>Log Keluar</span>
          </a>
        </div>

      </div>
    `;

    // Bind Header Handlers
    const roleToggleBtn = document.getElementById('btnHeaderRoleToggle');
    if (roleToggleBtn) {
      roleToggleBtn.onclick = () => {
        const currentRole = store.getRole();
        const nextRole = currentRole === 'member' ? 'naqib' : 'member';
        store.setRole(nextRole);
        window.location.hash = nextRole === 'naqib' ? '#ringkasan' : '#hari-ini';
        window.showToast(`Beralih kepada mod ${nextRole === 'naqib' ? 'Naqib (Ustaz Hazwan)' : 'Ahli (Ahmad Faiz)'}`, 'info');
      };
    }

    const bellBtn = document.getElementById('btnNotificationsBell');
    const notifsDropdown = document.getElementById('notificationsDropdown');
    if (bellBtn && notifsDropdown) {
      bellBtn.onclick = (e) => {
        e.stopPropagation();
        notifsDropdown.classList.toggle('hidden');
      };
      document.addEventListener('click', (e) => {
        if (!notifsDropdown.contains(e.target) && e.target !== bellBtn) {
          notifsDropdown.classList.add('hidden');
        }
      });
    }

    const markAllReadBtn = document.getElementById('btnMarkAllNotifsRead');
    if (markAllReadBtn) {
      markAllReadBtn.onclick = () => {
        store.markNotificationsAllRead();
        window.showToast('Semua pemberitahuan ditandakan sebagai telah dibaca.', 'info');
        this.renderHeader(currentPath);
      };
    }
  }

  renderMobileNav(currentPath) {
    const mobileNavEl = document.getElementById('app-mobile-nav');
    if (!mobileNavEl) return;

    if (currentPath === 'login') {
      mobileNavEl.innerHTML = '';
      mobileNavEl.className = 'hidden';
      return;
    }

    mobileNavEl.className = 'lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-margin py-1 flex items-center justify-around border-t border-outline-variant/30';
    const role = store.getRole();

    if (role === 'member') {
      mobileNavEl.innerHTML = `
        <a class="flex flex-col items-center py-1 ${currentPath === 'hari-ini' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#hari-ini">
          <span class="material-symbols-outlined text-[20px]">task_alt</span>
          <span class="text-[10px] mt-0.5 font-semibold">Hari Ini</span>
        </a>
        <a class="flex flex-col items-center py-1 ${currentPath === 'analitik' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#analitik">
          <span class="material-symbols-outlined text-[20px]">monitoring</span>
          <span class="text-[10px] mt-0.5 font-semibold">Analitik</span>
        </a>
        <a class="flex flex-col items-center py-1 ${currentPath === 'bimbingan' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#bimbingan">
          <span class="material-symbols-outlined text-[20px]">forum</span>
          <span class="text-[10px] mt-0.5 font-semibold">Bimbingan</span>
        </a>
        <button class="flex flex-col items-center py-1 text-on-surface-variant hover:text-primary cursor-pointer" onclick="store.setRole('naqib'); window.location.hash='#ringkasan';" type="button">
          <span class="material-symbols-outlined text-[20px]">swap_horiz</span>
          <span class="text-[10px] mt-0.5 font-semibold">Ke Naqib</span>
        </button>
      `;
    } else {
      mobileNavEl.innerHTML = `
        <a class="flex flex-col items-center py-1 ${currentPath === 'ringkasan' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#ringkasan">
          <span class="material-symbols-outlined text-[20px]">dashboard</span>
          <span class="text-[10px] mt-0.5 font-semibold">Ringkasan</span>
        </a>
        <a class="flex flex-col items-center py-1 ${currentPath === 'matriks' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#matriks">
          <span class="material-symbols-outlined text-[20px]">grid_view</span>
          <span class="text-[10px] mt-0.5 font-semibold">Matriks</span>
        </a>
        <a class="flex flex-col items-center py-1 ${currentPath === 'profil-ahli' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#profil-ahli">
          <span class="material-symbols-outlined text-[20px]">groups</span>
          <span class="text-[10px] mt-0.5 font-semibold">Profil</span>
        </a>
        <a class="flex flex-col items-center py-1 ${currentPath === 'tetapan' ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#tetapan">
          <span class="material-symbols-outlined text-[20px]">settings</span>
          <span class="text-[10px] mt-0.5 font-semibold">Tetapan</span>
        </a>
        <button class="flex flex-col items-center py-1 text-on-surface-variant hover:text-primary cursor-pointer" onclick="store.setRole('member'); window.location.hash='#hari-ini';" type="button">
          <span class="material-symbols-outlined text-[20px]">swap_horiz</span>
          <span class="text-[10px] mt-0.5 font-semibold">Ke Ahli</span>
        </button>
      `;
    }
  }

  renderContent(route) {
    const mainEl = document.getElementById('app-main');
    if (!mainEl) return;
    mainEl.innerHTML = route.render();
    if (route.init) {
      route.init();
    }
  }
}

// Global Toast System
window.showToast = function (message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icon = type === 'success' ? 'check_circle' : (type === 'warning' ? 'priority_high' : 'info');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] text-${type === 'success' ? 'success-amal' : (type === 'warning' ? 'ikram-orange' : 'primary-container')}">${icon}</span>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
};

// Global member navigation helper
window.navigateToMember = function (memberId) {
  store.setSelectedMember(memberId);
  window.location.hash = '#profil-ahli';
};

// Expose store and router on window for micro-interactions
window.store = store;
window.router = new AppRouter();

// Initial mount
document.addEventListener('DOMContentLoaded', () => {
  window.router.handleRoute();
});
