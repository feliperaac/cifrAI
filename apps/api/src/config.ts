import { z } from 'zod';

// Variaveis vazias no compose (VAR=) chegam como string vazia; tratamos como ausentes.
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
const opt = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema);

const envSchema = z.object({
  NODE_ENV: opt(z.enum(['development', 'test', 'production']).default('production')),
  API_HOST: opt(z.string().default('0.0.0.0')),
  API_PORT: opt(z.coerce.number().int().min(1).max(65535).default(3000)),
  LOG_LEVEL: opt(z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')),
  ORACLE_HOST: opt(z.string().default('host.docker.internal')),
  ORACLE_PORT: opt(z.coerce.number().int().min(1).max(65535).default(1521)),
  ORACLE_SERVICE: z.string().min(1),
  ORACLE_USER: opt(z.string().default('CIFRAI_APP')),
  ORACLE_PASSWORD: z.string().min(1),
  ORACLE_POOL_MAX: opt(z.coerce.number().int().min(1).max(50).default(4)),
  READY_TIMEOUT_MS: opt(z.coerce.number().int().min(100).max(30000).default(2000)),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  oracle: {
    connectString: string;
    user: string;
    password: string;
    poolMax: number;
  };
  readyTimeoutMs: number;
}

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Configuracao invalida: ${problems.join('; ')}`);
    this.name = 'ConfigError';
  }
}

/** Valida o ambiente. As mensagens citam so o nome da variavel, nunca o valor (senha). */
export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((i) => `${i.path.join('.') || '(env)'}: ${i.message}`),
    );
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    host: e.API_HOST,
    port: e.API_PORT,
    logLevel: e.LOG_LEVEL,
    oracle: {
      connectString: `${e.ORACLE_HOST}:${e.ORACLE_PORT}/${e.ORACLE_SERVICE}`,
      user: e.ORACLE_USER,
      password: e.ORACLE_PASSWORD,
      poolMax: e.ORACLE_POOL_MAX,
    },
    readyTimeoutMs: e.READY_TIMEOUT_MS,
  };
}
