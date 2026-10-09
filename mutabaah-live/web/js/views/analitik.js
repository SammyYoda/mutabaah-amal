/**
 * View: Ahli - Analitik (Personal Worship Analytics & Consistency), on live data from GET /me/analytics.
 * Weekly bars, 60-day heatmap, per-amalan breakdown and the 4-week status badge.
 */

import { getMyAnalytics } from '../api.js';
import { getSession } from '../session.js';
import { escapeHtml } from '../util.js';
import { barLayout, yFor, baseline, heatClass, levelBadgeClass, levelTextClass, weekLabel, clampPct, bandOf } from './charts.js';

const APP = "Mutaba'ah Amal";
const DEFAULT_WEEKS = 8;
const BARS = { width: 540, height: 230, top: 20, bottom: 30, left: 40, right: 20 };

const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d ?? '');
};

function barClass(pct, isLast) {
  if (isLast) return 'fill-orange-vibrant';
  return clampPct(pct) >= 80 ? 'fill-primary-container' : 'fill-primary-fixed-dim';
}

function weeklyChartHtml(weekly) {
  if (!weekly.length) return '<p class="text-sm text-on-surface-variant py-space-lg text-center">Belum ada data mingguan.</p>';
  const bars = barLayout(weekly.map((w) => w.percentage), BARS);
  const x1 = BARS.left;
  const x2 = BARS.width - BARS.right;
  const grid = [100, 75, 50, 25, 0]
    .map((p) => {
      const y = yFor(p, BARS);
      return `
      <line class="text-surface-container" stroke="currentColor" stroke-width="${p === 0 ? 1.5 : 1}" x1="${x1}" x2="${x2}" y1="${y}" y2="${y}"></line>
      <text class="text-on-surface-variant text-[10px]" fill="currentColor" text-anchor="end" x="${x1 - 8}" y="${y + 4}">${p}%</text>`;
    })
    .join('');
  const target = yFor(80, BARS);
  const last = bars.length - 1;
  return `
    <svg class="w-full min-w-[320px] h-auto" viewBox="0 0 ${BARS.width} ${BARS.height}" role="img" aria-label="Graf bar skor ${weekly.length} minggu" data-weekly-chart>
      ${grid}
      <line stroke="#EA580C" stroke-dasharray="4,4" stroke-width="2" x1="${x1}" x2="${x2}" y1="${target}" y2="${target}"></line>
      ${bars
        .map(
          (b, i) => `
        <g class="group">
          <rect class="${barClass(b.value, i === last)} transition-opacity group-hover:opacity-85" height="${b.h}" rx="4" width="${b.w}" x="${b.x}" y="${b.y}" data-week-bar data-pct="${escapeHtml(weekly[i].percentage)}">
            <title>Minggu bermula ${escapeHtml(fmtDate(weekly[i].start))}: ${b.value}%</title>
          </rect>
          <text class="${i === last ? 'fill-orange-vibrant' : 'fill-primary-container'} text-[11px] font-bold" text-anchor="middle" x="${b.cx}" y="${Math.max(12, b.y - 6)}" data-week-label>${b.value}%</text>
          <text class="${i === last ? 'fill-on-surface font-bold' : 'fill-on-surface-variant'} text-[11px]" text-anchor="middle" x="${b.cx}" y="${baseline(BARS) + 18}">${escapeHtml(weekLabel(weekly[i].week))}${i === last ? ' (Kini)' : ''}</text>
        </g>`,
        )
        .join('')}
    </svg>`;
}

function heatmapHtml(heatmap) {
  if (!heatmap.length) return '<p class="text-sm text-on-surface-variant py-space-md text-center">Belum ada data harian.</p>';
  const last = heatmap.length - 1;
  return heatmap
    .map(
      (d, i) =>
        `<div class="w-5 h-5 rounded-sm ${heatClass(d.percentage)} ${i === last ? 'ring-2 ring-orange-vibrant' : ''}" title="${escapeHtml(fmtDate(d.date))}${i === last ? ' (Hari Ini)' : ''}: ${clampPct(d.percentage)}%" data-heat></div>`,
    )
    .join('');
}

function categoryHtml(byCategory) {
  if (!byCategory.length) {
    return '<p class="text-sm text-on-surface-variant md:col-span-2 py-space-md text-center">Belum ada amalan yang dinilai untuk tempoh ini.</p>';
  }
  return byCategory
    .map((c) => {
      const low = bandOf(c.percentage) === 'C';
      const text = low ? 'text-orange-vibrant' : 'text-primary-container';
      const bar = low ? 'bg-orange-vibrant' : 'bg-primary-container';
      return `
      <div class="flex flex-col p-2 rounded-lg bg-surface-container-low/40 border border-outline-variant/20" data-category>
        <div class="flex items-center justify-between mb-1 gap-2">
          <span class="font-medium text-on-surface text-sm truncate" data-name>${escapeHtml(c.name)}</span>
          <span class="font-bold text-sm ${text}">${escapeHtml(c.percentage)}%</span>
        </div>
        <div class="w-full bg-surface-container rounded-full h-2 overflow-hidden mt-1">
          <div class="${bar} h-full rounded-full transition-all" style="width: ${clampPct(c.percentage)}%"></div>
        </div>
        <span class="text-[11px] text-on-surface-variant mt-1">Dipenuhi ${escapeHtml(c.met)} / ${escapeHtml(c.expected)} kali dijangka</span>
      </div>`;
    })
    .join('');
}

