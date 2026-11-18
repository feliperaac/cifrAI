import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { createArgon2Hasher } from './auth/password.js';
import { AuthService } from './auth/service.js';
import type { AppConfig } from './config.js';
import { mapOracleError } from './db/errors.js';
import type { Database } from './db/oracle.js';
import { AppError, codeForStatus, errorBody } from './errors.js';
import { createOracleAuthStore } from './repositories/auth-repository.js';
import { DEFAULT_AUTH_LIMITS, authRoutes, type AuthLimits } from './routes/auth.js';

export interface BuildAppOptions {
  config: Pick<
    AppConfig,
    'logLevel' | 'readyTimeoutMs' | 'sessionSecret' | 'trustProxy' | 'allowedOrigins'
  >;
  db: Database;
  /** Injeta um servico de autenticacao pronto (testes de rota sem Oracle). */
  authService?: AuthService;
  authLimits?: AuthLimits;
  /** Silencia ou redireciona os logs (testes). */
  logStream?: Writable;
  silent?: boolean;
}

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.sessionToken',
  'req.headers["x-forwarded-for"]',
];

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const { config, db } = opts;
  const app = Fastify({
    logger: {
      level: opts.silent ? 'silent' : config.logLevel,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      ...(opts.logStream ? { stream: opts.logStream } : {}),
    },
    genReqId: () => randomUUID(),
    requestIdLogLabel: 'requestId',
    bodyLimit: 100 * 1024,
    trustProxy: config.trustProxy,
    disableRequestLogging: false,
  });

  app.addHook('onSend', async (req, reply) => {
    void reply.header('x-request-id', req.id);
    // API JSON: nada deve ser interpretado como pagina nem embutido em frame.
    void reply.header('x-content-type-options', 'nosniff');
    void reply.header('referrer-policy', 'no-referrer');
    void reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
    void reply.header('cross-origin-resource-policy', 'same-origin');
  });

  app.setNotFoundHandler((_req, reply) => {
    void reply.status(404).send(errorBody('NOT_FOUND', 'Rota inexistente.'));
  });

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados invalidos.',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      });
    }
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(errorBody(err.code, err.message));
    }
    const oracleErr = mapOracleError(err);
    if (oracleErr) {
      req.log.error({ err }, 'database unavailable');
      return reply.status(oracleErr.statusCode).send(errorBody(oracleErr.code, oracleErr.message));
    }
    const status = (err as FastifyError).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      // Erros de cliente do Fastify (JSON malformado, payload grande...): mensagem generica.
      req.log.warn({ code: (err as FastifyError).code }, 'client error');
      return reply.status(status).send(errorBody(codeForStatus(status), 'Requisicao invalida.'));
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send(errorBody('INTERNAL_ERROR', 'Erro interno do servidor.'));
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () =>
      new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Aguarde um pouco e tente de novo.'),
  });
  const auth =
    opts.authService ??
    new AuthService({
      store: createOracleAuthStore(db),
      hasher: createArgon2Hasher(),
      sessionSecret: config.sessionSecret,
    });
  await app.register(async (scope) =>
    authRoutes(scope, {
      auth,
      allowedOrigins: config.allowedOrigins,
      limits: opts.authLimits ?? DEFAULT_AUTH_LIMITS,
    }),
  );

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (req, reply) => {
    try {
      let timer: NodeJS.Timeout | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('ready timeout')), config.readyTimeoutMs);
      });
      try {
        await Promise.race([db.ping(config.readyTimeoutMs), timeout]);
      } finally {
        clearTimeout(timer);
      }
      return { status: 'ready' };
    } catch (err) {
      req.log.error({ err }, 'readiness check failed');
      return reply.status(503).send(errorBody('NOT_READY', 'Servico indisponivel.'));
    }
  });

  return app;
}
