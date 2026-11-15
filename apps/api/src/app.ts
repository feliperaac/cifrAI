import { randomUUID } from 'node:crypto';
import type { Writable } from 'node:stream';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import type { Database } from './db/oracle.js';
import { AppError, codeForStatus, errorBody } from './errors.js';

export interface BuildAppOptions {
  config: Pick<AppConfig, 'logLevel' | 'readyTimeoutMs'>;
  db: Database;
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
];

export function buildApp(opts: BuildAppOptions): FastifyInstance {
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
    disableRequestLogging: false,
  });

  app.addHook('onSend', async (req, reply) => {
    void reply.header('x-request-id', req.id);
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
    const status = (err as FastifyError).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      // Erros de cliente do Fastify (JSON malformado, payload grande...): mensagem generica.
      req.log.warn({ code: (err as FastifyError).code }, 'client error');
      return reply.status(status).send(errorBody(codeForStatus(status), 'Requisicao invalida.'));
    }
    req.log.error({ err }, 'unhandled error');
    return reply.status(500).send(errorBody('INTERNAL_ERROR', 'Erro interno do servidor.'));
  });

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
