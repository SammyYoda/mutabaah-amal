/**
 * View: Naqib - Profil Ahli (Member Deep-Dive Profile & Mentorship Dispatch), on live data.
 * Route: #profil-ahli?id=<memberId>. Without an id, a member picker built from the summary roster.
 * Data: GET /members/:id (status, weekly, recentLogs, guidance) + GET /usrah/matrix (per-amalan
 * strengths/weaknesses and the member switcher).
 */

import { ApiError, getMember, getMatrix, getSummary, sendGuidance, resetMemberPassword, removeMember } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml, setInlineError, showFieldErrors } from '../util.js';
import { todayKL, addDays, dateRange } from '@shared/dates.js';
import { linePoints, linePath, areaPath, yFor, levelBadgeClass, levelTextClass, weekLabel, clampPct } from './charts.js';
import { showTempPasswordModal } from './tempPasswordModal.js';

const APP = "Mutaba'ah Amal";
const NOT_FOUND_MESSAGE = 'Ahli tidak dijumpai';
const CATEGORY_LABELS = {
  peribadi: 'Nota Peribadi',
  tilawah: 'Tilawah Al-Quran',
  qiamullail: 'Qiamullail',
  riadah: 'Riadah & Kesihatan',
};
const FIELD_CLS = 'w-full bg-surface-container-low rounded-lg p-2.5 text-xs md:text-sm text-on-surface border border-outline-variant/40 focus:outline-none focus:border-primary-container';
const ERR_CLS = 'hidden text-xs text-error mt-1';
const TREND = { width: 500, height: 200, top: 24, bottom: 28, left: 24, right: 24 };

const toast = (msg, type = 'info') => window.showToast?.(msg, type);

/** Opens a member's profile (kept on window by startApp for any inline handlers). */
export function navigateToMember(id) {
  window.location.hash = `#profil-ahli?id=${encodeURIComponent(String(id))}`;
}

/** Escape first, then turn newlines into <br>. */
const multiline = (text) => escapeHtml(text).replace(/\r?\n/g, '<br>');
const levelLabel = (level) => (level ? `Level ${level}` : 'Baru');
const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d ?? '');
};
const fmtDateTime = (iso) => {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return String(iso ?? '');
  return new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }).format(t);
};

// ---------- picker (no id) ----------

