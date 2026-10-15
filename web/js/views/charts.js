/**
 * Chart + status-band helpers shared by Ringkasan, Matriks, Profil Ahli and Analitik.
 * All geometry is computed from data (percentages 0–100); nothing here produces NaN for
 * empty, single-point or out-of-range series.
 */

/**
 * @typedef {{ width: number, height: number, top: number, bottom: number, left: number, right: number }} Geom
 */

/** Coerces to a finite number in [0, 100]; junk → 0. */
export function clampPct(p) {
  const n = typeof p === 'number' ? p : Number(p);
  if (p === null || p === undefined || p === '' || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

const r1 = (n) => Math.round(n * 10) / 10;

/** y coordinate of a percentage inside the plot area. @param {number} pct @param {Geom} g */
export function yFor(pct, g) {
  const plotH = g.height - g.top - g.bottom;
  return r1(g.top + (1 - clampPct(pct) / 100) * plotH);
}

/** Baseline (0%) y. @param {Geom} g */
export const baseline = (g) => g.height - g.bottom;

/**
 * Points for a line chart; one point sits in the horizontal middle.
 * @param {number[]} values @param {Geom} g
 * @returns {{x:number,y:number,value:number}[]}
 */
export function linePoints(values, g) {
  const n = values.length;
  const plotW = g.width - g.left - g.right;
  return values.map((v, i) => ({
    x: r1(n === 1 ? g.left + plotW / 2 : g.left + (i * plotW) / (n - 1)),
    y: yFor(v, g),
    value: clampPct(v),
  }));
}

/** SVG path "M x,y L x,y …" through the points ('' when empty). */
export function linePath(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
}

/** Closed area under the line down to the 0% baseline ('' when empty). @param {Geom} g */
export function areaPath(points, g) {
  if (!points.length) return '';
  const b = baseline(g);
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x},${b} L ${points[0].x},${b} Z`;
}

/**
 * Vertical bars, one per value, centred in equal slots.
 * @param {number[]} values @param {Geom} g
 * @returns {{x:number,y:number,w:number,h:number,cx:number,value:number}[]}
 */
export function barLayout(values, g) {
  const n = values.length;
  if (!n) return [];
  const plotW = g.width - g.left - g.right;
  const plotH = g.height - g.top - g.bottom;
  const slot = plotW / n;
  const w = r1(Math.min(slot * 0.6, 48));
  return values.map((v, i) => {
    const value = clampPct(v);
    const h = r1((value / 100) * plotH);
    const x = r1(g.left + i * slot + (slot - w) / 2);
    return { x, y: r1(baseline(g) - h), w, h, cx: r1(x + w / 2), value };
  });
}

/** Heatmap cell colour by percentage band (same bands as the legend). */
export function heatClass(p) {
  const v = clampPct(p);
  if (v >= 80) return 'bg-primary-container';
  if (v >= 60) return 'bg-primary-fixed-dim';
  if (v > 0) return 'bg-sky-tint';
  return 'bg-surface-container-highest';
}

/** Badge classes for a status level: A success, B warning, C error, null ("Baru") neutral. */
export function levelBadgeClass(level) {
  if (level === 'A') return 'bg-success-surface text-success-amal border-success-amal/30';
  if (level === 'B') return 'bg-orange-surface text-orange-vibrant border-orange-vibrant/30';
  if (level === 'C') return 'bg-error-container text-error border-error/30';
  return 'bg-surface-container text-on-surface-variant border-outline-variant/40';
}

/** Text colour for a level (null → neutral). */
export function levelTextClass(level) {
  if (level === 'A') return 'text-success-amal';
  if (level === 'B') return 'text-orange-vibrant';
  if (level === 'C') return 'text-error';
  return 'text-on-surface-variant';
}

/** Status band of a percentage (global constraints): ≥80 A, 60–79 B, <60 C. */
export function bandOf(p) {
  const v = clampPct(p);
  return v >= 80 ? 'A' : v >= 60 ? 'B' : 'C';
}

/** Short label for an ISO week key ('2026-W41' → 'M41'); falls back to the key itself. */
export function weekLabel(week) {
  const m = /-W(\d{1,2})$/.exec(String(week ?? ''));
  return m ? `M${Number(m[1])}` : String(week ?? '');
}
