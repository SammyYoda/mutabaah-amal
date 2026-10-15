import type { FastifyReply } from 'fastify';
import { SESSION_COOKIE } from './sessions.js';

function baseOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function setSessionCookie(reply: FastifyReply, rawToken: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE, rawToken, { ...baseOptions(), expires: expiresAt });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, baseOptions());
}
