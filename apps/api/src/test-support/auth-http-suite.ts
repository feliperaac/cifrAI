import { randomBytes } from 'node:crypto';
import { Writable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthLimits } from '../routes/auth.js';

/** Limites folgados para os testes que nao tratam de rate limit. */
export const LOOSE_LIMITS: AuthLimits = {
  registerPerIp: { max: 1000, windowMs: 60_000 },
  loginPerIp: { max: 1000, windowMs: 60_000 },
  loginFailuresPerEmail: { max: 1000, windowMs: 60_000 },
};

export interface SuiteApp {
  app: FastifyInstance;
  logs: () => string;
}
export type MakeApp = (opts: {
  limits: AuthLimits;
  allowedOrigins?: string[];
}) => Promise<SuiteApp>;

export const newEmail = () => `f1-06-${randomBytes(6).toString('hex')}@example.invalid`;
export const PASSWORD = 'violao-no-colo-123';
export const HOST = 'app.test';
const SAME_ORIGIN = { host: HOST, origin: `https://${HOST}` };

export function collectingStream() {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(String(chunk));
      cb();
    },
  });
  return { stream, text: () => chunks.join('') };
}

const sessionCookie = (res: { cookies: { name: string; value: string }[] }) =>
  res.cookies.find((c) => c.name === '__Host-cifrai_sid');

