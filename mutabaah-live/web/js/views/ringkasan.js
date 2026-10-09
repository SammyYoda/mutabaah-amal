/**
 * View: Naqib - Ringkasan (Usrah Halaqah Overview Dashboard), on live data.
 * KPIs, roster and alerts come from GET /usrah/summary; the invite chip from GET /usrah/invite-code.
 */

import { getSummary, getInviteCode } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml } from '../util.js';
import { levelBadgeClass, levelTextClass } from './charts.js';
import { navigateToMember } from './profilAhli.js';

const APP = "Mutaba'ah Amal";
const ALERT_BADGES = { level_c: 'Level C', no_log_3d: 'Tiada rekod 3 hari', drop: 'Skor menurun' };
const ALERT_ICONS = { level_c: 'priority_high', no_log_3d: 'event_busy', drop: 'trending_down' };

const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d ?? '');
};
const levelLabel = (level) => (level ? `Level ${level}` : 'Baru');

function kpiCard({ label, valueHtml, subHtml, icon, tone = 'teal' }) {
  const iconCls = tone === 'orange' ? 'bg-orange-surface text-orange-vibrant' : 'bg-teal-light text-primary-container';
  return `
    <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
      <div class="min-w-0">
        <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">${label}</span>
        <div class="flex items-baseline gap-1 mt-1">${valueHtml}</div>
        <span class="text-[11px] text-on-surface-variant mt-0.5 block truncate">${subHtml}</span>
      </div>
      <div class="w-12 h-12 rounded-lg ${iconCls} flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-[24px]">${icon}</span>
      </div>
    </div>`;
}

function inviteChipHtml(invite) {
  return `
    <a class="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/40 text-sm font-semibold flex items-center gap-2 transition-colors" href="#tetapan" data-invite-chip title="Urus kod jemputan di Tetapan">
      <span class="material-symbols-outlined text-[18px] text-primary-container">key</span>
      <span>Kod jemputan: <code class="font-bold tracking-wider text-primary">${invite ? escapeHtml(invite.inviteCode) : '—'}</code></span>
    </a>`;
}

function headerHtml(summary, invite) {
  const naqibName = getSession()?.user?.name ?? '';
  return `
    <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
            Portal Naqib Usrah
          </span>
          <span class="px-space-sm py-0.5 rounded-full bg-orange-surface text-secondary font-label-sm text-label-sm font-semibold text-xs" data-usrah-chip>
            ${escapeHtml(summary.usrah.name)} (${escapeHtml(summary.usrah.memberCount)} Ahli)
          </span>
        </div>
        <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">
          Ringkasan Prestasi Halaqah Usrah
        </h1>
        <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">
          Pemantauan mutaba'ah amal usrah (4 minggu terakhir)${naqibName ? ` • Naqib: <span class="font-semibold text-on-surface">${escapeHtml(naqibName)}</span>` : ''}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-space-sm">
        ${inviteChipHtml(invite)}
        <a class="px-space-md py-2 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark font-label-md text-label-md flex items-center gap-2 transition-colors cursor-pointer text-sm font-semibold shadow-sm" href="#matriks">
          <span class="material-symbols-outlined text-[18px]">grid_view</span>
          <span>Buka Matriks Amalan</span>
        </a>
      </div>
    </div>`;
}

function emptyStateHtml(invite) {
  return `
    <div class="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl text-center flex flex-col items-center gap-space-sm" data-empty-state>
      <span class="material-symbols-outlined text-5xl text-primary-container">group_add</span>
      <p class="font-bold text-lg text-on-surface">Belum ada ahli. Kongsi kod jemputan anda.</p>
      <code class="px-space-md py-2 rounded-lg bg-teal-light text-primary font-bold text-2xl tracking-widest">${invite ? escapeHtml(invite.inviteCode) : '—'}</code>
      <a class="text-primary hover:text-teal-dark text-sm font-bold flex items-center gap-1" href="#tetapan">
        <span>Urus kod jemputan di Tetapan</span>
        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
      </a>
    </div>`;
}

