import { RegisterRequestSchema, LoginRequestSchema } from '@cifrai/shared';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../errors.js';
import { createMemoryAuthStore } from '../test-support/memory-auth-store.js';
import type { PasswordHasher } from './password.js';
import {
  AuthService,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_TOUCH_INTERVAL_MS,
} from './service.js';
import { hashSessionToken } from './tokens.js';

const SECRET = 'segredo-de-teste-com-mais-de-32-caracteres';
const T0 = new Date('2026-01-01T12:00:00.000Z');

function setup() {
  const mem = createMemoryAuthStore();
  let now = T0;
  let n = 0;
  const hasher: PasswordHasher = {
    hash: async (p) => `h:${p}`,
    verify: async (h, p) => h === `h:${p}`,
    verifyDummy: vi.fn(async () => {}),
  };
  const svc = new AuthService({
    store: mem.store,
    hasher,
    sessionSecret: SECRET,
    now: () => now,
    newId: () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    newToken: () => `tok${n}-${'x'.repeat(40)}`,
  });
  return { ...mem, svc, hasher, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

const reg = (over: object = {}) =>
  RegisterRequestSchema.parse({
    email: 'A@Example.invalid',
    password: 'violao-no-colo-123',
    ...over,
  });
const login = (password = 'violao-no-colo-123', email = 'a@example.invalid') =>
  LoginRequestSchema.parse({ email, password });

describe('AuthService', () => {
  it('register: guarda so o hash do token e usa o e-mail normalizado', async () => {
    const { svc, sessions, users } = setup();
    const issued = await svc.register(reg());
    expect(issued.user.email).toBe('a@example.invalid');
    expect(issued.user.timezone).toBe('America/Rio_Branco');
    const stored = [...sessions.values()][0]!;
    expect(stored.tokenHash).toBe(hashSessionToken(issued.token, SECRET).toString('hex'));
    expect(JSON.stringify([...sessions.values()])).not.toContain(issued.token);
    expect([...users.values()][0]!.passwordHash).toBe('h:violao-no-colo-123');
    expect(issued.expiresAt.getTime()).toBe(T0.getTime() + SESSION_IDLE_MS);
  });

  it('register: senha fraca vira WEAK_PASSWORD e e-mail repetido vira EMAIL_TAKEN', async () => {
    const { svc } = setup();
    await expect(svc.register(reg({ password: 'password123' }))).rejects.toMatchObject({
      statusCode: 400,
      code: 'WEAK_PASSWORD',
    });
    await svc.register(reg());
    await expect(svc.register(reg())).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_TAKEN',
    });
  });

  it('login: mesma resposta para e-mail inexistente e senha errada; dummy so no inexistente', async () => {
    const { svc, hasher } = setup();
    await svc.register(reg());
    const wrong = await svc.login(login('senha-errada-123')).catch((e: unknown) => e);
    const ghost = await svc
      .login(login('senha-errada-123', 'x@example.invalid'))
      .catch((e: unknown) => e);
    expect(wrong).toBeInstanceOf(AppError);
    expect(ghost).toBeInstanceOf(AppError);
    expect({ ...(wrong as AppError) }).toEqual({ ...(ghost as AppError) });
    expect((wrong as AppError).message).toBe((ghost as AppError).message);
    expect(hasher.verifyDummy).toHaveBeenCalledTimes(1);
    expect((await svc.login(login())).user.email).toBe('a@example.invalid');
  });

  it('authenticate: valida, estende no maximo 1x/h, respeita expiracao ociosa e absoluta', async () => {
    const { svc, advance } = setup();
    const { token } = await svc.register(reg());
    expect((await svc.authenticate(token))?.refreshed).toBe(false);
    advance(SESSION_TOUCH_INTERVAL_MS);
    const r = await svc.authenticate(token);
    expect(r?.refreshed).toBe(true);
    // ocioso: passa da validade deslizante
    advance(SESSION_IDLE_MS + 1);
    expect(await svc.authenticate(token)).toBeNull();
  });

  it('authenticate: nunca passa do teto absoluto, mesmo com uso continuo', async () => {
    const { svc, advance } = setup();
    const { token } = await svc.register(reg());
    let last = T0.getTime();
    for (let d = 10; d < 90; d += 10) {
      advance(10 * 24 * 60 * 60 * 1000);
      const r = await svc.authenticate(token);
      expect(r).not.toBeNull();
      last = r!.expiresAt.getTime();
    }
    expect(last).toBeLessThanOrEqual(T0.getTime() + SESSION_ABSOLUTE_MS);
    advance(11 * 24 * 60 * 60 * 1000);
    expect(await svc.authenticate(token)).toBeNull();
  });

  it('authenticate/logout: token desconhecido e null; logout revoga e e idempotente', async () => {
    const { svc } = setup();
    expect(await svc.authenticate('nao-existe')).toBeNull();
    const { token } = await svc.register(reg());
    await svc.logout(token);
    await svc.logout(token);
    await svc.logout('desconhecido');
    expect(await svc.authenticate(token)).toBeNull();
  });
});
