import oracledb, { type Connection } from 'oracledb';
import { hexToUuid, uuidToBuffer } from '../auth/ids.js';
import type { AuthStore, NewSession, NewUser, SessionRecord, UserRecord } from '../auth/types.js';
import { isUniqueViolation } from '../db/errors.js';
import type { Database } from '../db/oracle.js';
import { AppError } from '../errors.js';

const ts = (d: Date) => ({ val: d, type: oracledb.DB_TYPE_TIMESTAMP_TZ });

interface UserRow {
  ID: string;
  EMAIL: string;
  PASSWORD_HASH: string;
  DISPLAY_NAME: string | null;
  TIMEZONE: string;
  LOCALE: string;
  LEFT_HANDED: number;
  CREATED_AT: Date;
}

const USER_COLUMNS = `RAWTOHEX(u.ID) AS ID, u.EMAIL, u.PASSWORD_HASH, u.DISPLAY_NAME, u.TIMEZONE,
       u.LOCALE, u.LEFT_HANDED, u.CREATED_AT`;

const toUser = (r: UserRow): UserRecord => ({
  id: hexToUuid(r.ID),
  email: r.EMAIL,
  passwordHash: r.PASSWORD_HASH,
  displayName: r.DISPLAY_NAME,
  timezone: r.TIMEZONE,
  locale: r.LOCALE,
  leftHanded: r.LEFT_HANDED === 1,
  createdAt: r.CREATED_AT,
});

async function insertSession(conn: Connection, s: NewSession): Promise<void> {
  await conn.execute(
    `INSERT INTO SESSIONS (ID, USER_ID, TOKEN_HASH, CLIENT_KIND, CREATED_AT, LAST_SEEN_AT, EXPIRES_AT, ABSOLUTE_EXPIRES_AT)
     VALUES (:id, :userId, :tokenHash, :clientKind, :createdAt, :createdAt, :expiresAt, :absExpiresAt)`,
    {
      id: uuidToBuffer(s.id),
      userId: uuidToBuffer(s.userId),
      tokenHash: s.tokenHash,
      clientKind: s.clientKind,
      createdAt: ts(s.createdAt),
      expiresAt: ts(s.expiresAt),
      absExpiresAt: ts(s.absoluteExpiresAt),
    },
  );
}

export function createOracleAuthStore(db: Database): AuthStore {
  return {
    async createUserWithSession(user: NewUser, session: NewSession, dailyGoalXp) {
      try {
        await db.withTransaction(async (conn) => {
          await conn.execute(
            `INSERT INTO USERS (ID, EMAIL, PASSWORD_HASH, DISPLAY_NAME, TIMEZONE, LOCALE)
             VALUES (:id, :email, :passwordHash, :displayName, :timezone, :locale)`,
            {
              id: uuidToBuffer(user.id),
              email: user.email,
              passwordHash: user.passwordHash,
              // string vazia seria NULL de qualquer forma; aqui ja chega null ou texto nao vazio.
              displayName: { val: user.displayName, type: oracledb.STRING },
              timezone: user.timezone,
              locale: user.locale,
            },
          );
          await conn.execute(
            `INSERT INTO USER_PROGRESS_STATE (USER_ID, DAILY_GOAL_XP) VALUES (:id, :goal)`,
            { id: uuidToBuffer(user.id), goal: dailyGoalXp },
          );
          await insertSession(conn, session);
        });
      } catch (err) {
        if (isUniqueViolation(err, 'UQ_USERS_EMAIL')) {
          throw new AppError(409, 'EMAIL_TAKEN', 'Este e-mail ja esta cadastrado.');
        }
        throw err;
      }
    },

    findUserByEmail: (email) =>
      db.withConnection(async (conn) => {
        const r = await conn.execute<UserRow>(
          `SELECT ${USER_COLUMNS} FROM USERS u WHERE u.EMAIL = :email`,
          { email },
        );
        const row = r.rows?.[0];
        return row ? toUser(row) : null;
      }),

    createSession: (session, now) =>
      db.withTransaction(async (conn) => {
        await conn.execute(
          `DELETE FROM SESSIONS
            WHERE USER_ID = :userId
              AND (REVOKED_AT IS NOT NULL OR ABSOLUTE_EXPIRES_AT < :now OR EXPIRES_AT < :now)`,
          { userId: uuidToBuffer(session.userId), now: ts(now) },
        );
        await insertSession(conn, session);
      }),

    findSessionByTokenHash: (tokenHash) =>
      db.withConnection(async (conn) => {
        const r = await conn.execute<
          UserRow & {
            SESSION_ID: string;
            LAST_SEEN_AT: Date;
            EXPIRES_AT: Date;
            ABSOLUTE_EXPIRES_AT: Date;
            REVOKED_AT: Date | null;
          }
        >(
          `SELECT RAWTOHEX(s.ID) AS SESSION_ID, s.LAST_SEEN_AT, s.EXPIRES_AT, s.ABSOLUTE_EXPIRES_AT,
                  s.REVOKED_AT, ${USER_COLUMNS}
             FROM SESSIONS s
             JOIN USERS u ON u.ID = s.USER_ID
            WHERE s.TOKEN_HASH = :tokenHash`,
          { tokenHash },
        );
        const row = r.rows?.[0];
        if (!row) return null;
        const user = toUser(row);
        const session: SessionRecord = {
          id: hexToUuid(row.SESSION_ID),
          userId: user.id,
          lastSeenAt: row.LAST_SEEN_AT,
          expiresAt: row.EXPIRES_AT,
          absoluteExpiresAt: row.ABSOLUTE_EXPIRES_AT,
          revokedAt: row.REVOKED_AT,
        };
        return { session, user };
      }),

    touchSession: (sessionId, lastSeenAt, expiresAt) =>
      db.withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE SESSIONS SET LAST_SEEN_AT = :seen, EXPIRES_AT = :exp
            WHERE ID = :id AND REVOKED_AT IS NULL`,
          { id: uuidToBuffer(sessionId), seen: ts(lastSeenAt), exp: ts(expiresAt) },
        );
      }),

    revokeSession: (tokenHash, at) =>
      db.withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE SESSIONS SET REVOKED_AT = :at WHERE TOKEN_HASH = :tokenHash AND REVOKED_AT IS NULL`,
          { tokenHash, at: ts(at) },
        );
      }),
  };
}
