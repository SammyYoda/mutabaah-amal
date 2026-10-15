import { escapeHtml } from './util.js';

describe('escapeHtml', () => {
  it('escapes & < > " and \'', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>A & B</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;A &amp; B&lt;/a&gt;',
    );
  });

  it('escapes & first so entities are not double-decoded', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('returns an empty string for null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('stringifies numbers and booleans', () => {
    expect(escapeHtml(0)).toBe('0');
    expect(escapeHtml(42.5)).toBe('42.5');
    expect(escapeHtml(false)).toBe('false');
  });

  it('leaves plain Malay text unchanged', () => {
    expect(escapeHtml("Usrah An-Nur — Mutaba'ah")).toBe('Usrah An-Nur — Mutaba&#39;ah');
    expect(escapeHtml('Ali Ujian')).toBe('Ali Ujian');
  });

  it('is safe in an attribute position', () => {
    const div = document.createElement('div');
    div.innerHTML = `<input value="${escapeHtml('"><img src=x onerror=alert(1)>')}">`;
    expect(div.querySelector('img')).toBeNull();
    expect(div.querySelector('input').value).toBe('"><img src=x onerror=alert(1)>');
  });
});
