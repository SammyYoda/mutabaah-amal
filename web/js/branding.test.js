import { getBranding, loadBranding, brandTitle, resetBranding } from './branding.js';
import { AppRouter } from './app.js';
import { renderLoginView } from './views/login.js';
import { clearSession } from './session.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const stubConfig = (body) => vi.stubGlobal('fetch', vi.fn(async () => json(200, body)));

beforeEach(() => resetBranding());
afterEach(() => vi.unstubAllGlobals());

describe('branding state', () => {
  it('returns defaults before load', () => {
    expect(getBranding()).toEqual({ appName: "Mutaba'ah Amal", orgName: null });
  });

  it('loadBranding stores the server config', async () => {
    stubConfig({ appName: 'Amal Kita', orgName: 'Masjid X' });
    await loadBranding();
    expect(getBranding()).toEqual({ appName: 'Amal Kita', orgName: 'Masjid X' });
  });

  it('keeps defaults when fetch rejects or returns 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    await expect(loadBranding()).resolves.toBeUndefined();
    expect(getBranding().appName).toBe("Mutaba'ah Amal");
    vi.stubGlobal('fetch', vi.fn(async () => json(500, { error: { code: 'INTERNAL', message: 'x' } })));
    await expect(loadBranding()).resolves.toBeUndefined();
    expect(getBranding()).toEqual({ appName: "Mutaba'ah Amal", orgName: null });
  });

  it('brandTitle swaps the app name in route titles', async () => {
    stubConfig({ appName: 'Amal Kita', orgName: null });
    await loadBranding();
    expect(brandTitle("Log Masuk | Mutaba'ah Amal")).toBe('Log Masuk | Amal Kita');
  });
});

describe('branding rendering', () => {
  const ME = {
    user: { id: 2, name: 'Ali', email: 'a@b.my', phone: null, isAdmin: false, mustChangePassword: false },
    usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Naqib Ujian' },
    role: 'member',
  };
  const BAD = ['IKRAM', '•', 'undefined', 'null'];

  async function renderAll() {
    document.body.innerHTML = `
      <header id="app-header"></header><main id="app-main"></main><nav id="app-mobile-nav"></nav>
      <footer><span id="footer-app"></span><span id="footer-naqib-sep"></span><span id="footer-naqib"></span></footer>`;
    clearSession();
    vi.stubGlobal('fetch', vi.fn(async (url) => (url === '/api/notifications' ? json(200, []) : json(404, {}))));
    const r = new AppRouter();
    r.me = ME;
    r.renderChrome('hari-ini', ME);
    r.renderFooter();
    document.getElementById('app-main').innerHTML = renderLoginView();
  }

  it('orgName null leaves no org text, separator or placeholder', async () => {
    stubConfig({ appName: 'Amal Kita', orgName: null });
    await loadBranding();
    await renderAll();
    const footer = document.getElementById('footer-app').textContent;
    expect(footer).toContain('Amal Kita');
    for (const bad of BAD) {
      expect(document.getElementById('app-header').textContent).not.toContain(bad);
      expect(document.getElementById('app-main').textContent).not.toContain(bad);
      expect(footer).not.toContain(bad);
    }
    expect(document.getElementById('app-header').textContent).toContain('Amal Kita');
    expect(document.getElementById('auth-org-badge')).toBeNull();
  });

  it('orgName shows in login badge and footer', async () => {
    stubConfig({ appName: 'Amal Kita', orgName: 'Masjid X' });
    await loadBranding();
    await renderAll();
    expect(document.getElementById('auth-org-badge').textContent).toContain('Masjid X');
    expect(document.getElementById('footer-app').textContent).toContain('Masjid X');
  });

  it('escapes the app name (no injected elements)', async () => {
    stubConfig({ appName: '<img src=x onerror=alert(1)>', orgName: '<img src=y>' });
    await loadBranding();
    await renderAll();
    expect(document.querySelector('img')).toBeNull();
    expect(document.getElementById('app-header').textContent).toContain('<img src=x');
    expect(document.getElementById('footer-app').textContent).toContain('<img src=x');
  });
});
