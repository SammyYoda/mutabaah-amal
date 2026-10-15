import { clampPct, linePoints, linePath, areaPath, barLayout, heatClass, levelBadgeClass, levelTextClass } from './charts.js';

const GEOM = { width: 500, height: 180, top: 10, bottom: 20, left: 30, right: 10 };
const noNaN = (s) => expect(String(s)).not.toMatch(/NaN|Infinity|undefined/);

describe('chart helpers', () => {
  it('clampPct keeps 0..100 and maps junk to 0', () => {
    expect([clampPct(-5), clampPct(0), clampPct(55.5), clampPct(100), clampPct(140), clampPct(null), clampPct('x')]).toEqual([0, 0, 55.5, 100, 100, 0, 0]);
  });

  it('linePoints maps 0 to the baseline and 100 to the top', () => {
    const pts = linePoints([0, 100], GEOM);
    expect(pts[0]).toEqual({ x: 30, y: 160, value: 0 });
    expect(pts[1]).toEqual({ x: 490, y: 10, value: 100 });
  });

  it('a single point sits in the middle with no NaN', () => {
    const pts = linePoints([50], GEOM);
    expect(pts).toEqual([{ x: 260, y: 85, value: 50 }]);
    noNaN(linePath(pts));
    noNaN(areaPath(pts, GEOM));
  });

  it('empty series → empty paths', () => {
    expect(linePath(linePoints([], GEOM))).toBe('');
    expect(areaPath([], GEOM)).toBe('');
  });

  it('paths are generated from the data', () => {
    const pts = linePoints([0, 50, 100], GEOM);
    expect(linePath(pts)).toBe('M 30,160 L 260,85 L 490,10');
    expect(areaPath(pts, GEOM)).toBe('M 30,160 L 260,85 L 490,10 L 490,160 L 30,160 Z');
  });

  it('barLayout handles 0, 100 and one bar', () => {
    const bars = barLayout([0, 100], GEOM);
    expect(bars[0].h).toBe(0);
    expect(bars[0].y).toBe(160);
    expect(bars[1].h).toBe(150);
    expect(bars[1].y).toBe(10);
    const one = barLayout([42], GEOM);
    expect(one).toHaveLength(1);
    for (const b of [...bars, ...one]) for (const v of Object.values(b)) expect(Number.isFinite(v)).toBe(true);
  });

  it('heat bands and level classes', () => {
    expect(heatClass(0)).toBe('bg-surface-container-highest');
    expect(heatClass(30)).toBe('bg-sky-tint');
    expect(heatClass(60)).toBe('bg-primary-fixed-dim');
    expect(heatClass(80)).toBe('bg-primary-container');
    expect(levelBadgeClass('A')).toContain('success-amal');
    expect(levelBadgeClass('B')).toContain('orange-vibrant');
    expect(levelBadgeClass('C')).toContain('error');
    expect(levelBadgeClass(null)).toContain('surface-container');
    expect(levelTextClass(null)).toBe('text-on-surface-variant');
  });
});
