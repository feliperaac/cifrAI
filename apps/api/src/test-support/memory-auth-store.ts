import { AppError } from '../errors.js';
import type { AuthStore, NewSession, NewUser, SessionRecord, UserRecord } from '../auth/types.js';

/** Fake em memoria do AuthStore, so para testes de unidade e de contrato das rotas. */
export function createMemoryAuthStore() {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, SessionRecord & { tokenHash: string }>();

  const store: AuthStore = {
    async createUserWithSession(user: NewUser, session: NewSession) {
      if ([...users.values()].some((u) => u.email === user.email)) {
        throw new AppError(409, 'EMAIL_TAKEN', 'Este e-mail ja esta cadastrado.');
      }
      users.set(user.id, { ...user, leftHanded: false, createdAt: session.createdAt });
      sessions.set(session.id, toSession(session));
    },
    async findUserByEmail(email) {
      return [...users.values()].find((u) => u.email === email) ?? null;
    },
    async createSession(session) {
      sessions.set(session.id, toSession(session));
    },
    async findSessionByTokenHash(hash) {
      const s = [...sessions.values()].find((x) => x.tokenHash === hash.toString('hex'));
      const user = s ? users.get(s.userId) : undefined;
      return s && user ? { session: s, user } : null;
    },
    async touchSession(id, lastSeenAt, expiresAt) {
      const s = sessions.get(id);
      if (s) Object.assign(s, { lastSeenAt, expiresAt });
    },
    async revokeSession(hash, at) {
      const s = [...sessions.values()].find((x) => x.tokenHash === hash.toString('hex'));
      if (s && !s.revokedAt) s.revokedAt = at;
    },
  };
  return { store, users, sessions };
}

const toSession = (s: NewSession) => ({
  id: s.id,
  userId: s.userId,
  tokenHash: s.tokenHash.toString('hex'),
  lastSeenAt: s.createdAt,
  expiresAt: s.expiresAt,
  absoluteExpiresAt: s.absoluteExpiresAt,
  revokedAt: null,
});
