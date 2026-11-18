// Integracao real contra o Oracle de dev (F1-06). Roda so com RUN_DB_TESTS=1 (ver docs/validacao.md):
//   docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps -e RUN_DB_TESTS=1 api \
//     pnpm exec vitest run src/routes/auth.integration.test.ts
// Usa apenas usuarios f1-06-*@example.invalid e os remove (ON DELETE CASCADE) antes e depois.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createOracleDatabase, type Database } from '../db/oracle.js';
import {
  collectingStream,
  defineAuthHttpSuite,
  newEmail,
  PASSWORD,
} from '../test-support/auth-http-suite.js';
import { LOOSE_LIMITS } from '../test-support/auth-http-suite.js';

const enabled = process.env.RUN_DB_TESTS === '1';
const PATTERN = 'f1-06-%@example.invalid';

describe.skipIf(!enabled)('rotas /v1/auth (Oracle real)', () => {
  let db: Database;
  let config: ReturnType<typeof loadConfig>;

  const purge = () =>
    db.withTransaction(async (conn) => {
      await conn.execute(`DELETE FROM USERS WHERE EMAIL LIKE :p`, { p: PATTERN });
    });
  const count = (sql: string, binds: Record<string, unknown> = {}) =>
    db.withConnection(async (conn) => {
      const r = await conn.execute<{ N: number }>(sql, binds as never);
      return r.rows![0]!.N;
    });

  beforeAll(async () => {
    config = loadConfig(process.env);
    db = await createOracleDatabase(config.oracle);
    await purge();
  });
  afterAll(async () => {
    await purge();
    expect(await count(`SELECT COUNT(1) AS N FROM USERS WHERE EMAIL LIKE :p`, { p: PATTERN })).toBe(
      0,
    );
    await db.close();
  });

  const make = async (limits = LOOSE_LIMITS, allowedOrigins: string[] = []) => {
    const log = collectingStream();
    const app = await buildApp({
      config: { ...config, allowedOrigins },
      db,
      authLimits: limits,
      logStream: log.stream,
    });
    return { app, logs: log.text };
  };

  defineAuthHttpSuite('contrato HTTP', ({ limits, allowedOrigins }) =>
    make(limits, allowedOrigins),
  );

  describe('efeitos no banco', () => {
    const headers = { host: 'app.test', origin: 'https://app.test' };

    it('cadastro grava hash argon2id, estado de progresso e so o hash do token', async () => {
      const { app } = await make();
      const email = newEmail();
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers,
        payload: { email, password: PASSWORD, delivery: 'token', timezone: 'America/Sao_Paulo' },
      });
      expect(res.statusCode).toBe(201);
      const token = res.json().sessionToken as string;
      const user = await db.withConnection(async (conn) => {
        const r = await conn.execute<{ H: string; TZ: string; GOAL: number; STATE: number }>(
          `SELECT u.PASSWORD_HASH AS H, u.TIMEZONE AS TZ, p.DAILY_GOAL_XP AS GOAL, p.STATE_VERSION AS STATE
             FROM USERS u JOIN USER_PROGRESS_STATE p ON p.USER_ID = u.ID WHERE u.EMAIL = :e`,
          { e: email },
        );
        return r.rows![0]!;
      });
      expect(user.H).toMatch(/^\$argon2id\$/);
      expect(user.H).not.toContain(PASSWORD);
      expect(user.TZ).toBe('America/Sao_Paulo');
      expect(user.GOAL).toBe(20);
      expect(user.STATE).toBe(0);

      const sess = await db.withConnection(async (conn) => {
        const r = await conn.execute<{
          KIND: string;
          LEN: number;
          SAME: number;
          EXP: Date;
          CRE: Date;
        }>(
          `SELECT s.CLIENT_KIND AS KIND, UTL_RAW.LENGTH(s.TOKEN_HASH) AS LEN,
                  CASE WHEN UTL_RAW.CAST_TO_VARCHAR2(s.TOKEN_HASH) = :t THEN 1 ELSE 0 END AS SAME,
                  s.EXPIRES_AT AS EXP, s.CREATED_AT AS CRE
             FROM SESSIONS s JOIN USERS u ON u.ID = s.USER_ID WHERE u.EMAIL = :e`,
          { e: email, t: token },
        );
        return r.rows![0]!;
      });
      expect(sess.KIND).toBe('native');
      expect(sess.LEN).toBe(32);
      expect(sess.SAME).toBe(0);
      // ida e volta de TIMESTAMP WITH TIME ZONE preserva o instante (UTC): validade ~14 dias a frente
      const days = (sess.EXP.getTime() - sess.CRE.getTime()) / 86_400_000;
      expect(days).toBeCloseTo(14, 3);
      expect(Math.abs(Date.now() - sess.CRE.getTime())).toBeLessThan(60_000);
    });

    it('e-mail repetido nao deixa sessao nem estado orfaos (transacao unica)', async () => {
      const { app } = await make();
      const email = newEmail();
      const body = { email, password: PASSWORD };
      await app.inject({ method: 'POST', url: '/v1/auth/register', headers, payload: body });
      const before = await count(`SELECT COUNT(1) AS N FROM SESSIONS`);
      const dup = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers,
        payload: body,
      });
      expect(dup.statusCode).toBe(409);
      expect(await count(`SELECT COUNT(1) AS N FROM SESSIONS`)).toBe(before);
      expect(
        await count(
          `SELECT COUNT(1) AS N FROM USER_PROGRESS_STATE p JOIN USERS u ON u.ID = p.USER_ID WHERE u.EMAIL = :e`,
          { e: email },
        ),
      ).toBe(1);
    });

    it('sessao expirada no banco e rejeitada; login limpa sessoes mortas do usuario', async () => {
      const { app } = await make();
      const email = newEmail();
      const reg = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers,
        payload: { email, password: PASSWORD, delivery: 'token' },
      });
      const bearer = { authorization: `Bearer ${reg.json().sessionToken as string}` };
      expect(
        (await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer })).statusCode,
      ).toBe(200);
      await db.withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE SESSIONS SET EXPIRES_AT = EXPIRES_AT - INTERVAL '30' DAY
            WHERE USER_ID = (SELECT ID FROM USERS WHERE EMAIL = :e)`,
          { e: email },
        );
      });
      expect(
        (await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer })).statusCode,
      ).toBe(401);
      const sessionsOf = () =>
        count(
          `SELECT COUNT(1) AS N FROM SESSIONS s JOIN USERS u ON u.ID = s.USER_ID WHERE u.EMAIL = :e`,
          { e: email },
        );
      expect(await sessionsOf()).toBe(1);
      const login = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        headers,
        payload: { email, password: PASSWORD, delivery: 'token' },
      });
      expect(login.statusCode).toBe(200);
      expect(await sessionsOf()).toBe(1);
    });

    it('logout marca REVOKED_AT e o token deixa de valer', async () => {
      const { app } = await make();
      const email = newEmail();
      const reg = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers,
        payload: { email, password: PASSWORD, delivery: 'token' },
      });
      const bearer = { authorization: `Bearer ${reg.json().sessionToken as string}` };
      await app.inject({ method: 'POST', url: '/v1/auth/logout', headers: bearer });
      expect(
        await count(
          `SELECT COUNT(1) AS N FROM SESSIONS s JOIN USERS u ON u.ID = s.USER_ID
            WHERE u.EMAIL = :e AND s.REVOKED_AT IS NOT NULL`,
          { e: email },
        ),
      ).toBe(1);
      expect(
        (await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer })).statusCode,
      ).toBe(401);
    });
  });
});
