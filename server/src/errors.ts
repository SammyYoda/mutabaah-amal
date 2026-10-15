import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export type ErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> };
};

/** Throw from any handler/guard; the error handler turns it into `{ error: { code, message } }`. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const MESSAGES = {
  VALIDATION_ERROR: 'Maklumat tidak sah',
  UNAUTHENTICATED: 'Sila log masuk',
  FORBIDDEN: 'Akses tidak dibenarkan',
  NOT_FOUND: 'Tidak dijumpai',
  CONFLICT: 'Konflik data',
  RATE_LIMITED: 'Terlalu banyak cubaan. Cuba lagi sebentar lagi.',
  INTERNAL: 'Ralat pelayan',
  PASSWORD_CHANGE_REQUIRED: 'Sila tukar kata laluan anda dahulu',
} as const;

const CODE_BY_STATUS: Record<number, keyof typeof MESSAGES> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

/** Malay field message for one zod issue. */
function fieldMessage(issue: ZodError['issues'][number]): string {
  if (issue.code === 'invalid_type' && (issue as { input?: unknown }).input === undefined) return 'Wajib diisi';
  if (issue.code === 'too_small' && issue.origin === 'string') {
    return Number(issue.minimum) <= 1 ? 'Wajib diisi' : `Sekurang-kurangnya ${issue.minimum} aksara`;
  }
  if (issue.code === 'too_big' && issue.origin === 'string') return `Maksimum ${issue.maximum} aksara`;
  if (issue.code === 'invalid_format' && issue.format === 'email') return 'Emel tidak sah';
  return 'Tidak sah';
}

export function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join('.') || '_';
    fields[key] ??= fieldMessage(issue);
  }
  return fields;
}

export function errorBody(code: string, message: string, fields?: Record<string, string>): ErrorBody {
  return { error: fields ? { code, message, fields } : { code, message } };
}

export function errorHandler(err: FastifyError | Error, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof AppError) {
    return reply.status(err.status).send(errorBody(err.code, err.message, err.fields));
  }
  if (err instanceof ZodError) {
    return reply.status(400).send(errorBody('VALIDATION_ERROR', MESSAGES.VALIDATION_ERROR, zodFields(err)));
  }
  const status = (err as FastifyError).statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    // Fastify-generated client errors (invalid JSON, body too large, ...)
    const code = CODE_BY_STATUS[status] ?? 'VALIDATION_ERROR';
    return reply.status(status).send(errorBody(code, MESSAGES[code]));
  }
  req.log.error(err);
  return reply.status(500).send(errorBody('INTERNAL', MESSAGES.INTERNAL));
}