export function renderAnalitikView(data) {
  const { weekly, heatmap, byCategory, status } = data;
  const name = getSession()?.user?.name ?? '';
  return `
    <div class="view-container max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-space-lg">
      <div class="flex flex-col w-full">

        <!-- Header Banner -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-xl rounded-xl shadow-sm border border-outline-variant/30 mb-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-space-sm py-0.5 rounded-full bg-teal-light text-primary-container font-label-sm text-label-sm font-semibold text-xs">Analitik Prestasi Ruhani</span>
              <span class="px-space-sm py-0.5 rounded-full border font-semibold text-xs ${levelBadgeClass(status.level)}" data-status-badge>${escapeHtml(status.label)}</span>
            </div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface font-bold text-2xl md:text-3xl mt-1">Analitik &amp; Momentum Istiqamah</h1>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mt-0.5 break-words">
              Penilaian kendiri 4 minggu terakhir bagi <span class="font-semibold text-on-surface">${escapeHtml(name)}</span>:
              <span class="font-bold ${levelTextClass(status.level)}" data-status-pct>${escapeHtml(status.percentage)}%</span>
            </p>
          </div>
          <div class="flex items-center gap-space-sm">
            <button class="px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 border border-outline-variant/40 transition-colors cursor-pointer text-sm font-semibold" data-action="print" type="button">
              <span class="material-symbols-outlined text-[18px]">print</span>
              <span>Cetak / Eksport</span>
            </button>
          </div>
        </div>

        <!-- Weekly Bars & 60-Day Heatmap -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          <div class="lg:col-span-7 bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-space-xs">
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Trend Prestasi ${weekly.length} Minggu</h2>
                <span class="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-medium text-xs">Sasaran 80%</span>
              </div>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Peratus amalan dipenuhi berbanding dijangka, setiap minggu.</p>
            </div>
            <div class="my-space-md overflow-x-auto">${weeklyChartHtml(weekly)}</div>
          </div>

          <div class="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Momentum Harian (${heatmap.length} Hari)</h2>
              <p class="font-body-sm text-body-sm text-on-surface-variant mt-1 text-sm">Skor harian amalan harian, hari demi hari.</p>
              <div class="mt-space-md bg-surface-container-low p-space-md rounded-lg">
                <div class="flex items-center justify-between text-on-surface-variant font-label-sm text-[10px] mb-2 px-1">
                  <span>${escapeHtml(fmtDate(heatmap[0]?.date))}</span>
                  <span>Hari Ini</span>
                </div>
                <div class="grid grid-cols-10 gap-1.5 justify-items-center">${heatmapHtml(heatmap)}</div>
              </div>
            </div>
            <div class="flex items-center justify-between text-on-surface-variant text-[11px] pt-space-md border-t border-outline-variant/20 mt-3">
              <span>0%</span>
              <div class="flex items-center gap-1">
                <span class="w-3 h-3 rounded bg-surface-container-highest" title="0%"></span>
                <span class="w-3 h-3 rounded bg-sky-tint" title="1–59%"></span>
                <span class="w-3 h-3 rounded bg-primary-fixed-dim" title="60–79%"></span>
                <span class="w-3 h-3 rounded bg-primary-container" title="80–100%"></span>
              </div>
              <span class="font-bold text-primary-container">80–100%</span>
            </div>
          </div>
        </div>

        <!-- Per-amalan breakdown -->
        <div class="bg-surface-container-lowest p-space-md md:p-space-lg rounded-xl shadow-sm border border-outline-variant/30 mb-space-2xl">
          <div class="flex items-center justify-between mb-space-md gap-2">
            <div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold text-lg">Penyempurnaan Mengikut Amalan</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant text-sm">Pencapaian setiap amalan dalam 4 minggu terakhir</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-space-lg gap-y-space-md">${categoryHtml(byCategory)}</div>
        </div>

      </div>
    </div>`;
}

export function initAnalitikHandlers() {
  const btn = document.querySelector('[data-action="print"]');
  if (btn) /** @type {HTMLButtonElement} */ (btn).onclick = () => window.print();
}

export const analitikRoute = {
  title: `Analitik | ${APP}`,
  roles: ['member'],
  /** @param {URLSearchParams} params */
  load: (params) => {
    const w = Number(params?.get('minggu'));
    return getMyAnalytics(Number.isInteger(w) && w >= 1 && w <= 12 ? w : DEFAULT_WEEKS);
  },
  render: renderAnalitikView,
  init: initAnalitikHandlers,
};
