import { describe } from 'vitest';
import { buildApp } from '../app.js';
import { createArgon2Hasher } from '../auth/password.js';
import { AuthService } from '../auth/service.js';
import type { Database } from '../db/oracle.js';
import { createMemoryAuthStore } from '../test-support/memory-auth-store.js';
import { collectingStream, defineAuthHttpSuite } from '../test-support/auth-http-suite.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const unused = async (): Promise<never> => {
  throw new Error('sem banco');
};
const db: Database = {
  ping: async () => {},
  withConnection: unused,
  withTransaction: unused,
  close: async () => {},
};

describe('rotas /v1/auth (store em memoria)', () => {
  defineAuthHttpSuite('contrato HTTP', async ({ limits, allowedOrigins }) => {
    const log = collectingStream();
    const { store } = createMemoryAuthStore();
    const app = await buildApp({
      config: {
        logLevel: 'info',
        readyTimeoutMs: 200,
        sessionSecret: SECRET,
        trustProxy: false,
        allowedOrigins: allowedOrigins ?? [],
      },
      db,
      authService: new AuthService({ store, hasher: createArgon2Hasher(), sessionSecret: SECRET }),
      authLimits: limits,
      logStream: log.stream,
    });
    return { app, logs: log.text };
  });
});
