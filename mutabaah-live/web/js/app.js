/**
 * Mutaba'ah Amal - Tarbiyah IKRAM
 * Router & application chrome (header, mobile nav, toasts, notification bell).
 *
 * Route contract:
 *   { title: string,
 *     roles: Array<'member'|'naqib'|'admin'|'public'>,
 *     load?: (params: URLSearchParams) => Promise<data>,   // skeleton shown while pending
 *     render: (data) => string,                           // HTML for #app-main (escape API strings!)
 *     init?: (data) => void | (() => unknown) }           // bind handlers after render; may return a
 *                                                         // leave hook, awaited before the next route runs
 *                                                         // (e.g. to flush a pending save)
 *
 * This module has no side effects on import; js/main.js calls startApp().
 */

import { todayKL } from '@shared/dates.js';
import { escapeHtml, skeletonHtml } from './util.js';
import { getNotifications, markNotificationsRead, logout } from './api.js';
import { loadSession, clearSession, roleOf, defaultRouteFor } from './session.js';
import { loginRoute } from './views/login.js';
import { daftarRoute } from './views/daftar.js';
import { tukarKataLaluanRoute } from './views/tukarKataLaluan.js';
import { adminRoute } from './views/admin.js';
import { hariIniRoute } from './views/hariIni.js';
import { tetapanRoute } from './views/tetapan.js';
import { bimbinganRoute } from './views/bimbingan.js';
import { analitikRoute } from './views/analitik.js';
import { ringkasanRoute } from './views/ringkasan.js';
import { matriksRoute } from './views/matriks.js';
import { profilAhliRoute, navigateToMember } from './views/profilAhli.js';

/** A route's leave hook (e.g. flushing a pending save) gets this long before navigation goes on anyway. */
export const LEAVE_HOOK_TIMEOUT_MS = 5000;
const SAVE_FAILED = 'Gagal disimpan — cuba lagi';
const PUBLIC_ROUTES = new Set(['login', 'daftar']);
const ROLE_LABELS = { naqib: 'Naqib Usrah', member: 'Ahli Usrah', admin: 'Pentadbir' };

/** Navigation entries per role: [route, label, mobile icon, mobile label]. */
const NAV = {
  member: [
    ['hari-ini', 'Hari Ini', 'task_alt', 'Hari Ini'],
    ['analitik', 'Analitik', 'monitoring', 'Analitik'],
    ['bimbingan', 'Bimbingan', 'forum', 'Bimbingan'],
  ],
  naqib: [
    ['ringkasan', 'Ringkasan', 'dashboard', 'Ringkasan'],
    // the naqib's own tracking (not shown on the group dashboards, R18)
    ['hari-ini', 'Amalan Saya', 'task_alt', 'Amalan'],
    ['analitik', 'Analitik Saya', 'monitoring', 'Analitik'],
    ['matriks', 'Matriks Amalan', 'grid_view', 'Matriks'],
    ['profil-ahli', 'Profil Ahli', 'groups', 'Profil'],
    ['bimbingan', 'Bimbingan', 'forum', 'Bimbingan'],
    ['tetapan', 'Tetapan Sukatan', 'settings', 'Tetapan'],
  ],
  admin: [['admin', 'Admin', 'admin_panel_settings', 'Admin']],
};

export function defaultRoutes() {
  return {
    login: loginRoute,
    daftar: daftarRoute,
    'tukar-kata-laluan': tukarKataLaluanRoute,
    admin: adminRoute,
    'hari-ini': hariIniRoute,
    analitik: analitikRoute,
    bimbingan: bimbinganRoute,
    ringkasan: ringkasanRoute,
    matriks: matriksRoute,
    'profil-ahli': profilAhliRoute,
    tetapan: tetapanRoute,
  };
}

/** Splits location.hash ('#daftar?kod=X') into a path and URLSearchParams. */
export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '').trim();
  const qi = raw.indexOf('?');
  const path = qi === -1 ? raw : raw.slice(0, qi);
  const params = new URLSearchParams(qi === -1 ? '' : raw.slice(qi + 1));
  return { path, params };
}

