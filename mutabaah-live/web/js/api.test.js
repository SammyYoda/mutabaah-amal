import { request, ApiError, login, signup, logout, saveLog, getLogs, markNotificationsRead, adminNaqibInvite } from './api.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  window.location.hash = '#hari-ini';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('sends same-origin credentials and JSON headers, prefixing /api', async () => {
    await request('POST', '/auth/login', { email: 'a@b.my', password: 'x' });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/login');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('same-origin');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers.Accept).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ email: 'a@b.my', password: 'x' });
  });

  it('sends {} for a mutating request without a body', async () => {
    await request('POST', '/auth/logout');
    expect(fetchMock.mock.calls[0][1].body).toBe('{}');
  });

  it('sends no body for GET', async () => {
    await request('GET', '/amalan');
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('returns the parsed JSON body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, [{ id: 1 }]));
    await expect(request('GET', '/amalan')).resolves.toEqual([{ id: 1 }]);
  });

  it('returns null for 204', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: async () => { throw new Error('no body'); } });
    await expect(request('POST', '/notifications/read-all')).resolves.toBeNull();
  });

  it('turns a 400 error body into an ApiError with status, code, message and fields', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'Kod jemputan tidak sah', fields: { inviteCode: 'Kod jemputan tidak sah' } } }),
    );
    const err = await request('POST', '/auth/signup', {}).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Kod jemputan tidak sah');
    expect(err.fields).toEqual({ inviteCode: 'Kod jemputan tidak sah' });
    expect(window.location.hash).toBe('#hari-ini');
  });

  it('uses a Malay fallback when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad'); } });
    const err = await request('GET', '/amalan').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.code).toBe('INTERNAL');
    expect(err.message).toMatch(/cuba lagi/i);
  });

  it('wraps a network failure in an ApiError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const err = await request('GET', '/amalan').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK');
    expect(err.status).toBe(0);
  });

  it('a 401 sets location.hash to #login', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Sila log masuk' } }));
    await expect(request('GET', '/logs')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(window.location.hash).toBe('#login');
  });

  it('a 401 does not redirect when already on login or daftar', async () => {
    window.location.hash = '#daftar?kod=ABC-2345';
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'x' } }));
    await request('GET', '/auth/me').catch(() => {});
    expect(window.location.hash).toBe('#daftar?kod=ABC-2345');

    window.location.hash = '#login';
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'Emel atau kata laluan salah' } }));
    const err = await request('POST', '/auth/login', {}).catch((e) => e);
    expect(err.message).toBe('Emel atau kata laluan salah');
    expect(window.location.hash).toBe('#login');
  });

  it('a 403 PASSWORD_CHANGE_REQUIRED sets #tukar-kata-laluan', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Sila tukar kata laluan' } }));
    await expect(request('GET', '/logs')).rejects.toMatchObject({ status: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
    expect(window.location.hash).toBe('#tukar-kata-laluan');
  });

  it('a plain 403 FORBIDDEN does not redirect', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: { code: 'FORBIDDEN', message: 'Anda bukan lagi ahli' } }));
    await expect(request('POST', '/auth/login', {})).rejects.toMatchObject({ code: 'FORBIDDEN', message: 'Anda bukan lagi ahli' });
    expect(window.location.hash).toBe('#hari-ini');
  });
});

describe('endpoint functions', () => {
  const call = () => {
    const [url, opts] = fetchMock.mock.calls.at(-1);
    return { url, method: opts.method, body: opts.body === undefined ? undefined : JSON.parse(opts.body) };
  };

  it('login posts email and password', async () => {
    await login('a@b.my', 'rahsia123');
    expect(call()).toEqual({ url: '/api/auth/login', method: 'POST', body: { email: 'a@b.my', password: 'rahsia123' } });
  });

  it('signup posts the payload', async () => {
    await signup({ name: 'A', email: 'a@b.my', password: 'rahsia123', inviteCode: 'ABC-2345' });
    expect(call()).toMatchObject({ url: '/api/auth/signup', method: 'POST', body: { inviteCode: 'ABC-2345' } });
  });

  it('logout posts {}', async () => {
    await logout();
    expect(call()).toEqual({ url: '/api/auth/logout', method: 'POST', body: {} });
  });

  it('getLogs builds the query string', async () => {
    await getLogs('2026-10-01', '2026-10-09');
    expect(call()).toEqual({ url: '/api/logs?from=2026-10-01&to=2026-10-09', method: 'GET', body: undefined });
  });

  it('saveLog PUTs values and notes', async () => {
    await saveLog('2026-10-09', { values: { 3: 1 }, notes: 'ok' });
    expect(call()).toEqual({ url: '/api/logs/2026-10-09', method: 'PUT', body: { values: { 3: 1 }, notes: 'ok' } });
  });

  it('markNotificationsRead posts to read-all', async () => {
    await markNotificationsRead();
    expect(call()).toMatchObject({ url: '/api/notifications/read-all', method: 'POST' });
  });

  it('adminNaqibInvite posts to the usrah invite endpoint', async () => {
    await adminNaqibInvite(7);
    expect(call()).toMatchObject({ url: '/api/admin/usrah/7/naqib-invite', method: 'POST' });
  });
});
