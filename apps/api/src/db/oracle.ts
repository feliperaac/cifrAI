import oracledb, { type Connection } from 'oracledb';
import type { AppConfig } from '../config.js';

/** Contrato minimo usado pelas rotas; permite injetar um fake nos testes. */
export interface Database {
  /** Executa `SELECT 1 FROM DUAL`; rejeita se o banco nao responder. */
  ping(timeoutMs: number): Promise<void>;
  /** Empresta uma conexao do pool e a devolve em `finally`. Sem commit implicito. */
  withConnection<T>(fn: (conn: Connection) => Promise<T>): Promise<T>;
  /** Uma transacao: commit se `fn` resolver, rollback se rejeitar. */
  withTransaction<T>(fn: (conn: Connection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Cria o pool unico do processo (thin mode, poolMin 0 para a API subir mesmo com Oracle fora). */
export async function createOracleDatabase(cfg: AppConfig['oracle']): Promise<Database> {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  const pool = await oracledb.createPool({
    user: cfg.user,
    password: cfg.password,
    connectString: cfg.connectString,
    poolMin: 0,
    poolMax: cfg.poolMax,
    poolPingInterval: 30,
    queueTimeout: 3000,
    expireTime: 1,
  });

  const withConnection = async <T>(fn: (conn: Connection) => Promise<T>): Promise<T> => {
    const conn = await pool.getConnection();
    try {
      // O CIFRAI_APP nao tem objetos proprios; as tabelas sao do schema de migracao (db/README.md).
      conn.currentSchema = cfg.schema;
      return await fn(conn);
    } finally {
      await conn.close();
    }
  };

  return {
    ping: (timeoutMs) =>
      withConnection(async (conn) => {
        conn.callTimeout = timeoutMs;
        await conn.execute('SELECT 1 FROM DUAL');
      }),
    withConnection,
    withTransaction: (fn) =>
      withConnection(async (conn) => {
        try {
          const result = await fn(conn);
          await conn.commit();
          return result;
        } catch (err) {
          await conn.rollback().catch(() => undefined);
          throw err;
        }
      }),
    async close() {
      await pool.close(5);
    },
  };
}
