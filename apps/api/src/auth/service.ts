import { randomUUID } from 'node:crypto';
import {
  DEFAULT_DAILY_GOAL_XP,
  DEFAULT_USER_LOCALE,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
  type SessionDelivery,
} from '@cifrai/shared';
import { AppError } from '../errors.js';
import type { PasswordHasher } from './password.js';
import { checkPasswordPolicy } from './password.js';
import { generateSessionToken, hashSessionToken } from './tokens.js';
import { clientKindFor, type AuthStore, type NewSession, type UserRecord } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Validade ociosa (deslizante) e teto absoluto da sessao. */
export const SESSION_IDLE_MS = 14 * DAY_MS;
export const SESSION_ABSOLUTE_MS = 90 * DAY_MS;
/** Renova a validade no maximo 1x por hora, para nao gravar no banco a cada requisicao. */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export interface IssuedSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
  delivery: SessionDelivery;
}

export interface AuthenticatedSession {
  user: AuthUser;
  expiresAt: Date;
  /** true quando a validade foi estendida (o cookie deve ser reenviado). */
  refreshed: boolean;
}

export interface AuthServiceDeps {
  store: AuthStore;
  hasher: PasswordHasher;
  sessionSecret: string;
  now?: () => Date;
  newId?: () => string;
  newToken?: () => string;
}

export const toAuthUser = (u: UserRecord): AuthUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  timezone: u.timezone,
  locale: u.locale,
  leftHanded: u.leftHanded,
  createdAt: u.createdAt.toISOString(),
});

const WEAK_MESSAGES = {
  too_common: 'Essa senha e muito comum. Escolha outra.',
  same_as_email: 'A senha nao pode ser igual ao e-mail.',
  repetitive: 'A senha e repetitiva demais. Escolha outra.',
} as const;

export class AuthService {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly newToken: () => string;

  constructor(private readonly deps: AuthServiceDeps) {
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? randomUUID;
    this.newToken = deps.newToken ?? generateSessionToken;
  }

  private buildSession(userId: string, delivery: SessionDelivery, now: Date) {
    const token = this.newToken();
    const session: NewSession = {
      id: this.newId(),
      userId,
      tokenHash: hashSessionToken(token, this.deps.sessionSecret),
      clientKind: clientKindFor(delivery),
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
      absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
    };
    return { token, session };
  }

  async register(req: RegisterRequest): Promise<IssuedSession> {
    const problem = checkPasswordPolicy(req.password, req.email);
    if (problem) throw new AppError(400, 'WEAK_PASSWORD', WEAK_MESSAGES[problem]);

    // O hash vem antes de qualquer consulta: o tempo nao depende de o e-mail ja existir.
    const passwordHash = await this.deps.hasher.hash(req.password);
    const now = this.now();
    const userId = this.newId();
    const { token, session } = this.buildSession(userId, req.delivery, now);
    await this.deps.store.createUserWithSession(
      {
        id: userId,
        email: req.email,
        passwordHash,
        displayName: req.displayName ?? null,
        timezone: req.timezone,
        locale: DEFAULT_USER_LOCALE,
      },
      session,
      DEFAULT_DAILY_GOAL_XP,
    );
    return {
      user: toAuthUser({
        id: userId,
        email: req.email,
        passwordHash,
        displayName: req.displayName ?? null,
        timezone: req.timezone,
        locale: DEFAULT_USER_LOCALE,
        leftHanded: false,
        createdAt: now,
      }),
      token,
      expiresAt: session.expiresAt,
      delivery: req.delivery,
    };
  }

  async login(req: LoginRequest): Promise<IssuedSession> {
    const user = await this.deps.store.findUserByEmail(req.email);
    // Mesma resposta e mesmo custo de CPU para e-mail inexistente e senha errada.
    const ok = user
      ? await this.deps.hasher.verify(user.passwordHash, req.password)
      : (await this.deps.hasher.verifyDummy(req.password), false);
    if (!user || !ok) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
    }
    const now = this.now();
    const { token, session } = this.buildSession(user.id, req.delivery, now);
    await this.deps.store.createSession(session, now);
    return { user: toAuthUser(user), token, expiresAt: session.expiresAt, delivery: req.delivery };
  }

  async authenticate(token: string): Promise<AuthenticatedSession | null> {
    const tokenHash = hashSessionToken(token, this.deps.sessionSecret);
    const found = await this.deps.store.findSessionByTokenHash(tokenHash);
    if (!found) return null;
    const { session, user } = found;
    const now = this.now();
    if (
      session.revokedAt ||
      session.expiresAt.getTime() <= now.getTime() ||
      session.absoluteExpiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    if (now.getTime() - session.lastSeenAt.getTime() < SESSION_TOUCH_INTERVAL_MS) {
      return { user: toAuthUser(user), expiresAt: session.expiresAt, refreshed: false };
    }
    const expiresAt = new Date(
      Math.min(now.getTime() + SESSION_IDLE_MS, session.absoluteExpiresAt.getTime()),
    );
    await this.deps.store.touchSession(session.id, now, expiresAt);
    return { user: toAuthUser(user), expiresAt, refreshed: true };
  }

  /** Idempotente: token desconhecido ou ja revogado nao e erro. */
  async logout(token: string): Promise<void> {
    await this.deps.store.revokeSession(
      hashSessionToken(token, this.deps.sessionSecret),
      this.now(),
    );
  }
}
