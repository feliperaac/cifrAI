import oracledb from 'oracledb';
import type { AppConfig } from '../config.js';

/** Contrato minimo usado pelas rotas; permite injetar um fake nos testes. */
export interface Database {
  /** Executa `SELECT 1 FROM DUAL`; rejeita se o banco nao responder. */
  ping(timeoutMs: number): Promise<void>;
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

  return {
    async ping(timeoutMs) {
      const conn = await pool.getConnection();
      try {
        conn.callTimeout = timeoutMs;
        await conn.execute('SELECT 1 FROM DUAL');
      } finally {
        await conn.close();
      }
    },
    async close() {
      await pool.close(5);
    },
  };
}