function pickerHtml(roster) {
  const items = roster.length
    ? roster
        .map(
          (m) => `
        <a class="flex items-center gap-space-sm p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 hover:border-primary-container/40 transition-all group" data-member-link href="#profil-ahli?id=${escapeHtml(encodeURIComponent(String(m.id)))}">
          <span class="w-9 h-9 rounded-full ${levelBadgeClass(m.level)} border flex items-center justify-center font-bold text-xs shrink-0">${escapeHtml(m.initials)}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-on-surface truncate group-hover:text-primary">${escapeHtml(m.name)}</p>
            <p class="flex items-center gap-1 mt-0.5">
              <span class="text-[11px] ${levelTextClass(m.level)} font-bold">${m.level ? `${escapeHtml(m.percentage4w)}%` : '—'}</span>
              <span class="px-1.5 rounded border text-[10px] font-bold ${levelBadgeClass(m.level)}" data-level>${levelLabel(m.level)}</span>
            </p>
          </div>
        </a>`,
        )
        .join('')
    : `<p class="text-sm text-on-surface-variant col-span-full text-center py-space-lg">Belum ada ahli. Kongsi kod jemputan anda di <a class="text-primary font-bold" href="#tetapan">Tetapan</a>.</p>`;
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl">
        <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-semibold text-xs">Profil Mutaba'ah Ahli</span>
        <h1 class="font-bold text-2xl md:text-3xl text-on-surface mt-1">Pilih Ahli</h1>
        <p class="text-sm text-on-surface-variant mt-0.5 mb-space-md">Pilih ahli untuk melihat profil, trend dan bimbingan.</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-space-sm">${items}</div>
      </div>
    </div>`;
}

// ---------- profile ----------

/** A week with nothing expected (before joining, or no amalan yet) has no score — not 0%. */
const hasData = (w) => w.expected !== 0;

function trendChartHtml(weekly) {
  if (!weekly.some(hasData)) return '<p class="text-sm text-on-surface-variant py-space-lg text-center">Belum ada data mingguan.</p>';
  const all = linePoints(weekly.map((w) => w.percentage), TREND); // every week keeps its x slot and axis label
  const pts = all.map((p, i) => ({ ...p, i })).filter((p) => hasData(weekly[p.i]));
  const target = yFor(80, TREND);
  const lastIdx = all.length - 1;
  const baseY = TREND.height - TREND.bottom;
  return `
    <svg class="w-full h-auto overflow-visible" viewBox="0 0 ${TREND.width} ${TREND.height}" role="img" aria-label="Graf trend skor ${weekly.length} minggu">
      <defs>
        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#007a87" stop-opacity="0.25"></stop>
          <stop offset="100%" stop-color="#007a87" stop-opacity="0.0"></stop>
        </linearGradient>
      </defs>
      <line stroke="#d5e5ed" stroke-width="1" x1="${TREND.left}" x2="${TREND.width - TREND.right}" y1="${baseY}" y2="${baseY}"></line>
      <line stroke="#bdc8cb" stroke-dasharray="4 4" stroke-width="1.5" x1="${TREND.left}" x2="${TREND.width - TREND.right}" y1="${target}" y2="${target}"></line>
      <text class="text-[11px]" fill="#3e494a" opacity="0.7" x="${TREND.left}" y="${target - 4}">Sasaran 80%</text>
      <path d="${areaPath(pts, TREND)}" fill="url(#chartGradient)"></path>
      <path d="${linePath(pts)}" fill="none" stroke="#007a87" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" data-trend-line></path>
      ${pts
        .map(
          ({ i, ...p }) => `
        <circle cx="${p.x}" cy="${p.y}" ${i === lastIdx ? 'fill="#EA580C" r="5" stroke="#ffffff" stroke-width="2"' : 'fill="#007a87" r="4"'} data-trend-point>
          <title>${escapeHtml(weekLabel(weekly[i].week))}: ${p.value}%</title>
        </circle>
        <text class="text-[10px] font-semibold" fill="#3e494a" text-anchor="middle" x="${p.x}" y="${Math.max(10, p.y - 8)}">${p.value}%</text>`,
        )
        .join('')}
      <g data-trend-labels>
        ${all
          .map(
            (p, i) =>
              `<text class="text-[10px] ${i === lastIdx ? 'font-bold' : ''}" fill="${i === lastIdx ? '#007a87' : '#3e494a'}" text-anchor="middle" x="${p.x}" y="${TREND.height - 8}">${escapeHtml(weekLabel(weekly[i].week))}${i === lastIdx ? ' (Kini)' : ''}</text>`,
          )
          .join('')}
      </g>
    </svg>`;
}

function recentDaysHtml(recentLogs) {
  const today = todayKL();
  const days = dateRange(addDays(today, -13), today);
  const logged = new Set(recentLogs.map((l) => l.date));
  const count = days.filter((d) => logged.has(d)).length;
  const cells = days
    .map((d) => {
      const isLogged = logged.has(d);
      const ring = d === today ? 'ring-2 ring-orange-vibrant' : '';
      return `<div class="h-6 rounded ${isLogged ? 'bg-primary-container' : 'bg-surface-container-highest'} ${ring}" data-day="${escapeHtml(d)}" data-logged="${isLogged ? 1 : 0}" title="${escapeHtml(fmtDate(d))}: ${isLogged ? 'Direkod' : 'Tiada rekod'}"></div>`;
    })
    .join('');
  return { count, total: days.length, cells };
}

function amalanBarsHtml(items, tone) {
  if (!items.length) return '<p class="text-xs text-on-surface-variant py-space-md text-center">Belum ada data amalan.</p>';
  const bar = tone === 'top' ? 'bg-primary-container' : 'bg-orange-vibrant';
  const text = tone === 'top' ? 'text-primary-container' : 'text-orange-vibrant';
  return items
    .map(
      (it) => `
      <div>
        <div class="flex justify-between items-center mb-1 text-xs">
          <span class="font-semibold text-on-surface truncate" data-name>${escapeHtml(it.name)}</span>
          <span class="font-bold ${text}">${escapeHtml(it.pct)}%</span>
        </div>
        <div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
          <div class="h-full ${bar} rounded-full" style="width: ${clampPct(it.pct)}%;"></div>
        </div>
      </div>`,
    )
    .join('');
}

function guidanceItemHtml(item) {
  const replies = (item.replies ?? [])
    .map(
      (r) => `
      <div class="mt-2 pt-2 border-t border-outline-variant/20 text-xs">
        <span class="font-semibold text-primary">Respons ${escapeHtml(r.userName)}:</span>
        <span class="text-on-surface-variant ml-1">${escapeHtml(fmtDateTime(r.createdAt))}</span>
        <p class="text-on-surface italic mt-0.5">${multiline(r.body)}</p>
      </div>`,
    )
    .join('');
  return `
    <div class="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20" data-guidance-id="${escapeHtml(item.id)}">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
        <div class="flex items-center gap-2">
          <span class="bg-orange-surface text-orange-vibrant text-[10px] font-bold px-2 py-0.5 rounded-full">${escapeHtml(CATEGORY_LABELS[item.category] ?? item.category)}</span>
          <span class="text-xs text-on-surface-variant">${escapeHtml(fmtDateTime(item.createdAt))} • ${escapeHtml(item.fromName)}</span>
        </div>
        <div class="flex items-center gap-1 text-primary-container text-xs bg-teal-light px-2 py-0.5 rounded self-start sm:self-auto font-medium">
          <span class="material-symbols-outlined text-[15px]">${item.read ? 'done_all' : 'mark_chat_read'}</span>
          <span>${item.read ? 'Telah dibaca' : 'Menunggu bacaan ahli'}</span>
        </div>
      </div>
      <h4 class="font-bold text-on-surface text-xs md:text-sm mb-1">${escapeHtml(item.title)}</h4>
      <p class="text-xs text-on-surface-variant leading-relaxed mb-2" data-body>${multiline(item.body)}</p>
      ${item.reference ? `<p class="text-[11px] text-on-surface-variant italic">Rujukan: ${escapeHtml(item.reference)}</p>` : ''}
      ${replies}
    </div>`;
}

function profileHtml(data) {
  const { member, status, weekly, recentLogs, guidance, matrix } = data;
  const usrahName = getSession()?.usrah?.name ?? '';
  const current = weekly.length ? weekly[weekly.length - 1] : null;
  const thisWeekText = current && hasData(current) ? `${escapeHtml(current.percentage)}%` : '—';
  const statusPct = clampPct(status.percentage);
  const baru = status.level == null; // R19: nothing expected yet → no failing 0%
  const statusText = baru ? '—' : `${escapeHtml(status.percentage)}%`;

  const row = matrix.rows.find((r) => String(r.memberId) === String(member.id));
  const scored = row
    ? matrix.amalan.filter((a) => Object.hasOwn(row.cells, String(a.id))).map((a) => ({ name: a.name, pct: row.cells[String(a.id)] }))
    : [];
  const top = [...scored].sort((a, b) => b.pct - a.pct).slice(0, 3);
  const bottom = [...scored].sort((a, b) => a.pct - b.pct).slice(0, 3);

  const days = recentDaysHtml(recentLogs);
  const memberOptions = matrix.rows
    .map((r) => `<option value="${escapeHtml(r.memberId)}" ${String(r.memberId) === String(member.id) ? 'selected' : ''}>${escapeHtml(r.name)} (${r.cells && Object.keys(r.cells).length ? `${escapeHtml(r.average)}%` : 'Baru'})</option>`)
    .join('');
  const firstName = String(member.name ?? '').split(' ')[0];

  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg" id="profilAhliView">
      <div class="flex flex-col w-full">

        <!-- Member Header -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div class="flex items-start sm:items-center gap-space-md min-w-0">
            <span class="w-14 h-14 rounded-full bg-teal-light text-primary border-2 border-primary-container flex items-center justify-center font-bold text-xl shrink-0">
              ${escapeHtml(member.initials)}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">
                  Profil Mutaba'ah Ahli
                </span>
                <span class="px-space-sm py-0.5 rounded-full border font-semibold text-xs ${levelBadgeClass(status.level)}" data-status-badge>${escapeHtml(status.label)}</span>
              </div>
              <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1 break-words">${escapeHtml(member.name)}</h1>
              <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5 break-words">
                ${usrahName ? `${escapeHtml(usrahName)} • ` : ''}Sertai: ${escapeHtml(fmtDate(member.joinedOn))} • Emel: ${escapeHtml(member.email)}${member.phone ? ` • Tel: ${escapeHtml(member.phone)}` : ''}
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-2 self-start md:self-auto md:items-end">
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label class="text-xs font-semibold text-on-surface-variant" for="memberSelectorSelect">Pilih Ahli:</label>
              <select class="bg-surface-container-low border border-surface-dim/60 text-xs md:text-sm rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary-container font-semibold cursor-pointer max-w-[260px]" id="memberSelectorSelect">
                ${memberOptions}
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface-container text-xs font-semibold cursor-pointer disabled:opacity-60" data-action="reset-password" type="button">
                <span class="material-symbols-outlined text-[16px]">lock_reset</span> Set semula kata laluan
              </button>
              <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-error/40 text-error hover:bg-error-container text-xs font-semibold cursor-pointer disabled:opacity-60" data-action="remove-member" type="button">
                <span class="material-symbols-outlined text-[16px]">person_remove</span> Keluarkan ahli
              </button>
            </div>
          </div>
        </div>

        <!-- 3 Key KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-lg">
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Skor 4 Minggu</span>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold ${levelTextClass(status.level)}" data-kpi="status">${statusText}</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">Penentu tahap status</span>
            </div>
            <div class="relative w-16 h-16 shrink-0">
              <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle class="stroke-current text-surface-container" cx="18" cy="18" fill="none" r="15.9" stroke-width="3"></circle>
                ${baru ? '' : `<circle class="stroke-current text-primary-container" cx="18" cy="18" fill="none" r="15.9" stroke-dasharray="${statusPct}, 100" stroke-linecap="round" stroke-width="3" data-donut-arc></circle>`}
              </svg>
              <div class="absolute inset-0 flex items-center justify-center font-bold text-xs ${baru ? 'text-on-surface-variant' : ''}" data-donut-label>${baru ? '—' : `${statusPct}%`}</div>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Skor Minggu Ini</span>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold text-on-surface" data-kpi="thisWeek">${thisWeekText}</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">Minggu semasa (Isnin–hari ini)</span>
            </div>
            <div class="w-14 h-14 rounded-full bg-teal-light flex items-center justify-center text-primary-container shrink-0">
              <span class="material-symbols-outlined text-[28px]">trending_up</span>
            </div>
          </div>

          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex items-center justify-between">
            <div class="min-w-0">
              <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">Status Disiplin</span>
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-bold ${levelTextClass(status.level)} break-words">${escapeHtml(status.label)}</span>
              </div>
              <span class="text-xs text-on-surface-variant mt-1 block">≥80% Teguh • 60–79% Sederhana • &lt;60% Perlu Perhatian</span>
            </div>
            <div class="w-14 h-14 rounded-full bg-orange-surface flex items-center justify-center text-secondary-container shrink-0">
              <span class="material-symbols-outlined text-[28px]">stars</span>
            </div>
          </div>
        </div>

        <!-- Trend Chart & 14-Day Logging Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          <div class="lg:col-span-7 bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-sm">
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Trend Mutaba'ah ${weekly.length} Minggu</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Skor mingguan (amalan dipenuhi ÷ amalan dijangka)</p>
                </div>
                <span class="font-label-sm text-label-sm bg-surface-container-low px-space-sm py-1 rounded text-on-surface-variant text-xs">Sasaran 80%</span>
              </div>
              <div class="w-full mt-space-md">${trendChartHtml(weekly)}</div>
            </div>
          </div>

          <div class="lg:col-span-5 bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-sm">
                <div>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Rekod 14 Hari</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Hari ${escapeHtml(firstName)} merekod amalan</p>
                </div>
                <span class="text-xs text-primary font-bold" data-days-logged>${days.count}/${days.total} Hari Direkod</span>
              </div>
              <div class="grid grid-cols-7 gap-1.5 sm:gap-2 my-space-md">${days.cells}</div>
              <div class="flex items-center justify-between text-on-surface-variant text-[11px] pt-space-xs border-t border-outline-variant/20">
                <span>14 Hari Lalu</span>
                <div class="flex items-center gap-1">
                  <span class="w-2.5 h-2.5 rounded bg-surface-container-highest"></span><span>Tiada rekod</span>
                  <span class="w-2.5 h-2.5 rounded bg-primary-container ml-1"></span><span>Direkod</span>
                </div>
                <span class="font-bold text-on-surface">Hari Ini</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Kekuatan (Top 3) vs Perlu Perhatian (Bottom 3), last 4 weeks -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-lg">
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30" data-strength>
            <div class="flex items-center gap-space-sm mb-space-md">
              <div class="w-8 h-8 rounded-lg bg-teal-light text-primary-container flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
              </div>
              <div>
                <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Kekuatan Amalan (Top 3)</h4>
                <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">4 minggu terakhir</p>
              </div>
            </div>
            <div class="space-y-space-md">${amalanBarsHtml(top, 'top')}</div>
          </div>
          <div class="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm border border-outline-variant/30" data-weakness>
            <div class="flex items-center gap-space-sm mb-space-md">
              <div class="w-8 h-8 rounded-lg bg-orange-surface text-orange-vibrant flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">priority_high</span>
              </div>
              <div>
                <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base">Perlu Perhatian (Bottom 3)</h4>
                <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Memerlukan sokongan &amp; dorongan naqib</p>
              </div>
            </div>
            <div class="space-y-space-md">${amalanBarsHtml(bottom, 'bottom')}</div>
          </div>
        </div>

        <!-- Beri Bimbingan Peribadi -->
        <div class="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-xl shadow-md border border-outline-variant/30 mb-space-lg relative overflow-hidden" id="panel-bimbingan">
          <div class="flex items-center gap-space-sm mb-space-lg">
            <div class="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">edit_note</span>
            </div>
            <div class="min-w-0">
              <h3 class="font-headline-md text-headline-md text-on-surface font-bold text-lg">Hantar Bimbingan Peribadi</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs break-words">Tausiyah khusus untuk ${escapeHtml(member.name)} • hanya beliau yang menerima nota ini</p>
            </div>
          </div>

          <form class="space-y-space-md" id="guidanceDispatchForm" novalidate>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label class="block text-on-surface font-semibold mb-1 text-xs" for="guidanceCategorySelect">Kategori</label>
                <select class="${FIELD_CLS} cursor-pointer" id="guidanceCategorySelect">
                  ${Object.entries(CATEGORY_LABELS).map(([v, l]) => `<option value="${v}">${escapeHtml(l)}</option>`).join('')}
                </select>
                <span class="${ERR_CLS}" data-field-error="category"></span>
              </div>
              <div>
                <label class="block text-on-surface font-semibold mb-1 text-xs" for="guidanceTitleInput">Tajuk Nasihat / Tausiyah</label>
                <input class="${FIELD_CLS}" id="guidanceTitleInput" maxlength="200" placeholder="cth: Tips istiqamah bangun malam" required type="text"/>
                <span class="${ERR_CLS}" data-field-error="title"></span>
              </div>
            </div>
            <div>
              <label class="block text-on-surface font-semibold mb-1 text-xs" for="guidanceContentTextarea">Kandungan Bimbingan</label>
              <textarea class="${FIELD_CLS} resize-y h-28" id="guidanceContentTextarea" maxlength="5000" required placeholder="Tulis nasihat, doa atau cadangan praktikal di sini..."></textarea>
              <span class="${ERR_CLS}" data-field-error="body"></span>
            </div>
            <div>
              <label class="block text-on-surface font-semibold mb-1 text-xs" for="guidanceReferenceInput">Rujukan (pilihan)</label>
              <input class="${FIELD_CLS}" id="guidanceReferenceInput" maxlength="500" placeholder="cth: Surah Al-Muzzammil 73:1-4" type="text"/>
              <span class="${ERR_CLS}" data-field-error="reference"></span>
            </div>
            <p class="hidden text-sm text-on-error-container bg-error-container border border-error/30 rounded-lg px-3 py-2" id="guidanceFormError" role="alert"></p>
            <div class="flex justify-end pt-2 border-t border-outline-variant/20">
              <button class="px-space-xl py-2.5 bg-primary-container text-on-primary hover:bg-teal-dark rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70" id="btnDispatchGuidance" type="submit">
                <span class="material-symbols-outlined text-[18px]">send</span>
                <span>Hantar Nota Bimbingan</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Sejarah Bimbingan -->
        <div class="bg-surface-container-lowest rounded-xl p-space-md sm:p-space-lg shadow-sm border border-outline-variant/30 mb-space-2xl">
          <div class="flex items-center justify-between mb-space-md">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-base md:text-lg">Sejarah Bimbingan Peribadi</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-xs">Nota peribadi yang dihantar kepada ahli ini</p>
            </div>
            <span class="text-xs bg-surface-container-low px-2.5 py-1 rounded text-on-surface-variant font-medium">Jumlah Rekod: ${guidance.length} Entri</span>
          </div>
          <div class="space-y-space-md">
            ${guidance.length ? guidance.map(guidanceItemHtml).join('') : '<p class="text-xs text-on-surface-variant text-center py-6">Belum ada nota bimbingan yang dihantar kepada ahli ini.</p>'}
          </div>
        </div>

      </div>
    </div>`;
}

