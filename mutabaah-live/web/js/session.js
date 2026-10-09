/**
 * Cached session (GET /api/auth/me). The sid cookie is httpOnly, so this is the only way to know who is
 * logged in. Shape (Me): { user: {id,name,email,phone,isAdmin,mustChangePassword},
 *                          usrah: {id,name,naqibName}|null, role: 'naqib'|'member'|null }
 */
import { getMe, onUnauthenticated } from './api.js';

/** @type {any|null} the Me payload, or null when logged out / not loaded */
let cached = null;
/** true once we know the answer (cached Me, or known logged out after a 401) */
let known = false;
/** @type {Promise<any|null>|null} */
let inflight = null;

/**
 * Returns the session, fetching /auth/me unless cached (or force). null when logged out (401).
 * Other errors (network, 500) are thrown.
 * @param {boolean} [force]
 */
export async function loadSession(force = false) {
  if (known && !force) return cached;
  if (inflight && !force) return inflight;
  const p = getMe().then(
    (me) => {
      if (inflight === p) {
        cached = me;
        known = true;
      }
      return me;
    },
    (err) => {
      if (err?.status === 401) {
        if (inflight === p) markLoggedOut();
        return null;
      }
      throw err;
    },
  );
  inflight = p;
  try {
    return await p;
  } finally {
    if (inflight === p) inflight = null;
  }
}

/** The cached session, or null (does not fetch). */
export function getSession() {
  return cached;
}

/** Stores a Me payload directly (login/signup responses are Me payloads). */
export function setSession(me) {
  cached = me;
  known = true;
  inflight = null;
}

/** Forgets the session; the next loadSession() asks the server again. */
export function clearSession() {
  cached = null;
  known = false;
  inflight = null;
}

/** Any 401: we now know we are logged out (avoids re-fetching /auth/me on the redirect to #login). */
function markLoggedOut() {
  cached = null;
  known = true;
  inflight = null;
}

/** 'admin' | 'naqib' | 'member' | null */
export function roleOf(me) {
  if (!me) return null;
  return me.user?.isAdmin ? 'admin' : me.role;
}

/** Where a user lands: admin → admin, naqib → ringkasan, member → hari-ini; logged out → login. */
export function defaultRouteFor(me) {
  const role = roleOf(me);
  if (!role) return 'login';
  if (me.user.mustChangePassword) return 'tukar-kata-laluan';
  return role === 'admin' ? 'admin' : role === 'naqib' ? 'ringkasan' : 'hari-ini';
}

onUnauthenticated(markLoggedOut);
