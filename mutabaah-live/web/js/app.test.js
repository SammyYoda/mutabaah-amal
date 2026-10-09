import { AppRouter } from './app.js';
import { clearSession } from './session.js';

const MEMBER = {
  user: { id: 2, name: 'Ahmad Faiz', email: 'faiz@usrah.my', phone: null, isAdmin: false, mustChangePassword: false },
  usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Ustaz Hazwan' },
  role: 'member',
};
const NAQIB = { ...MEMBER, user: { ...MEMBER.user, id: 1, name: 'Ustaz Hazwan' }, role: 'naqib' };
const ADMIN = {
  user: { id: 9, name: 'Pentadbir Utama', email: 'admin@usrah.my', phone: null, isAdmin: true, mustChangePassword: false },
  usrah: null,
  role: null,
};

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

/** fetch mock: `me` is the /auth/me payload (null → 401); `extra` maps "/api/path" → response or function. */
function mockApi(me, extra = {}) {
  const fetchMock = vi.fn(async (url) => {
    if (url in extra) return typeof extra[url] === 'function' ? extra[url]() : extra[url];
    if (url === '/api/auth/me') return me ? json(200, me) : json(401, { error: { code: 'UNAUTHENTICATED', message: 'Sila log masuk' } });
    if (url === '/api/notifications') return json(200, []);
    if (url === '/api/admin/usrah') return json(200, []);
    return json(404, { error: { code: 'NOT_FOUND', message: 'Tidak dijumpai' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const main = () => document.getElementById('app-main');
const header = () => document.getElementById('app-header');
const route = () => window.location.hash;

beforeEach(() => {
  document.body.innerHTML = `
    <header id="app-header"></header><main id="app-main"></main>
    <nav id="app-mobile-nav"></nav><div id="toast-container"></div>`;
  clearSession();
  history.replaceState(null, '', '#');
  window.scrollTo = vi.fn(); // not implemented in jsdom
});
afterEach(() => vi.unstubAllGlobals());

describe('AppRouter role routing', () => {
  it('logged out + #hari-ini → renders login', async () => {
    mockApi(null);
    history.replaceState(null, '', '#hari-ini');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#login');
    expect(main().querySelector('#loginForm')).not.toBeNull();
    expect(header().innerHTML).toBe('');
  });

  it('logged out may open #daftar with its params', async () => {
    mockApi(null);
    history.replaceState(null, '', '#daftar?kod=ABC-2345');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#daftar?kod=ABC-2345');
    expect(main().querySelector('#daftarForm')).not.toBeNull();
    expect(main().querySelector('input[name="inviteCode"]').value).toBe('ABC-2345');
  });

  it('member + #ringkasan → redirected to #hari-ini', async () => {
    mockApi(MEMBER);
    history.replaceState(null, '', '#ringkasan');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#hari-ini');
  });

  it('naqib + #hari-ini → #ringkasan', async () => {
    mockApi(NAQIB);
    history.replaceState(null, '', '#hari-ini');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#ringkasan');
  });

  it('admin + empty hash → #admin', async () => {
    mockApi(ADMIN);
    await new AppRouter().handleRoute();
    expect(route()).toBe('#admin');
    expect(main().textContent).toContain('Cipta Usrah');
  });

  it('logged-in user on #login → their default route', async () => {
    mockApi(MEMBER);
    history.replaceState(null, '', '#login');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#hari-ini');
  });

  it('unknown route → default route', async () => {
    mockApi(NAQIB);
    history.replaceState(null, '', '#tiada-laman');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#ringkasan');
  });

  it('mustChangePassword forces #tukar-kata-laluan', async () => {
    mockApi({ ...MEMBER, user: { ...MEMBER.user, mustChangePassword: true } });
    history.replaceState(null, '', '#analitik');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#tukar-kata-laluan');
    expect(main().querySelector('#tukarForm')).not.toBeNull();
  });

  it('placeholder routes render the "Sedang dinaik taraf" card', async () => {
    mockApi(MEMBER);
    history.replaceState(null, '', '#analitik');
    await new AppRouter().handleRoute();
    expect(main().textContent).toContain('Sedang dinaik taraf');
  });
});

describe('AppRouter load lifecycle', () => {
  const probe = (load) => ({
    title: 'Ujian',
    roles: ['member'],
    load,
    render: (data) => `<p id="probe">${data.text}</p>`,
    init: vi.fn(),
  });

  it('shows the skeleton while load is pending, then render + init', async () => {
    mockApi(MEMBER);
    let resolve;
    const r = probe(() => new Promise((res) => (resolve = res)));
    const router = new AppRouter({ routes: { probe: r } });
    history.replaceState(null, '', '#probe');
    const done = router.handleRoute();
    await vi.waitFor(() => expect(main().querySelector('.skeleton')).not.toBeNull());
    expect(main().querySelector('#probe')).toBeNull();
    resolve({ text: 'siap' });
    await done;
    expect(main().querySelector('.skeleton')).toBeNull();
    expect(main().querySelector('#probe').textContent).toBe('siap');
    expect(r.init).toHaveBeenCalledWith({ text: 'siap' });
  });

  it('passes hash params to load as URLSearchParams', async () => {
    mockApi(MEMBER);
    const load = vi.fn(async () => ({ text: 'x' }));
    history.replaceState(null, '', '#probe?id=5&minggu=4');
    await new AppRouter({ routes: { probe: probe(load) } }).handleRoute();
    const params = load.mock.calls[0][0];
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.get('id')).toBe('5');
    expect(params.get('minggu')).toBe('4');
  });

  it('a load rejection renders the "Cuba lagi" card, and retrying re-runs load', async () => {
    mockApi(MEMBER);
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('<b>Gagal</b> dimuatkan'))
      .mockResolvedValueOnce({ text: 'pulih' });
    const router = new AppRouter({ routes: { probe: probe(load) } });
    history.replaceState(null, '', '#probe');
    await router.handleRoute();
    const btn = [...main().querySelectorAll('button')].find((b) => b.textContent.includes('Cuba lagi'));
    expect(btn).toBeTruthy();
    expect(main().innerHTML).toContain('&lt;b&gt;Gagal&lt;/b&gt;'); // message escaped
    btn.click();
    await vi.waitFor(() => expect(main().querySelector('#probe')?.textContent).toBe('pulih'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a stale load (hash changed mid-load) does not render', async () => {
    mockApi(MEMBER);
    let resolveSlow;
    const slow = probe(() => new Promise((res) => (resolveSlow = res)));
    const fast = { ...probe(async () => ({ text: 'cepat' })), render: (d) => `<p id="fast">${d.text}</p>` };
    const router = new AppRouter({ routes: { slow, fast } });
    history.replaceState(null, '', '#slow');
    const first = router.handleRoute();
    await vi.waitFor(() => expect(resolveSlow).toBeTypeOf('function'));
    history.replaceState(null, '', '#fast');
    await router.handleRoute();
    resolveSlow({ text: 'lambat' });
    await first;
    expect(main().querySelector('#fast')).not.toBeNull();
    expect(main().querySelector('#probe')).toBeNull();
    expect(slow.init).not.toHaveBeenCalled();
  });
});

describe('AppRouter header', () => {
  it('shows name, usrah, role label and the unread count, escaped', async () => {
    mockApi(
      { ...MEMBER, user: { ...MEMBER.user, name: 'Faiz <script>' } },
      { '/api/notifications': json(200, [
        { id: 1, type: 'guidance', text: 'Bimbingan baharu', link: '#bimbingan', createdAt: '2026-10-09T01:00:00Z', read: false },
        { id: 2, type: 'guidance', text: 'Lama', link: '#bimbingan', createdAt: '2026-10-08T01:00:00Z', read: true },
      ]) },
    );
    history.replaceState(null, '', '#hari-ini');
    await new AppRouter().handleRoute();
    await vi.waitFor(() => expect(header().querySelector('[data-unread-count]')?.textContent).toBe('1'));
    expect(header().textContent).toContain('Faiz <script>');
    expect(header().innerHTML).not.toContain('<script>');
    expect(header().textContent).toContain('Usrah An-Nur');
    expect(header().textContent).toContain('Ahli Usrah');
    expect(header().textContent).toContain('Hanya anda & Naqib (Ustaz Hazwan)');
    expect(header().querySelector('#btnHeaderRoleToggle')).toBeNull();
  });

  it('admin nav shows only "Admin" and the Pentadbir label', async () => {
    mockApi(ADMIN);
    await new AppRouter().handleRoute();
    const links = [...header().querySelectorAll('nav a')].map((a) => a.textContent.trim());
    expect(links).toEqual(['Admin']);
    expect(header().textContent).toContain('Pentadbir');
  });

  it('logout calls the API, clears the session and goes to #login', async () => {
    const fetchMock = mockApi(MEMBER, { '/api/auth/logout': json(200, { ok: true }) });
    history.replaceState(null, '', '#hari-ini');
    const router = new AppRouter();
    await router.handleRoute();
    fetchMock.mockImplementation(async (url) =>
      url === '/api/auth/me' ? json(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }) : json(200, { ok: true }),
    );
    header().querySelector('#btnLogout').click();
    await vi.waitFor(() => expect(route()).toBe('#login'));
    expect(fetchMock.mock.calls.some(([url, o]) => url === '/api/auth/logout' && o.method === 'POST')).toBe(true);
  });
});
