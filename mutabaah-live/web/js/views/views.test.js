import { daftarRoute, validateSignup } from './daftar.js';
import { loginRoute } from './login.js';
import { adminRoute, renderAdminView } from './admin.js';
import { tukarKataLaluanRoute } from './tukarKataLaluan.js';
import { clearSession, setSession } from '../session.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const flush = () => new Promise((r) => setTimeout(r, 0));

function mount(route, data) {
  document.body.innerHTML = `<main id="app-main">${route.render(data)}</main>`;
  route.init?.(data);
}

let fetchMock;
beforeEach(() => {
  clearSession();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  window.showToast = vi.fn();
  history.replaceState(null, '', '#');
});
afterEach(() => vi.unstubAllGlobals());

describe('login view', () => {
  it('has no prefilled credentials, no role picker and links to #daftar', () => {
    mount(loginRoute);
    expect(document.getElementById('emailInput').value).toBe('');
    expect(document.getElementById('passwordInput').value).toBe('');
    expect(document.getElementById('role-btn-member')).toBeNull();
    expect(document.querySelector('a[href="#daftar"]')).not.toBeNull();
  });

  it('shows the API message inline on failure (e.g. removed member 403)', async () => {
    history.replaceState(null, '', '#login');
    mount(loginRoute);
    fetchMock.mockResolvedValue(json(403, { error: { code: 'FORBIDDEN', message: 'Anda bukan lagi ahli mana-mana usrah.' } }));
    document.getElementById('emailInput').value = 'a@b.my';
    document.getElementById('passwordInput').value = 'katalaluan123';
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(document.getElementById('loginError').textContent).toBe('Anda bukan lagi ahli mana-mana usrah.'));
    expect(document.getElementById('loginError').classList.contains('hidden')).toBe(false);
  });

  it('on success stores the session and goes to the default route', async () => {
    mount(loginRoute);
    fetchMock.mockResolvedValue(json(200, {
      user: { id: 1, name: 'Naqib', email: 'n@b.my', phone: null, isAdmin: false, mustChangePassword: false },
      usrah: { id: 1, name: 'U', naqibName: 'Naqib' }, role: 'naqib',
    }));
    document.getElementById('emailInput').value = 'n@b.my';
    document.getElementById('passwordInput').value = 'katalaluan123';
    document.getElementById('loginForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#ringkasan'));
  });
});

describe('daftar view', () => {
  it('prefills the invite code from ?kod= (escaped)', async () => {
    const data = await daftarRoute.load(new URLSearchParams('kod=ABC-2345"><b>x'));
    mount(daftarRoute, data);
    expect(document.querySelector('input[name="inviteCode"]').value).toBe('ABC-2345"><b>x');
    expect(document.querySelector('main b')).toBeNull();
  });

  it('hides the code input and shows "Jemputan Naqib" for ?jemputan=', async () => {
    mount(daftarRoute, await daftarRoute.load(new URLSearchParams('jemputan=tok123')));
    expect(document.querySelector('input[name="inviteCode"]')).toBeNull();
    expect(document.querySelector('[data-jemputan-naqib]').textContent).toContain('Jemputan Naqib');
  });

  it('validates matching emails, matching passwords and length', () => {
    const base = { name: 'A', email: 'a@b.my', confirmEmail: 'A@B.my', phone: '', password: 'katalaluan', confirmPassword: 'katalaluan', inviteCode: 'ABC-2345' };
    expect(validateSignup(base, { needsCode: true })).toEqual({});
    expect(validateSignup({ ...base, confirmEmail: 'x@b.my' }, { needsCode: true })).toHaveProperty('confirmEmail');
    expect(validateSignup({ ...base, confirmPassword: 'lain12345' }, { needsCode: true })).toHaveProperty('confirmPassword');
    expect(validateSignup({ ...base, password: 'pendek', confirmPassword: 'pendek' }, { needsCode: true })).toHaveProperty('password');
    expect(validateSignup({ ...base, inviteCode: '' }, { needsCode: true })).toHaveProperty('inviteCode');
    expect(validateSignup({ ...base, inviteCode: '' }, { needsCode: false })).toEqual({});
  });

  function fill(values) {
    const form = document.getElementById('daftarForm');
    for (const [k, v] of Object.entries(values)) form.elements.namedItem(k).value = v;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
  }
  const valid = { name: 'Ali', email: 'ali@b.my', confirmEmail: 'ali@b.my', password: 'katalaluan', confirmPassword: 'katalaluan' };

  it('does not call the API when client checks fail', async () => {
    mount(daftarRoute, { kod: 'ABC-2345', jemputan: '' });
    fill({ ...valid, confirmPassword: 'berbeza123' });
    await flush();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector('[data-field-error="confirmPassword"]').textContent).toBe('Kata laluan tidak sepadan.');
  });

  it('shows the server message and maps fields to inputs', async () => {
    history.replaceState(null, '', '#daftar?kod=ABC-2345');
    mount(daftarRoute, { kod: 'ABC-2345', jemputan: '' });
    fetchMock.mockResolvedValue(json(400, { error: { code: 'VALIDATION_ERROR', message: 'Kod jemputan tidak sah', fields: { inviteCode: 'Kod jemputan tidak sah' } } }));
    fill(valid);
    await vi.waitFor(() => expect(document.getElementById('daftarError').textContent).toBe('Kod jemputan tidak sah'));
    expect(document.querySelector('[data-field-error="inviteCode"]').textContent).toBe('Kod jemputan tidak sah');
  });

  it('sends naqibInvite for a naqib invite, then loads the session and goes to the default route', async () => {
    const me = {
      user: { id: 3, name: 'Ali', email: 'ali@b.my', phone: null, isAdmin: false, mustChangePassword: false },
      usrah: { id: 1, name: 'U', naqibName: 'Ali' }, role: 'naqib',
    };
    fetchMock.mockImplementation(async (url) => json(url === '/api/auth/signup' ? 201 : 200, me));
    mount(daftarRoute, { kod: '', jemputan: 'tok123' });
    fill(valid);
    await vi.waitFor(() => expect(window.location.hash).toBe('#ringkasan'));
    const body = JSON.parse(fetchMock.mock.calls.find(([u]) => u === '/api/auth/signup')[1].body);
    expect(body).toEqual({ name: 'Ali', email: 'ali@b.my', password: 'katalaluan', naqibInvite: 'tok123' });
    expect(fetchMock.mock.calls.some(([u]) => u === '/api/auth/me')).toBe(true);
  });
});

