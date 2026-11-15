// Teste de conexao Oracle em thin mode (F0-04). Uso (no container da API):
//   node scripts/oracle-check.mjs
// Le ORACLE_HOST, ORACLE_PORT, ORACLE_SERVICE, ORACLE_USER, ORACLE_PASSWORD do ambiente.
// Nao imprime a senha.
import oracledb from 'oracledb';

const need = ['ORACLE_SERVICE', 'ORACLE_USER', 'ORACLE_PASSWORD'];
const missing = need.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`FALHA: variaveis ausentes: ${missing.join(', ')}`);
  process.exit(2);
}
const host = process.env.ORACLE_HOST ?? 'host.docker.internal';
const port = process.env.ORACLE_PORT ?? '1521';
const service = process.env.ORACLE_SERVICE;
const connectString = `${host}:${port}/${service}`;

const explain = (err) => {
  const m = String(err?.message ?? err);
  if (/ORA-12514|ORA-12505/.test(m))
    return 'Service name desconhecido pelo listener. Confirme o service do PDB (v$services); ORCL pode ser o CDB.';
  if (/ORA-01017/.test(m)) return 'Usuario/senha invalidos (ou usuarios ainda nao criados).';
  if (/ORA-28040|NJS-116|DPY-3015/.test(m))
    return 'Verificador de senha incompativel com thin mode (10G). Redefina a senha para gerar verificador 11G/12C.';
  if (/DPY-3001|NNE|native network encryption/i.test(m))
    return 'Servidor exige NNE, nao suportado em thin mode. Use TCPS ou thick mode (registrar ADR).';
  if (/ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|DPY-6005/.test(m))
    return 'Sem rota/porta para o Oracle. Verifique extra_hosts e firewall do host para a bridge Docker.';
  return 'Erro nao classificado.';
};

let pool;
try {
  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString,
    poolMin: 1,
    poolMax: 2,
    poolPingInterval: 30,
    expireTime: 1,
  });
  const conn = await pool.getConnection();
  try {
    const r = await conn.execute('SELECT 1 AS ok FROM DUAL', [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    const ctx = await conn.execute(
      `SELECT SYS_CONTEXT('USERENV','CON_NAME') AS con_name,
              SYS_CONTEXT('USERENV','SERVICE_NAME') AS service_name,
              SYS_CONTEXT('USERENV','SESSION_USER') AS session_user
         FROM DUAL`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    console.log(`thin=${oracledb.thin} oracledb=${oracledb.versionString}`);
    console.log(`SELECT 1 FROM DUAL -> ${JSON.stringify(r.rows)}`);
    console.log(`contexto -> ${JSON.stringify(ctx.rows)}`);
    if (ctx.rows?.[0]?.CON_NAME === 'CDB$ROOT')
      console.warn('AVISO: conectado no CDB$ROOT; use o service do PDB.');
    try {
      const nne = await conn.execute(
        `SELECT network_service_banner AS banner FROM v$session_connect_info
          WHERE sid = SYS_CONTEXT('USERENV','SID')`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      console.log(`rede -> ${JSON.stringify(nne.rows)}`);
    } catch {
      console.log('rede -> V$SESSION_CONNECT_INFO indisponivel para este usuario (ignorado)');
    }
    // Prova de privilegio minimo: DDL deve falhar para CIFRAI_APP.
    if (process.env.ORACLE_CHECK_DDL === '1') {
      try {
        await conn.execute('CREATE TABLE CIFRAI_DDL_PROBE (X NUMBER)');
        await conn.execute('DROP TABLE CIFRAI_DDL_PROBE PURGE');
        console.error('FALHA: usuario conseguiu executar DDL (privilegio excessivo)');
        process.exitCode = 3;
      } catch (e) {
        console.log(`DDL negado como esperado -> ${String(e.message).split('\n')[0]}`);
      }
    }
  } finally {
    await conn.close();
  }
  console.log('OK');
} catch (err) {
  console.error(`FALHA ao conectar em ${connectString} como ${process.env.ORACLE_USER}`);
  console.error(String(err?.message ?? err).split('\n')[0]);
  console.error(`Dica: ${explain(err)}`);
  process.exitCode = 1;
} finally {
  if (pool) await pool.close(0);
}
