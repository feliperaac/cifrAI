import { createHash } from 'node:crypto';
import {
  AuthSessionResponseSchema,
  LoginRequestSchema,
  MeResponseSchema,
  RegisterRequestSchema,
  type AuthSessionResponse,
} from '@cifrai/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isOriginAcceptable } from '../auth/csrf.js';
import type { AuthService, IssuedSession } from '../auth/service.js';
import { AppError } from '../errors.js';

/** Prefixo `__Host-`: o navegador exige Secure, Path=/ e sem Domain, o que impede cookie de subdominio. */
export const SESSION_COOKIE = '__Host-cifrai_sid';

export interface AuthLimits {
  registerPerIp: { max: number; windowMs: number };
  loginPerIp: { max: number; windowMs: number };
  /** Falhas de login por e-mail (so tentativas erradas contam). */
  loginFailuresPerEmail: { max: number; windowMs: number };
}

export const DEFAULT_AUTH_LIMITS: AuthLimits = {
  registerPerIp: { max: 10, windowMs: 60 * 60 * 1000 },
  loginPerIp: { max: 20, windowMs: 15 * 60 * 1000 },
  loginFailuresPerEmail: { max: 8, windowMs: 15 * 60 * 1000 },
};

export interface AuthRoutesOptions {
  auth: AuthService;
  allowedOrigins: readonly string[];
  limits: AuthLimits;
}

const rateLimited = () =>
  new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um pouco e tente de novo.');

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  void reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

const clearSessionCookie = (reply: FastifyReply): void => {
  void reply.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
};

/** Bearer tem prioridade sobre o cookie (cliente nativo nunca depende de cookie). */
function extractToken(req: FastifyRequest): { token: string; via: 'bearer' | 'cookie' } | null {
  const header = req.headers.authorization;
  if (typeof header === 'string') {
    const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(header);
    return m?.[1] ? { token: m[1], via: 'bearer' } : null;
  }
  const cookie = req.cookies[SESSION_COOKIE];
  return cookie ? { token: cookie, via: 'cookie' } : null;
}

function respondIssued(reply: FastifyReply, issued: IssuedSession, status: number) {
  const body: AuthSessionResponse = {
    user: issued.user,
    expiresAt: issued.expiresAt.toISOString(),
    ...(issued.delivery === 'token' ? { sessionToken: issued.token } : {}),
  };
  if (issued.delivery === 'cookie') setSessionCookie(reply, issued.token, issued.expiresAt);
  return reply.status(status).send(AuthSessionResponseSchema.parse(body));
}

/** Chave por e-mail sem guardar o e-mail em claro na memoria do limitador nem em logs. */
const emailKeys = new WeakMap<FastifyRequest, string>();
const emailKey = (email: string) => createHash('sha256').update(email).digest('hex');

export function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): void {
  const { auth, limits } = opts;
  const rateLimitConfig = (l: { max: number; windowMs: number }) => ({
    rateLimit: { max: l.max, timeWindow: l.windowMs },
  });
  const failuresPerEmail = app.createRateLimit({
    max: limits.loginFailuresPerEmail.max,
    timeWindow: limits.loginFailuresPerEmail.windowMs,
    keyGenerator: (req) => emailKeys.get(req) ?? 'none',
  });

  app.addHook('onRequest', async (req, reply) => {
    void reply.header('cache-control', 'no-store');
    if (!isOriginAcceptable(req, { allowedOrigins: opts.allowedOrigins }, SESSION_COOKIE)) {
      throw new AppError(403, 'CSRF_REJECTED', 'Origem da requisicao nao permitida.');
    }
  });

  app.post(
    '/v1/auth/register',
    { config: rateLimitConfig(limits.registerPerIp) },
    async (req, reply) => {
      const body = RegisterRequestSchema.parse(req.body);
      const issued = await auth.register(body);
      req.log.info({ userId: issued.user.id, delivery: issued.delivery }, 'auth.register');
      return respondIssued(reply, issued, 201);
    },
  );

  app.post('/v1/auth/login', { config: rateLimitConfig(limits.loginPerIp) }, async (req, reply) => {
    const body = LoginRequestSchema.parse(req.body);
    emailKeys.set(req, emailKey(body.email));
    const status = await failuresPerEmail(req, { increment: false });
    if (!status.isAllowed && (status.isExceeded || status.remaining <= 0)) throw rateLimited();
    try {
      const issued = await auth.login(body);
      req.log.info({ userId: issued.user.id, delivery: issued.delivery }, 'auth.login');
      return respondIssued(reply, issued, 200);
    } catch (err) {
      if (err instanceof AppError && err.code === 'INVALID_CREDENTIALS') {
        await failuresPerEmail(req);
        req.log.warn({ code: err.code }, 'auth.login.failed');
      }
      throw err;
    }
  });

  app.get('/v1/auth/me', async (req, reply) => {
    const found = extractToken(req);
    const session = found ? await auth.authenticate(found.token) : null;
    if (!found || !session) {
      if (found?.via === 'cookie') clearSessionCookie(reply);
      throw new AppError(401, 'UNAUTHORIZED', 'Sessao invalida ou expirada.');
    }
    if (session.refreshed && found.via === 'cookie') {
      setSessionCookie(reply, found.token, session.expiresAt);
    }
    return MeResponseSchema.parse({ user: session.user });
  });

  app.post('/v1/auth/logout', async (req, reply) => {
    const found = extractToken(req);
    if (found) await auth.logout(found.token);
    if (found?.via === 'cookie' || req.cookies[SESSION_COOKIE]) clearSessionCookie(reply);
    return reply.status(204).send();
  });
}
