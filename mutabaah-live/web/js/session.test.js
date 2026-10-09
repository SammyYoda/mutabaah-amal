import { loadSession, getSession, clearSession, setSession, defaultRouteFor, roleOf } from './session.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const ME = { user: { id: 1, name: 'A', isAdmin: false, mustChangePassword: false }, usrah: { id: 1, name: 'U' }, role: 'member' };

let fetchMock;
beforeEach(() => {
  clearSession();
  fetchMock = vi.fn(async () => json(200, ME));
  vi.stubGlobal('fetch', fetchMock);
  history.replaceState(null, '', '#login');
});
afterEach(() => vi.unstubAllGlobals());

describe('session', () => {
  it('caches /auth/me', async () => {
    await expect(loadSession()).resolves.toEqual(ME);
    await loadSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSession()).toEqual(ME);
  });

  it('force refetches', async () => {
    await loadSession();
    await loadSession(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on 401 and remembers being logged out until cleared', async () => {
    fetchMock.mockResolvedValue(json(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }));
    await expect(loadSession()).resolves.toBeNull();
    await loadSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clearSession();
    await loadSession();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws non-401 errors', async () => {
    fetchMock.mockResolvedValue(json(500, { error: { code: 'INTERNAL', message: 'Ralat' } }));
    await expect(loadSession()).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('setSession stores a Me payload without fetching', async () => {
    setSession(ME);
    await expect(loadSession()).resolves.toEqual(ME);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('defaultRouteFor / roleOf', () => {
    expect(defaultRouteFor(null)).toBe('login');
    expect(defaultRouteFor(ME)).toBe('hari-ini');
    expect(defaultRouteFor({ ...ME, role: 'naqib' })).toBe('ringkasan');
    const admin = { user: { ...ME.user, isAdmin: true }, usrah: null, role: null };
    expect(roleOf(admin)).toBe('admin');
    expect(defaultRouteFor(admin)).toBe('admin');
    expect(defaultRouteFor({ ...ME, user: { ...ME.user, mustChangePassword: true } })).toBe('tukar-kata-laluan');
  });
});