function kpisHtml(summary) {
  const { kpis, usrah, roster } = summary;
  const attention = roster.filter((m) => m.level === 'C');
  const attentionNames = attention.map((m) => escapeHtml(m.name)).join(', ');
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
      ${kpiCard({
        label: 'Kehadiran Hari Ini',
        valueHtml: `<span class="text-2xl font-bold text-on-surface" data-kpi="loggedToday">${escapeHtml(kpis.loggedToday)} / ${escapeHtml(usrah.memberCount)}</span>`,
        subHtml: 'Ahli yang merekod amalan hari ini',
        icon: 'groups',
      })}
      ${kpiCard({
        label: 'Purata 4 Minggu',
        valueHtml: `<span class="text-2xl font-bold text-primary-container" data-kpi="avg4w">${escapeHtml(kpis.avg4w)}%</span>`,
        subHtml: `Minggu ini: <span class="font-semibold text-on-surface" data-kpi="avgThisWeek">${escapeHtml(kpis.avgThisWeek)}%</span>`,
        icon: 'trending_up',
      })}
      ${kpiCard({
        label: 'Disiplin Solat Fardhu',
        valueHtml: `<span class="text-2xl font-bold text-on-surface" data-kpi="prayerAvg4w">${escapeHtml(kpis.prayerAvg4w)}%</span>`,
        subHtml: 'Purata solat fardhu direkod (4 minggu)',
        icon: 'mosque',
      })}
      ${kpiCard({
        label: 'Perlu Perhatian',
        valueHtml: `<span class="text-2xl font-bold text-orange-vibrant" data-kpi="levelC">${attention.length} Ahli</span><span class="text-xs font-semibold text-secondary">&lt;60%</span>`,
        subHtml: attention.length ? attentionNames : 'Tiada ahli di Level C',
        icon: 'priority_high',
        tone: 'orange',
      })}
    </div>`;
}

function rosterHtml(summary) {
  const cards = summary.roster
    .map(
      (m) => `
      <button class="flex items-center gap-space-sm p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary-container/40 transition-all cursor-pointer text-left group" data-member-id="${escapeHtml(m.id)}" type="button">
        <span class="w-9 h-9 rounded-full ${levelBadgeClass(m.level)} border flex items-center justify-center font-bold text-xs shrink-0">${escapeHtml(m.initials)}</span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-on-surface truncate group-hover:text-primary">${escapeHtml(m.name)}</p>
          <p class="flex items-center gap-1 mt-0.5">
            <span class="text-[11px] ${levelTextClass(m.level)} font-bold">${m.level ? `${escapeHtml(m.percentage4w)}%` : '—'}</span>
            <span class="px-1.5 rounded border text-[10px] font-bold ${levelBadgeClass(m.level)}" data-level>${levelLabel(m.level)}</span>
          </p>
          <p class="text-[10px] text-on-surface-variant truncate">${m.lastLogDate ? `Rekod terakhir: ${escapeHtml(fmtDate(m.lastLogDate))}` : 'Belum merekod'}</p>
        </div>
      </button>`,
    )
    .join('');
  return `
    <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg">
      <div class="flex items-center justify-between mb-space-md">
        <div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Senarai ${escapeHtml(summary.usrah.memberCount)} Ahli ${escapeHtml(summary.usrah.name)}</h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Skor 4 minggu terakhir • Klik untuk melihat profil terperinci ahli</p>
        </div>
        <a class="text-primary hover:text-teal-dark text-xs font-bold flex items-center gap-1" href="#matriks">
          <span>Lihat Matriks Penuh</span>
          <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-space-sm">${cards}</div>
    </div>`;
}

function alertsHtml(summary) {
  const list = summary.alerts.length
    ? summary.alerts
        .map(
          (a) => `
        <div class="p-space-md rounded-xl bg-orange-surface/50 border border-orange-vibrant/20 flex flex-col justify-between gap-3" data-alert>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-space-sm min-w-0">
              <span class="w-10 h-10 rounded-full bg-orange-surface text-orange-vibrant border border-orange-vibrant/30 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[20px]">${ALERT_ICONS[a.kind] ?? 'notification_important'}</span>
              </span>
              <div class="min-w-0">
                <h4 class="font-bold text-on-surface text-sm truncate">${escapeHtml(a.name)}</h4>
                <p class="text-xs text-on-surface-variant leading-relaxed">${escapeHtml(a.text)}</p>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded bg-orange-vibrant text-white font-bold text-[10px] shrink-0">${escapeHtml(ALERT_BADGES[a.kind] ?? a.kind)}</span>
          </div>
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-orange-vibrant/10">
            <button class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-teal-dark text-xs font-bold transition-all flex items-center gap-1 cursor-pointer" data-alert-member="${escapeHtml(a.memberId)}" type="button">
              <span class="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Beri Bimbingan</span>
            </button>
          </div>
        </div>`,
        )
        .join('')
    : '<p class="text-sm text-on-surface-variant md:col-span-2 py-space-md text-center">Tiada ahli yang memerlukan perhatian buat masa ini.</p>';
  return `
    <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
        <div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg flex items-center gap-2">
            <span class="material-symbols-outlined text-orange-vibrant text-[20px]">notification_important</span>
            Ahli Memerlukan Perhatian &amp; Dorongan Naqib
          </h3>
          <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Tiada rekod 3 hari, skor menurun minggu ini, atau berada di Level C.</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">${list}</div>
    </div>`;
}

/** @param {{ summary: any, invite: {inviteCode: string, link: string} | null }} data */
export function renderRingkasanView({ summary, invite }) {
  const body =
    summary.usrah.memberCount === 0
      ? emptyStateHtml(invite)
      : `${kpisHtml(summary)}${rosterHtml(summary)}${alertsHtml(summary)}`;
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg" id="ringkasanView">
      <div class="flex flex-col w-full">
        ${headerHtml(summary, invite)}
        ${body}
      </div>
    </div>`;
}

export function initRingkasanHandlers() {
  const root = document.getElementById('ringkasanView');
  if (!root) return;
  root.onclick = (e) => {
    const el = /** @type {HTMLElement} */ (e.target).closest('[data-member-id],[data-alert-member]');
    if (!el) return;
    navigateToMember(el.getAttribute('data-member-id') ?? el.getAttribute('data-alert-member'));
  };
}

export const ringkasanRoute = {
  title: `Ringkasan Usrah | ${APP}`,
  roles: ['naqib'],
  load: async () => {
    const [summary, invite] = await Promise.all([getSummary(), getInviteCode().catch(() => null)]);
    return { summary, invite };
  },
  render: renderRingkasanView,
  init: initRingkasanHandlers,
};