/** Suite HTTP compartilhada: roda com store em memoria (sempre) e com Oracle (RUN_DB_TESTS=1). */
export function defineAuthHttpSuite(name: string, makeApp: MakeApp): void {
  describe(name, () => {
    const apps: FastifyInstance[] = [];
    afterEach(async () => {
      await Promise.all(apps.splice(0).map((a) => a.close()));
    });
    const create = async (opts: Parameters<MakeApp>[0] = { limits: LOOSE_LIMITS }) => {
      const s = await makeApp(opts);
      apps.push(s.app);
      return s;
    };
    const post = (app: FastifyInstance, url: string, payload: unknown, headers = SAME_ORIGIN) =>
      app.inject({ method: 'POST', url, payload: payload as object, headers: { ...headers } });

    it('register -> me -> logout -> me 401, com cookie httpOnly/Secure/SameSite=Lax', async () => {
      const { app, logs } = await create();
      const email = newEmail();
      const reg = await post(app, '/v1/auth/register', {
        email,
        password: PASSWORD,
        displayName: ' Ana ',
      });
      expect(reg.statusCode).toBe(201);
      const body = reg.json();
      expect(body.user).toMatchObject({
        email,
        displayName: 'Ana',
        timezone: 'America/Rio_Branco',
        locale: 'pt-BR',
        leftHanded: false,
      });
      expect(body.sessionToken).toBeUndefined();
      expect(JSON.stringify(body)).not.toMatch(/passwordHash|argon2/);

      const cookie = sessionCookie(reg)!;
      expect(cookie).toBeDefined();
      const raw = String(reg.headers['set-cookie']);
      expect(raw).toMatch(/HttpOnly/i);
      expect(raw).toMatch(/Secure/i);
      expect(raw).toMatch(/SameSite=Lax/i);
      expect(raw).toMatch(/Path=\//);
      expect(raw).not.toMatch(/Domain=/i);
      expect(reg.headers['cache-control']).toBe('no-store');
      expect(reg.headers['x-content-type-options']).toBe('nosniff');

      const auth = { cookie: `${cookie.name}=${cookie.value}` };
      const me = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: auth });
      expect(me.statusCode).toBe(200);
      expect(me.json().user.email).toBe(email);

      const out = await post(app, '/v1/auth/logout', {}, { ...SAME_ORIGIN, ...auth } as never);
      expect(out.statusCode).toBe(204);
      expect(String(out.headers['set-cookie'])).toMatch(/__Host-cifrai_sid=;/);

      const after = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: auth });
      expect(after.statusCode).toBe(401);
      expect(after.json()).toEqual({
        error: { code: 'UNAUTHORIZED', message: 'Sessao invalida ou expirada.' },
      });

      const all = logs();
      expect(all).not.toContain(PASSWORD);
      expect(all).not.toContain(cookie.value);
      expect(all).not.toContain(email);
    });

    it('login: sucesso, senha errada e e-mail inexistente respondem igual', async () => {
      const { app } = await create();
      const email = newEmail();
      await post(app, '/v1/auth/register', { email: email.toUpperCase(), password: PASSWORD });
      const ok = await post(app, '/v1/auth/login', { email: ` ${email} `, password: PASSWORD });
      expect(ok.statusCode).toBe(200);
      expect(sessionCookie(ok)).toBeDefined();

      const wrong = await post(app, '/v1/auth/login', { email, password: 'senha-errada-123' });
      const ghost = await post(app, '/v1/auth/login', {
        email: newEmail(),
        password: 'senha-errada-123',
      });
      expect(wrong.statusCode).toBe(401);
      expect(ghost.statusCode).toBe(401);
      expect(wrong.json()).toEqual(ghost.json());
      expect(wrong.json().error.code).toBe('INVALID_CREDENTIALS');
      expect(sessionCookie(wrong)).toBeUndefined();
    });

    it('register: e-mail repetido 409, senha comum 400 WEAK_PASSWORD, corpo invalido 400', async () => {
      const { app } = await create();
      const email = newEmail();
      expect((await post(app, '/v1/auth/register', { email, password: PASSWORD })).statusCode).toBe(
        201,
      );
      const dup = await post(app, '/v1/auth/register', { email, password: PASSWORD });
      expect(dup.statusCode).toBe(409);
      expect(dup.json().error.code).toBe('EMAIL_TAKEN');
      const weak = await post(app, '/v1/auth/register', {
        email: newEmail(),
        password: 'password123',
      });
      expect(weak.statusCode).toBe(400);
      expect(weak.json().error.code).toBe('WEAK_PASSWORD');
      const bad = await post(app, '/v1/auth/register', { email: 'x', password: 'curta' });
      expect(bad.statusCode).toBe(400);
      expect(bad.json().error.code).toBe('VALIDATION_ERROR');
      const tz = await post(app, '/v1/auth/register', {
        email: newEmail(),
        password: PASSWORD,
        timezone: 'Marte/Olympus',
      });
      expect(tz.statusCode).toBe(400);
    });

    it('delivery=token (APK): token no corpo, sem cookie, bearer autentica e logout revoga', async () => {
      const { app } = await create({ limits: LOOSE_LIMITS, allowedOrigins: ['https://localhost'] });
      const email = newEmail();
      const reg = await post(
        app,
        '/v1/auth/register',
        { email, password: PASSWORD, delivery: 'token' },
        { host: HOST, origin: 'https://localhost' },
      );
      expect(reg.statusCode).toBe(201);
      expect(reg.headers['set-cookie']).toBeUndefined();
      const token = reg.json().sessionToken as string;
      expect(token.length).toBeGreaterThanOrEqual(40);
      const bearer = { authorization: `Bearer ${token}` };
      expect(
        (await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer })).statusCode,
      ).toBe(200);
      const out = await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        headers: { ...bearer, origin: 'https://evil.test' },
      });
      expect(out.statusCode).toBe(204);
      expect(
        (await app.inject({ method: 'GET', url: '/v1/auth/me', headers: bearer })).statusCode,
      ).toBe(401);
      const bogus = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: { authorization: 'Bearer lixo' },
      });
      expect(bogus.statusCode).toBe(401);
    });

    it('CSRF: origem estranha 403; cookie sem Origin 403; origem permitida passa', async () => {
      const { app } = await create({ limits: LOOSE_LIMITS, allowedOrigins: ['https://ok.test'] });
      const body = { email: newEmail(), password: PASSWORD };
      const evil = await post(app, '/v1/auth/register', body, {
        host: HOST,
        origin: 'https://evil.test',
      });
      expect(evil.statusCode).toBe(403);
      expect(evil.json().error.code).toBe('CSRF_REJECTED');
      const form = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers: { ...SAME_ORIGIN, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `email=${body.email}&password=${body.password}`,
      });
      expect(form.statusCode).toBe(415);
      const plain = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        headers: { ...SAME_ORIGIN, 'content-type': 'text/plain' },
        payload: JSON.stringify(body),
      });
      expect(plain.statusCode).toBe(400);
      const nul = await post(app, '/v1/auth/register', body, { host: HOST, origin: 'null' });
      expect(nul.statusCode).toBe(403);
      const ok = await post(app, '/v1/auth/register', body, {
        host: HOST,
        origin: 'https://ok.test',
      });
      expect(ok.statusCode).toBe(201);
      const cookie = sessionCookie(ok)!;
      const noOrigin = await app.inject({
        method: 'POST',
        url: '/v1/auth/logout',
        headers: { cookie: `${cookie.name}=${cookie.value}` },
      });
      expect(noOrigin.statusCode).toBe(403);
      const stillAlive = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: { cookie: `${cookie.name}=${cookie.value}` },
      });
      expect(stillAlive.statusCode).toBe(200);
    });

    it('rate limit: por IP no login e no cadastro, por e-mail so nas falhas', async () => {
      const { app } = await create({
        limits: {
          registerPerIp: { max: 2, windowMs: 60_000 },
          loginPerIp: { max: 100, windowMs: 60_000 },
          loginFailuresPerEmail: { max: 3, windowMs: 60_000 },
        },
      });
      const r1 = await post(app, '/v1/auth/register', { email: newEmail(), password: PASSWORD });
      const r2 = await post(app, '/v1/auth/register', { email: newEmail(), password: PASSWORD });
      const r3 = await post(app, '/v1/auth/register', { email: newEmail(), password: PASSWORD });
      expect([r1.statusCode, r2.statusCode, r3.statusCode]).toEqual([201, 201, 429]);
      expect(r3.json().error.code).toBe('RATE_LIMITED');
      expect(r3.headers['retry-after']).toBeDefined();

      const email = r1.json().user.email as string;
      // sucessos nao contam contra o limite por e-mail
      for (let i = 0; i < 5; i++) {
        expect((await post(app, '/v1/auth/login', { email, password: PASSWORD })).statusCode).toBe(
          200,
        );
      }
      const codes: number[] = [];
      for (let i = 0; i < 5; i++) {
        codes.push(
          (await post(app, '/v1/auth/login', { email, password: 'errada-errada-1' })).statusCode,
        );
      }
      expect(codes).toEqual([401, 401, 401, 429, 429]);
      // com o e-mail travado, ate a senha certa e barrada
      expect((await post(app, '/v1/auth/login', { email, password: PASSWORD })).statusCode).toBe(
        429,
      );
      // outro e-mail nao e afetado
      expect(
        (await post(app, '/v1/auth/login', { email: newEmail(), password: PASSWORD })).statusCode,
      ).toBe(401);

      const ipApp = await create({
        limits: { ...LOOSE_LIMITS, loginPerIp: { max: 2, windowMs: 60_000 } },
      });
      const l = [];
      for (let i = 0; i < 3; i++) {
        l.push(
          (await post(ipApp.app, '/v1/auth/login', { email: newEmail(), password: PASSWORD }))
            .statusCode,
        );
      }
      expect(l).toEqual([401, 401, 429]);
    });
  });
}