function errorCardHtml(message) {
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-xl flex justify-center">
      <div class="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm border border-error/30 p-space-lg text-center" role="alert">
        <span class="material-symbols-outlined text-4xl text-error">error</span>
        <h1 class="font-bold text-lg text-on-surface mt-space-sm">Gagal memuatkan halaman</h1>
        <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(message)}</p>
        <button class="mt-space-md px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-semibold text-sm hover:bg-teal-dark transition-colors cursor-pointer inline-flex items-center gap-1.5" data-action="retry" type="button">
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          <span>Cuba lagi</span>
        </button>
      </div>
    </div>`;
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (!Number.isFinite(min) || min < 1) return 'baru';
  if (min < 60) return `${min} min lalu`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

export class AppRouter {
  /** @param {{ routes?: Record<string, any> }} [opts] extra/overriding routes (tests) */
  constructor(opts = {}) {
    this.routes = { ...defaultRoutes(), ...(opts.routes ?? {}) };
    this.token = 0;
    this.me = null;
    this.currentPath = null;
    this.shownHash = null;
    /** @type {Array<{id,type,text,link,createdAt,read}>} */
    this.notifications = [];
    /** @type {(() => unknown) | null} leave hook returned by the current route's init */
    this.leaveHook = null;
    /** @type {Promise<void> | null} the leave hook currently running (every navigation waits for it) */
    this.leaving = null;
  }

  /** The route registered under `path` (own properties only, so '#constructor' is not a route). */
  routeFor(path) {
    return Object.hasOwn(this.routes, path) ? this.routes[path] : undefined;
  }

  /**
   * Runs the current route's leave hook (once) and waits for any hook already running. Never throws.
   * A hook still pending after LEAVE_HOOK_TIMEOUT_MS is abandoned (toast "Gagal disimpan — cuba lagi");
   * the hook receives `{ timedOut }` so its late outcome can stay quiet.
   */
  async runLeaveHook() {
    const hook = this.leaveHook;
    this.leaveHook = null;
    if (hook) {
      const prev = this.leaving;
      const run = (async () => {
        if (prev) await prev;
        const ctx = { timedOut: false };
        /** @type {ReturnType<typeof setTimeout> | undefined} */
        let timer;
        const timeout = new Promise((res) => {
          timer = setTimeout(() => {
            ctx.timedOut = true;
            res(undefined);
          }, LEAVE_HOOK_TIMEOUT_MS);
        });
        const work = Promise.resolve()
          .then(() => hook(ctx))
          .catch(() => {
            /* a failing hook must not block navigation */
          });
        await Promise.race([work, timeout]);
        clearTimeout(timer);
        if (ctx.timedOut) window.showToast?.(SAVE_FAILED, 'error');
      })();
      this.leaving = run;
      run.then(() => {
        if (this.leaving === run) this.leaving = null;
      });
    }
    if (this.leaving) await this.leaving;
  }

  /** Listens for hash changes and document clicks (closing the bell dropdown). */
  start() {
    // Skip a hashchange to the hash already being shown (e.g. api.js setting #login on a 401 while the
    // router has already replaceState'd to it).
    window.addEventListener('hashchange', () => {
      if (window.location.hash !== this.shownHash) this.handleRoute();
    });
    document.addEventListener('click', (e) => {
      const dd = document.getElementById('notificationsDropdown');
      const bell = document.getElementById('btnNotificationsBell');
      if (dd && !dd.contains(e.target) && !bell?.contains(e.target)) dd.classList.add('hidden');
    });
    return this.handleRoute();
  }

  /** Re-runs the current route (including load). Views call this after a mutation. */
  renderCurrent() {
    return this.handleRoute();
  }

  /** Picks the route to show for `path` given the session. */
  resolvePath(path, me) {
    const role = roleOf(me);
    if (!role) return PUBLIC_ROUTES.has(path) && this.routeFor(path) ? path : 'login';
    if (me.user.mustChangePassword) return 'tukar-kata-laluan';
    const route = this.routeFor(path);
    if (!route || PUBLIC_ROUTES.has(path) || !route.roles.includes(role)) return defaultRouteFor(me);
    return path;
  }

  async handleRoute() {
    const token = ++this.token;
    const stale = () => token !== this.token;
    const mainEl = document.getElementById('app-main');
    await this.runLeaveHook();
    if (stale()) return;
    let { path, params } = parseHash();

    let me;
    try {
      me = await loadSession();
    } catch (err) {
      if (stale()) return;
      this.renderChrome(null, null);
      if (mainEl) {
        mainEl.innerHTML = errorCardHtml(err?.message ?? 'Ralat tidak dijangka.');
        this.bindRetry(mainEl);
      }
      return;
    }
    if (stale()) return;
    this.me = me;

    const target = this.resolvePath(path, me);
    if (target !== path) {
      history.replaceState(null, '', `#${target}`);
      path = target;
      params = new URLSearchParams();
    }
    this.shownHash = window.location.hash;
    const route = this.routeFor(path);
    const routeChanged = this.currentPath !== path;
    this.currentPath = path;
    document.title = route.title;
    this.renderChrome(path, me);
    if (routeChanged) window.scrollTo?.({ top: 0, behavior: 'smooth' });

    let data = {};
    if (route.load) {
      if (mainEl) mainEl.innerHTML = skeletonHtml();
      try {
        data = await route.load(params);
      } catch (err) {
        if (stale()) return;
        if (mainEl) {
          mainEl.innerHTML = errorCardHtml(err?.message ?? 'Ralat tidak dijangka.');
          this.bindRetry(mainEl);
        }
        return;
      }
      if (stale()) return;
    }
    try {
      if (mainEl) mainEl.innerHTML = route.render(data);
      const hook = route.init?.(data);
      if (typeof hook === 'function') this.leaveHook = hook;
    } catch (err) {
      if (mainEl) {
        mainEl.innerHTML = errorCardHtml(err?.message ?? 'Ralat tidak dijangka.');
        this.bindRetry(mainEl);
      }
    }
  }

  bindRetry(mainEl) {
    const btn = mainEl.querySelector('[data-action="retry"]');
    if (btn) btn.onclick = () => this.handleRoute();
  }

  /** Header, mobile nav, footer and padding. path null/public → no chrome. */
  renderChrome(path, me) {
    const showChrome = !!me && !!path && !PUBLIC_ROUTES.has(path);
    document.getElementById('app-main')?.classList.toggle('has-chrome', showChrome);
    this.renderHeader(showChrome ? path : null);
    this.renderMobileNav(showChrome ? path : null);
    this.renderFooter();
    if (showChrome) this.refreshNotifications();
    else this.notifications = [];
  }

  navItems() {
    const role = roleOf(this.me);
    if (!role || this.me.user.mustChangePassword) return [];
    return NAV[role] ?? [];
  }

  renderHeader(currentPath) {
    const headerEl = document.getElementById('app-header');
    if (!headerEl) return;
    if (!currentPath || !this.me) {
      headerEl.innerHTML = '';
      headerEl.className = 'hidden';
      return;
    }

    const me = this.me;
    const role = roleOf(me);
    const notifs = this.notifications;
    const unreadCount = notifs.filter((n) => n.read === false).length;
    const home = `#${defaultRouteFor(me)}`;
    const subtitle = role === 'admin' ? 'Panel Pentadbir' : me.usrah?.name ?? '';
    const privacy =
      role === 'admin'
        ? 'Panel Pentadbir — urus usrah &amp; jemputan naqib'
        : role === 'naqib'
          ? 'Kerahsiaan Terpelihara: Rekod ahli hanya untuk anda sebagai Naqib'
          : `Kerahsiaan Terpelihara: Hanya anda &amp; Naqib${me.usrah?.naqibName ? ` (${escapeHtml(me.usrah.naqibName)})` : ' usrah anda'}`;

    const nav = this.navItems()
      .map(
        ([r, label]) => `
        <a class="${currentPath === r ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'} px-space-md py-space-xs rounded-lg transition-colors text-xs font-semibold" href="#${r}">${label}</a>`,
      )
      .join('');

    const notifList = notifs.length
      ? notifs
          .map(
            (n) => `
          <button class="block w-full text-left p-2 rounded-lg ${n.read ? 'bg-surface-container-low/40' : 'bg-teal-light/40 border border-primary-container/20'} text-xs cursor-pointer hover:bg-surface-container" data-notif-link="${escapeHtml(n.link ?? '')}" type="button">
            <span class="flex items-center justify-between gap-2 font-bold text-on-surface">
              <span>${escapeHtml(n.text)}</span>
              <span class="text-[10px] text-on-surface-variant font-normal shrink-0">${escapeHtml(timeAgo(n.createdAt))}</span>
            </span>
          </button>`,
          )
          .join('')
      : '<p class="text-xs text-on-surface-variant p-2">Tiada pemberitahuan.</p>';

    headerEl.className = 'fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)]';
    headerEl.innerHTML = `
      <!-- Top Privacy Sub-bar -->
      <div class="bg-surface-container-low px-margin md:px-margin-desktop py-1 border-b border-outline-variant/20">
        <div class="max-w-[1200px] mx-auto flex items-center justify-between text-[11px]">
          <div class="flex items-center gap-space-xs text-primary-container font-medium min-w-0">
            <span class="material-symbols-outlined text-[13px]">verified_user</span>
            <span class="truncate">${privacy}</span>
          </div>
          <div class="flex items-center gap-space-md text-on-surface-variant shrink-0">
            <span class="h-2 w-2 rounded-full bg-success-amal"></span>
            <span>Sesi Aktif</span>
          </div>
        </div>
      </div>

      <!-- Main Navigation Bar -->
      <div class="h-16 max-w-[1200px] mx-auto px-margin md:px-margin-desktop flex items-center justify-between gap-space-md">
        <a class="flex items-center gap-space-md shrink-0 cursor-pointer min-w-0" href="${home}">
          <div class="w-9 h-9 rounded-lg bg-teal-light text-primary-container flex items-center justify-center font-bold text-lg shadow-xs border border-primary-container/20">
            <span class="material-symbols-outlined text-[22px]">mosque</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-bold text-primary-container text-base leading-tight">Mutaba'ah Amal</span>
            <span class="text-on-surface-variant text-[11px] leading-none truncate" data-usrah-name>${escapeHtml(subtitle)}</span>
          </div>
        </a>

        <nav class="hidden lg:flex items-center gap-1 bg-surface-container-low/50 p-1 rounded-xl border border-outline-variant/30">
          ${nav}
        </nav>

        <div class="flex items-center gap-space-sm sm:gap-space-md shrink-0">
          <!-- Current user -->
          <div class="flex items-center bg-surface-container-low px-space-sm py-1.5 rounded-full border border-outline-variant/40 max-w-[180px] sm:max-w-[240px]" title="${escapeHtml(me.user.email)}">
            <span class="h-2 w-2 rounded-full ${role === 'naqib' ? 'bg-orange-vibrant' : role === 'admin' ? 'bg-tertiary' : 'bg-success-amal'} mr-1.5 shrink-0"></span>
            <span class="font-semibold text-xs text-on-surface truncate" data-user-name>${escapeHtml(me.user.name)}</span>
            <span class="hidden sm:inline text-[11px] text-on-surface-variant ml-1.5 shrink-0" data-role-label>${ROLE_LABELS[role] ?? ''}</span>
          </div>

          <!-- Notifications bell -->
          <div class="relative">
            <button class="relative p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors cursor-pointer" id="btnNotificationsBell" type="button" aria-label="Pemberitahuan">
              <span class="material-symbols-outlined text-[20px]">notifications</span>
              ${unreadCount > 0 ? `<span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-ikram-orange text-white text-[10px] font-bold leading-4 text-center ring-2 ring-surface-container-lowest" data-unread-count>${unreadCount}</span>` : ''}
            </button>
            <div class="hidden absolute right-0 mt-2 w-80 max-w-[90vw] bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 p-3 z-50 modal-content" id="notificationsDropdown">
              <div class="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-2">
                <span class="font-bold text-xs text-on-surface">Pemberitahuan (${unreadCount} belum dibaca)</span>
                ${unreadCount > 0 ? '<button class="text-[11px] text-primary hover:underline cursor-pointer" id="btnMarkAllNotifsRead" type="button">Tanda Semua Dibaca</button>' : ''}
              </div>
              <div class="space-y-2 max-h-64 overflow-y-auto">${notifList}</div>
            </div>
          </div>

          <!-- Log Keluar -->
          <button class="flex items-center gap-1 text-xs text-error hover:bg-error-container hover:text-on-error-container px-2.5 py-1.5 rounded-lg transition-colors font-semibold cursor-pointer" id="btnLogout" type="button" title="Log Keluar">
            <span class="material-symbols-outlined text-[16px]">logout</span>
            <span class="hidden sm:inline">Log Keluar</span>
          </button>
        </div>
      </div>
    `;

    const bellBtn = headerEl.querySelector('#btnNotificationsBell');
    const dropdown = headerEl.querySelector('#notificationsDropdown');
    bellBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    };
    for (const el of dropdown.querySelectorAll('[data-notif-link]')) {
      el.onclick = () => {
        dropdown.classList.add('hidden');
        const link = el.getAttribute('data-notif-link') ?? '';
        if (link.startsWith('#')) window.location.hash = link; // only in-app links
      };
    }
    const markAll = headerEl.querySelector('#btnMarkAllNotifsRead');
    if (markAll) {
      markAll.onclick = async (e) => {
        e.stopPropagation();
        try {
          await markNotificationsRead();
          this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
          this.renderHeader(this.currentPath);
          window.showToast?.('Semua pemberitahuan ditandakan sebagai telah dibaca.', 'info');
        } catch (err) {
          window.showToast?.(err?.message ?? 'Gagal — cuba lagi.', 'error');
        }
      };
    }
    headerEl.querySelector('#btnLogout').onclick = () => this.logout();
  }

  /** Fetches notifications and re-renders the header (errors are ignored; the bell just stays as is). */
  async refreshNotifications() {
    const token = this.token;
    try {
      const list = await getNotifications();
      if (token !== this.token || !Array.isArray(list)) return;
      this.notifications = list;
      this.renderHeader(this.currentPath && !PUBLIC_ROUTES.has(this.currentPath) ? this.currentPath : null);
    } catch {
      /* non-fatal */
    }
  }

  async logout() {
    // Flush pending edits (e.g. Hari Ini) while the session is still valid.
    await this.runLeaveHook();
    try {
      await logout();
    } catch (err) {
      if (/** @type {any} */ (err)?.status === 0) {
        // Never reached the server: the session is still valid there, so stay logged in (M-1).
        // The leave hook has closed the page; re-render it so it is usable again.
        window.showToast?.('Gagal log keluar — cuba lagi', 'error');
        await this.handleRoute();
        return;
      }
      /* any server answer: it clears the cookie regardless, so leave */
    }
    clearSession();
    this.me = null;
    if (window.location.hash === '#login') await this.handleRoute();
    else window.location.hash = '#login';
  }

  renderMobileNav(currentPath) {
    const el = document.getElementById('app-mobile-nav');
    if (!el) return;
    const items = currentPath ? this.navItems() : [];
    if (!items.length) {
      el.innerHTML = '';
      el.className = 'hidden';
      return;
    }
    el.className =
      'lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest shadow-[0_-2px_10px_rgba(0,0,0,0.06)] px-margin py-1 flex items-center justify-around border-t border-outline-variant/30';
    el.innerHTML = items
      .map(
        ([r, , icon, label]) => `
        <a class="flex flex-col items-center py-1 ${currentPath === r ? 'text-primary-container font-bold' : 'text-on-surface-variant'}" href="#${r}">
          <span class="material-symbols-outlined text-[20px]">${icon}</span>
          <span class="text-[10px] mt-0.5 font-semibold">${label}</span>
        </a>`,
      )
      .join('');
  }

  renderFooter() {
    const year = document.getElementById('footer-year');
    if (year) year.textContent = todayKL().slice(0, 4);
    const naqib = document.getElementById('footer-naqib');
    if (naqib) {
      const name = this.me?.usrah?.naqibName;
      naqib.textContent = name ? `Naqib: ${name}` : '';
      document.getElementById('footer-naqib-sep')?.classList.toggle('hidden', !name);
    }
  }
}

/** Global toast: plain text only (message is set via textContent). type: success | info | warning | error */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'check_circle', warning: 'priority_high', error: 'error', info: 'info' };
  const colors = { success: 'success-amal', warning: 'ikram-orange', error: 'error', info: 'primary-container' };
  const kind = icons[type] ? type : 'info';

  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = `material-symbols-outlined text-[20px] text-${colors[kind]}`;
  icon.textContent = icons[kind];
  const text = document.createElement('span');
  text.className = 'flex-1';
  text.textContent = String(message ?? '');
  toast.append(icon, text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/** Boots the SPA: exposes window.router / window.showToast / window.navigateToMember and routes. */
export function startApp() {
  window.showToast = showToast;
  window.navigateToMember = navigateToMember;
  const router = new AppRouter();
  window.router = router;
  router.start();
  return router;
}
