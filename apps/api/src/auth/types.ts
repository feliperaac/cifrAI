import type { SessionDelivery } from '@cifrai/shared';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  timezone: string;
  locale: string;
  leftHanded: boolean;
  createdAt: Date;
}

export type ClientKind = 'web' | 'native';
export const clientKindFor = (d: SessionDelivery): ClientKind => (d === 'token' ? 'native' : 'web');

export interface SessionRecord {
  id: string;
  userId: string;
  lastSeenAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
}

export interface NewUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  timezone: string;
  locale: string;
}

export interface NewSession {
  id: string;
  userId: string;
  tokenHash: Buffer;
  clientKind: ClientKind;
  createdAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

/** Acesso a dados de autenticacao. A implementacao Oracle fica em `repositories/`. */
export interface AuthStore {
  /** USERS + USER_PROGRESS_STATE + SESSIONS na mesma transacao. Lanca AppError EMAIL_TAKEN. */
  createUserWithSession(user: NewUser, session: NewSession, dailyGoalXp: number): Promise<void>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  /** Cria a sessao e remove as mortas (expiradas/revogadas) do mesmo usuario. */
  createSession(session: NewSession, now: Date): Promise<void>;
  findSessionByTokenHash(
    tokenHash: Buffer,
  ): Promise<{ session: SessionRecord; user: UserRecord } | null>;
  touchSession(sessionId: string, lastSeenAt: Date, expiresAt: Date): Promise<void>;
  revokeSession(tokenHash: Buffer, at: Date): Promise<void>;
}
