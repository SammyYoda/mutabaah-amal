import { AppRouter, LEAVE_HOOK_TIMEOUT_MS } from './app.js';
import { clearSession } from './session.js';

const MEMBER = {
  user: { id: 2, name: 'Ali Ujian', email: 'faiz@usrah.my', phone: null, isAdmin: false, mustChangePassword: false },
  usrah: { id: 1, name: 'Usrah An-Nur', naqibName: 'Naqib Ujian' },
  role: 'member',
};
const NAQIB = { ...MEMBER, user: { ...MEMBER.user, id: 1, name: 'Naqib Ujian' }, role: 'naqib' };
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
    if (url === '/api/amalan') return json(200, []);
    if (url.startsWith('/api/logs?')) return json(200, { logs: [], today: '2026-10-09', editableFrom: '2026-10-01' });
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

  it('#hari-ini renders the real Hari Ini view (no placeholder)', async () => {
    mockApi(MEMBER);
    history.replaceState(null, '', '#hari-ini');
    await new AppRouter().handleRoute();
    expect(main().textContent).not.toContain('Sedang dinaik taraf');
    expect(main().querySelector('#save-pill')).not.toBeNull();
    expect(main().textContent).toContain('Tiada amalan aktif untuk tarikh ini.');
  });

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])('#%s (inherited property) → default route', async (name) => {
    mockApi(MEMBER);
    history.replaceState(null, '', `#${name}`);
    await new AppRouter().handleRoute();
    expect(route()).toBe('#hari-ini');
  });

  it('logged out + #constructor → login', async () => {
    mockApi(null);
    history.replaceState(null, '', '#constructor');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#login');
  });

  it('no route is a "Sedang dinaik taraf" placeholder any more', async () => {
    mockApi(MEMBER, {
      '/api/me/analytics?weeks=8': json(200, { weekly: [], heatmap: [], byCategory: [], status: { percentage: 0, level: null, label: 'Baru' } }),
    });
    history.replaceState(null, '', '#analitik');
    await new AppRouter().handleRoute();
    expect(main().textContent).not.toContain('Sedang dinaik taraf');
    expect(main().querySelector('[data-status-badge]').textContent.trim()).toBe('Baru');
  });

  it('#profil-ahli?id= for an unknown member shows "Ahli tidak dijumpai" with a retry button', async () => {
    mockApi(NAQIB, { '/api/usrah/matrix': json(200, { amalan: [], rows: [] }) });
    history.replaceState(null, '', '#profil-ahli?id=999');
    await new AppRouter().handleRoute();
    expect(route()).toBe('#profil-ahli?id=999');
    expect(main().textContent).toContain('Ahli tidak dijumpai');
    expect(main().querySelector('[data-action="retry"]')).not.toBeNull();
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

  it('an exception in render shows the "Cuba lagi" card', async () => {
    mockApi(MEMBER);
    const r = { ...probe(async () => ({ text: 'x' })), render: () => { throw new Error('<i>Rosak</i>'); } };
    history.replaceState(null, '', '#probe');
    await new AppRouter({ routes: { probe: r } }).handleRoute();
    expect(main().querySelector('[data-action="retry"]')).not.toBeNull();
    expect(main().innerHTML).toContain('&lt;i&gt;Rosak&lt;/i&gt;');
  });

  it('an exception in init shows the "Cuba lagi" card, and retry re-runs the route', async () => {
    mockApi(MEMBER);
    const init = vi.fn().mockImplementationOnce(() => { throw new Error('init gagal'); });
    const r = { ...probe(async () => ({ text: 'ok' })), init };
    history.replaceState(null, '', '#probe');
    await new AppRouter({ routes: { probe: r } }).handleRoute();
    expect(main().textContent).toContain('init gagal');
    main().querySelector('[data-action="retry"]').click();
    await vi.waitFor(() => expect(main().querySelector('#probe')?.textContent).toBe('ok'));
    expect(init).toHaveBeenCalledTimes(2);
  });

  it('a function returned by init runs (and is awaited) before the next route loads', async () => {
    mockApi(MEMBER);
    const order = [];
    let finishLeave;
    const leave = vi.fn(() => new Promise((res) => { order.push('leave'); finishLeave = () => { order.push('left'); res(); }; }));
    const a = { ...probe(async () => ({ text: 'a' })), init: () => leave };
    const b = { ...probe(async () => { order.push('load b'); return { text: 'b' }; }), init: vi.fn() };
    const router = new AppRouter({ routes: { a, b } });
    history.replaceState(null, '', '#a');
    await router.handleRoute();
    history.replaceState(null, '', '#b');
    const nav = router.handleRoute();
    await vi.waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
    expect(order).toEqual(['leave']);
    finishLeave();
    await nav;
    expect(order).toEqual(['leave', 'left', 'load b']);
    expect(main().querySelector('#probe').textContent).toBe('b');
    history.replaceState(null, '', '#a');
    await router.handleRoute();
    expect(leave).toHaveBeenCalledTimes(1); // b returned no hook; a's hook ran only once
  });

  it('a leave hook still pending after LEAVE_HOOK_TIMEOUT_MS is abandoned: navigation proceeds with the failure toast', async () => {
    expect(LEAVE_HOOK_TIMEOUT_MS).toBe(5000);
    vi.useFakeTimers();
    try {
      mockApi(MEMBER);
      window.showToast = vi.fn();
      let finish;
      const hook = vi.fn(() => new Promise((res) => (finish = res)));
      const a = { ...probe(async () => ({ text: 'a' })), init: () => hook };
      const b = probe(async () => ({ text: 'b' }));
      const router = new AppRouter({ routes: { a, b } });
      history.replaceState(null, '', '#a');
      await router.handleRoute();
      history.replaceState(null, '', '#b');
      const nav = router.handleRoute();
      await vi.advanceTimersByTimeAsync(LEAVE_HOOK_TIMEOUT_MS - 1);
      expect(main().querySelector('#probe').textContent).toBe('a');
      expect(window.showToast).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await nav;
      expect(main().querySelector('#probe').textContent).toBe('b');
      expect(window.showToast).toHaveBeenCalledWith('Gagal disimpan — cuba lagi', 'error');
      expect(hook.mock.calls[0][0]).toEqual({ timedOut: true });
      finish(); // the late result neither throws nor re-renders
      await vi.advanceTimersByTimeAsync(10);
      expect(main().querySelector('#probe').textContent).toBe('b');
      expect(window.showToast).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a rejecting leave hook does not block navigation', async () => {
    mockApi(MEMBER);
    const a = { ...probe(async () => ({ text: 'a' })), init: () => async () => { throw new Error('x'); } };
    const b = probe(async () => ({ text: 'b' }));
    const router = new AppRouter({ routes: { a, b } });
    history.replaceState(null, '', '#a');
    await router.handleRoute();
    history.replaceState(null, '', '#b');
    await router.handleRoute();
    expect(main().querySelector('#probe').textContent).toBe('b');
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

describe('AppRouter logout with pending Hari Ini edits', () => {
  it('flushes the pending save while still logged in, before calling logout, with no failure toast', async () => {
    window.showToast = vi.fn();
    const calls = [];
    let loggedOut = false;
    const amalan = [{ id: 1, code: '01', name: 'Tilawah', description: '', freq: 'harian', inputType: 'count', targetVal: 5, unit: 'm/s', icon: 'menu_book', sort: 0, active: true, createdOn: '2026-01-01', deactivatedOn: null }];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const method = opts.method ?? 'GET';
      if (method !== 'GET') calls.push(`${method} ${url}`);
      if (url === '/api/auth/me') return loggedOut ? json(401, { error: { code: 'UNAUTHENTICATED', message: 'Sila log masuk' } }) : json(200, MEMBER);
      if (loggedOut && url !== '/api/auth/logout') return json(401, { error: { code: 'UNAUTHENTICATED', message: 'Sila log masuk' } });
      if (url === '/api/notifications') return json(200, []);
      if (url === '/api/amalan') return json(200, amalan);
      if (url.startsWith('/api/logs?')) return json(200, { logs: [], today: '2026-10-09', editableFrom: '2026-10-01' });
      if (url === '/api/logs/2026-10-09' && method === 'PUT') {
        const body = JSON.parse(opts.body);
        return json(200, { date: '2026-10-09', values: body.values ?? {}, notes: body.notes ?? null, updatedAt: '2026-10-09T01:00:00Z' });
      }
      if (url === '/api/auth/logout') { loggedOut = true; return json(200, { ok: true }); }
      return json(404, { error: { code: 'NOT_FOUND', message: 'x' } });
    }));
    history.replaceState(null, '', '#hari-ini');
    const router = new AppRouter();
    await router.handleRoute();
    main().querySelector('[data-action="stepper"][data-key="1"][data-delta="1"]').click(); // pending (debounced)
    await router.logout();
    await vi.waitFor(() => expect(route()).toBe('#login'));
    expect(calls).toEqual(['PUT /api/logs/2026-10-09', 'POST /api/auth/logout']);
    const put = fetch.mock.calls.find(([u, o]) => u === '/api/logs/2026-10-09' && o.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ values: { 1: 1 } });
    expect(window.showToast).not.toHaveBeenCalledWith('Gagal disimpan — cuba lagi', 'error');
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
    expect(header().textContent).toContain('Hanya anda & Naqib (Naqib Ujian)');
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
