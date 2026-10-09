/**
 * API client: one async function per /api endpoint over fetch (same-origin cookie session).
 * Every function resolves to the parsed JSON body (null for 204) or throws ApiError.
 */

export class ApiError extends Error {
  /**
   * @param {number} status HTTP status (0 for a network failure)
   * @param {string} code server error code, e.g. 'VALIDATION_ERROR'
   * @param {string} message Malay message, safe to show to users (escape it when interpolating)
   * @param {Record<string,string>} [fields] field-level messages for 400s
   */
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const NETWORK_MESSAGE = 'Tiada sambungan ke pelayan — cuba lagi.';
const FALLBACK_MESSAGE = 'Ralat pelayan — cuba lagi.';
const PUBLIC_ROUTES = new Set(['login', 'daftar']);

/** @type {Array<() => void>} */
const unauthenticatedListeners = [];

/** @type {Array<() => void>} */
const passwordChangeListeners = [];

/** Registers a callback run on every 401 (session.js uses it to drop its cached session). */
export function onUnauthenticated(fn) {
  unauthenticatedListeners.push(fn);
}

/**
 * Registers a callback run on every 403 PASSWORD_CHANGE_REQUIRED (session.js uses it to forget the cached
 * session, so the router refetches /auth/me and sees mustChangePassword).
 */
export function onPasswordChangeRequired(fn) {
  passwordChangeListeners.push(fn);
}

function currentRoute() {
  return window.location.hash.replace(/^#/, '').split('?')[0];
}

/**
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} path path under /api, e.g. '/auth/me'
 * @param {unknown} [body] JSON body; mutating requests send {} when omitted
 * @param {{ keepalive?: boolean }} [options] keepalive: let the request outlive the page (beforeunload)
 * @returns {Promise<any>}
 */
export async function request(method, path, body, options = {}) {
  /** @type {RequestInit & { headers: Record<string,string> }} */
  const opts = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (options.keepalive) opts.keepalive = true;
  if (method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body ?? {});
  }

  let res;
  try {
    res = await fetch(`/api${path}`, opts);
  } catch {
    throw new ApiError(0, 'NETWORK', NETWORK_MESSAGE);
  }
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (res.ok) return data;

  const err = data && typeof data === 'object' ? data.error : null;
  const code = typeof err?.code === 'string' ? err.code : res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL';
  const message = typeof err?.message === 'string' ? err.message : FALLBACK_MESSAGE;

  if (res.status === 401) {
    for (const fn of unauthenticatedListeners) fn();
    if (!PUBLIC_ROUTES.has(currentRoute())) window.location.hash = '#login';
  } else if (res.status === 403 && code === 'PASSWORD_CHANGE_REQUIRED') {
    for (const fn of passwordChangeListeners) fn();
    window.location.hash = '#tukar-kata-laluan';
  }
  throw new ApiError(res.status, code, message, err?.fields);
}

const q = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null)).toString();
const id = (v) => encodeURIComponent(String(v));

// --- auth ---
export const getMe = () => request('GET', '/auth/me');
export const login = (email, password) => request('POST', '/auth/login', { email, password });
/** @param {{name,email,phone?,password,inviteCode?,naqibInvite?}} payload */
export const signup = (payload) => request('POST', '/auth/signup', payload);
export const logout = () => request('POST', '/auth/logout');
export const changePassword = (currentPassword, newPassword) =>
  request('POST', '/auth/change-password', { currentPassword, newPassword });

// --- amalan & logs ---
export const getAmalan = () => request('GET', '/amalan');
export const getLogs = (from, to) => request('GET', `/logs?${q({ from, to })}`);
/** @param {{ keepalive?: boolean }} [options] */
export const saveLog = (date, { values, notes }, options) => request('PUT', `/logs/${id(date)}`, { values, notes }, options);
export const createAmalan = (a) => request('POST', '/amalan', a);
export const updateAmalan = (amalanId, patch) => request('PATCH', `/amalan/${id(amalanId)}`, patch);
export const deactivateAmalan = (amalanId) => request('DELETE', `/amalan/${id(amalanId)}`);

// --- analytics ---
export const getMyAnalytics = (weeks) => request('GET', `/me/analytics${weeks ? `?${q({ weeks })}` : ''}`);
export const getSummary = () => request('GET', '/usrah/summary');
export const getMatrix = (weeks) => request('GET', `/usrah/matrix${weeks ? `?${q({ weeks })}` : ''}`);
export const getMember = (memberId) => request('GET', `/members/${id(memberId)}`);

// --- naqib: members & invite code ---
export const resetMemberPassword = (memberId) => request('POST', `/members/${id(memberId)}/reset-password`);
export const removeMember = (memberId) => request('DELETE', `/members/${id(memberId)}`);
export const getInviteCode = () => request('GET', '/usrah/invite-code');
export const regenerateInviteCode = () => request('POST', '/usrah/invite-code/regenerate');

// --- guidance ---
export const getGuidance = () => request('GET', '/guidance');
/** @param {{toUserId: number|null, category, title, body, reference?}} g */
export const sendGuidance = (g) => request('POST', '/guidance', g);
export const replyGuidance = (guidanceId, body) => request('POST', `/guidance/${id(guidanceId)}/replies`, { body });
export const markGuidanceRead = (guidanceId) => request('POST', `/guidance/${id(guidanceId)}/read`);

// --- notifications ---
export const getNotifications = () => request('GET', '/notifications');
export const markNotificationsRead = () => request('POST', '/notifications/read-all');

// --- admin ---
export const adminListUsrah = () => request('GET', '/admin/usrah');
export const adminCreateUsrah = (name) => request('POST', '/admin/usrah', { name });
export const adminNaqibInvite = (usrahId) => request('POST', `/admin/usrah/${id(usrahId)}/naqib-invite`);
/** Admin: reset any user's password → { temporaryPassword } (shown once). */
export const adminResetPassword = (userId) => request('POST', `/admin/users/${id(userId)}/reset-password`);