describe('tukar kata laluan view', () => {
  it('changes the password, reloads the session and goes to the default route', async () => {
    setSession({ user: { id: 2, name: 'A', isAdmin: false, mustChangePassword: true }, usrah: { id: 1, name: 'U' }, role: 'member' });
    mount(tukarKataLaluanRoute, {});
    fetchMock.mockImplementation(async (url) =>
      url === '/api/auth/me'
        ? json(200, { user: { id: 2, name: 'A', isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'U' }, role: 'member' })
        : json(200, { ok: true }),
    );
    const form = document.getElementById('tukarForm');
    form.elements.namedItem('currentPassword').value = 'sementara1';
    form.elements.namedItem('newPassword').value = 'baharu1234';
    form.elements.namedItem('confirmPassword').value = 'baharu1234';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(window.location.hash).toBe('#hari-ini'));
    const call = fetchMock.mock.calls.find(([u]) => u === '/api/auth/change-password');
    expect(JSON.parse(call[1].body)).toEqual({ currentPassword: 'sementara1', newPassword: 'baharu1234' });
  });
});

describe('admin view', () => {
  const list = [{ id: 4, name: 'Usrah <i>X</i>', inviteCode: 'ABC-2345', memberCount: 3, naqibName: null }];

  it('lists usrah with code, member count and naqib, escaping names', () => {
    mount(adminRoute, list);
    const row = document.querySelector('[data-usrah-row="4"]');
    expect(row.textContent).toContain('Usrah <i>X</i>');
    expect(row.querySelector('i')).toBeNull();
    expect(row.textContent).toContain('ABC-2345');
    expect(row.textContent).toContain('3');
    expect(row.textContent).toContain('Belum ada');
  });

  it('shows an empty state', () => {
    document.body.innerHTML = renderAdminView([]);
    expect(document.body.textContent).toContain('Belum ada usrah');
  });

  it('"Jemput Naqib" shows the link with a copy button', async () => {
    mount(adminRoute, list);
    fetchMock.mockResolvedValue(json(201, { link: 'http://localhost:3000/#daftar?jemputan=tok"x', expiresAt: '2026-10-16T02:00:00.000Z' }));
    document.querySelector('[data-invite="4"]').click();
    await vi.waitFor(() => expect(document.querySelector('[data-invite-link]')).not.toBeNull());
    expect(document.querySelector('[data-invite-link]').value).toBe('http://localhost:3000/#daftar?jemputan=tok"x');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/usrah/4/naqib-invite');

    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('isSecureContext', true);
    document.querySelector('[data-copy]').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('http://localhost:3000/#daftar?jemputan=tok"x'));
  });

  it('create form posts the name then re-renders via the router', async () => {
    mount(adminRoute, list);
    window.router = { renderCurrent: vi.fn(async () => {}) };
    fetchMock.mockResolvedValue(json(201, { id: 5, name: 'Usrah Baru', inviteCode: 'DEF-3456' }));
    document.getElementById('usrahName').value = 'Usrah Baru';
    document.getElementById('createUsrahForm').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(window.router.renderCurrent).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ name: 'Usrah Baru' });
    delete window.router;
  });
});
