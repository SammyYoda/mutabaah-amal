import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { Db } from './db/client.js';
import type { User, ActiveMembership } from './auth/sessions.js';
import { AppError, MESSAGES, errorBody, errorHandler } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { adminRoutes } from './routes/admin.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    now: () => Date;
    appOrigin: string;
  }
  interface FastifyRequest {
    /** Set by requireUser/requireNaqib/requireAdmin; only valid on guarded routes. */
    user: User;
    /** Caller's active membership (null for an admin without one). Set by the guards. */
    membership: ActiveMembership | null;
  }
}

export type BuildAppOptions = {
  db: Db;
  now?: () => Date;
  /** Exact origin mutating requests must send, e.g. 'http://localhost:3000'. */
  appOrigin: string;
  /** Register @fastify/rate-limit (login/signup limits). Default true. */
  rateLimit?: boolean;
  /** Absolute path of the built SPA (dist/web). When set, it is served with an index.html fallback. */
  staticDir?: string;
  logger?: boolean;
};

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isJson(contentType: string | undefined): boolean {
  return (contentType ?? '').split(';')[0].trim().toLowerCase() === 'application/json';
}

export function buildApp(opts: BuildAppOptions): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });

  app.decorate('db', opts.db);
  app.decorate('appOrigin', opts.appOrigin);
  app.decorate('now', opts.now ?? (() => new Date()));
  app.decorateRequest('user', null as unknown as User);
  app.decorateRequest('membership', null);

  app.setErrorHandler(errorHandler);

  // JSON parser that treats an empty body as {} (e.g. POST /api/auth/logout with no payload).
  const defaultJson = app.getDefaultJsonParser('error', 'error');
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    const text = body.toString(); // parseAs: 'string' → always a string at runtime
    if (text.trim() === '') return done(null, {});
    return defaultJson(req, text, done);
  });

  // CSRF: every mutating request must be JSON from our own origin. Runs before routing to handlers.
  // Deliberately path-independent: req.url is raw while the router decodes it (/%61pi/... routes to /api/...),
  // and no mutating routes exist outside /api (static files and the SPA fallback are GET-only).
  app.addHook('onRequest', async (req) => {
    if (!MUTATING.has(req.method)) return;
    if (!isJson(req.headers['content-type']) || req.headers.origin !== opts.appOrigin) {
      throw new AppError(403, 'FORBIDDEN', MESSAGES.FORBIDDEN);
    }
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // the SPA uses the Tailwind CDN (with an inline config script) and Google Fonts
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  });
  app.register(cookie);
  if (opts.rateLimit ?? true) {
    app.register(rateLimit, {
      global: false,
      errorResponseBuilder: () => new AppError(429, 'RATE_LIMITED', MESSAGES.RATE_LIMITED),
    });
  }

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(adminRoutes, { prefix: '/api/admin' });

  if (opts.staticDir) {
    app.register(fastifyStatic, { root: opts.staticDir, wildcard: true });
  }

  app.setNotFoundHandler((req, reply) => {
    if (opts.staticDir && req.method === 'GET' && !req.url.startsWith('/api')) {
      return reply.type('text/html').sendFile('index.html');
    }
    return reply.status(404).send(errorBody('NOT_FOUND', MESSAGES.NOT_FOUND));
  });

  return app;
}