export function renderProfilAhliView(data) {
  return data.mode === 'picker' ? pickerHtml(data.roster) : profileHtml(data);
}

export function initProfilAhliHandlers(data) {
  if (data.mode !== 'profile') return;
  const { member } = data;
  const $ = (id) => document.getElementById(id);

  const select = /** @type {HTMLSelectElement|null} */ ($('memberSelectorSelect'));
  if (select) select.onchange = () => navigateToMember(select.value);

  const form = /** @type {HTMLFormElement|null} */ ($('guidanceDispatchForm'));
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const errorEl = $('guidanceFormError');
      const category = /** @type {HTMLSelectElement} */ ($('guidanceCategorySelect')).value;
      const title = /** @type {HTMLInputElement} */ ($('guidanceTitleInput')).value.trim();
      const body = /** @type {HTMLTextAreaElement} */ ($('guidanceContentTextarea')).value.trim();
      const reference = /** @type {HTMLInputElement} */ ($('guidanceReferenceInput')).value.trim();
      const missing = {};
      if (!title) missing.title = 'Sila isi tajuk.';
      if (!body) missing.body = 'Sila isi kandungan bimbingan.';
      setInlineError(errorEl, '');
      if (showFieldErrors(form, missing)) return;

      /** @type {{toUserId:number, category:string, title:string, body:string, reference?:string}} */
      const payload = { toUserId: member.id, category, title, body };
      if (reference) payload.reference = reference;
      const btn = /** @type {HTMLButtonElement} */ ($('btnDispatchGuidance'));
      btn.disabled = true;
      try {
        await sendGuidance(payload);
        toast(`Nota bimbingan dihantar kepada ${member.name}.`, 'success');
        window.router?.renderCurrent();
      } catch (err) {
        if (!showFieldErrors(form, err?.fields)) setInlineError(errorEl, err?.message ?? 'Gagal — cuba lagi.');
        btn.disabled = false;
      }
    };
  }

  const resetBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-action="reset-password"]'));
  if (resetBtn) {
    resetBtn.onclick = async () => {
      if (!confirm(`Set semula kata laluan ${member.name}? Ahli akan dilog keluar dan perlu menukar kata laluan sementara selepas log masuk.`)) return;
      resetBtn.disabled = true;
      try {
        const { temporaryPassword } = await resetMemberPassword(member.id);
        showTempPasswordModal({ name: member.name, temporaryPassword });
      } catch (err) {
        toast(err?.message ?? 'Gagal — cuba lagi.', 'error');
      } finally {
        resetBtn.disabled = false;
      }
    };
  }

  const removeBtn = /** @type {HTMLButtonElement|null} */ (document.querySelector('[data-action="remove-member"]'));
  if (removeBtn) {
    removeBtn.onclick = async () => {
      const typed = prompt(`Keluarkan ahli ini daripada usrah? Ahli akan dilog keluar; rekodnya disimpan tetapi tidak lagi dipaparkan.\n\nTaip nama ahli untuk mengesahkan:\n${member.name}`);
      if (typed === null) return;
      if (typed.trim() !== String(member.name).trim()) {
        toast('Nama tidak sepadan — ahli tidak dikeluarkan.', 'warning');
        return;
      }
      removeBtn.disabled = true;
      try {
        await removeMember(member.id);
        toast(`${member.name} telah dikeluarkan daripada usrah.`, 'success');
        window.location.hash = '#ringkasan';
      } catch (err) {
        toast(err?.message ?? 'Gagal — cuba lagi.', 'error');
        removeBtn.disabled = false;
      }
    };
  }
}

export const profilAhliRoute = {
  title: `Profil Ahli | ${APP}`,
  roles: ['naqib'],
  /** @param {URLSearchParams} params */
  load: async (params) => {
    const id = params.get('id');
    if (!id) {
      const summary = await getSummary();
      return { mode: 'picker', roster: summary.roster };
    }
    try {
      const [detail, matrix] = await Promise.all([getMember(id), getMatrix()]);
      return { mode: 'profile', ...detail, matrix };
    } catch (err) {
      if (err?.code === 'NOT_FOUND') throw new ApiError(404, 'NOT_FOUND', NOT_FOUND_MESSAGE);
      throw err;
    }
  },
  render: renderProfilAhliView,
  init: initProfilAhliHandlers,
};
