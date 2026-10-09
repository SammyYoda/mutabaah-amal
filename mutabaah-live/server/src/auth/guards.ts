import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError, MESSAGES } from '../errors.js';
import { resolveSession, SESSION_COOKIE } from './sessions.js';
import { setSessionCookie } from './cookie.js';

/** Routes a user with mustChangePassword may still use. */
const PASSWORD_CHANGE_ALLOWED = new Set(['/api/auth/me', '/api/auth/change-password', '/api/auth/logout']);

/**
 * preHandler: requires a valid session. Sets req.user and req.membership.
 * 401 when there is no/expired session, or a non-admin has no active membership.
 * 403 PASSWORD_CHANGE_REQUIRED when the user must change password (except me/change-password/logout).
 */
export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const raw = req.cookies[SESSION_COOKIE];
  const resolved = raw ? resolveSession(req.server.db, raw, req.server.now()) : null;
  if (!resolved) throw new AppError(401, 'UNAUTHENTICATED', MESSAGES.UNAUTHENTICATED);
  const { user, membership } = resolved;
  if (!user.isAdmin && !membership) throw new AppError(401, 'UNAUTHENTICATED', MESSAGES.UNAUTHENTICATED);
  if (resolved.renewed) setSessionCookie(reply, raw!, resolved.expiresAt);
  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(req.routeOptions.url ?? '')) {
    throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', MESSAGES.PASSWORD_CHANGE_REQUIRED);
  }
  req.user = user;
  req.membership = membership;
}

/** preHandler: requireUser + active membership with role 'naqib' (403 otherwise). */
export async function requireNaqib(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.user) await requireUser(req, reply);
  if (req.membership?.role !== 'naqib') throw new AppError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
}

/** preHandler: requireUser + users.isAdmin (403 otherwise). */
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.user) await requireUser(req, reply);
  if (!req.user.isAdmin) throw new AppError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
}
