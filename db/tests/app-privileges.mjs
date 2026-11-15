// F0-05: CIFRAI_APP le/insere nas tabelas do schema do MIG e NAO executa DDL.
// Uso: docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps \
//   -v ./db/tests/app-privileges.mjs:/repo/apps/api/scripts/app-privileges.mjs:ro api node scripts/app-privileges.mjs
// Tudo em transacao com rollback; nao deixa dados. Nao imprime senhas.
import oracledb from 'oracledb';

const schema = process.env.ORACLE_SCHEMA ?? 'CIFRAI_MIG';
const conn = await oracledb.getConnection({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST ?? 'host.docker.internal'}:${process.env.ORACLE_PORT ?? '1521'}/${process.env.ORACLE_SERVICE}`,
});
conn.currentSchema = schema;
let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failed = true;
};
const expectOra = async (name, sql, code) => {
  try {
    await conn.execute(sql);
    check(name, false, 'executou sem erro');
  } catch (e) {
    check(name, String(e.message).includes(code), String(e.message).split('\n')[0]);
  }
};

const who = await conn.execute(
  `SELECT SYS_CONTEXT('USERENV','SESSION_USER') AS u, SYS_CONTEXT('USERENV','CURRENT_SCHEMA') AS s FROM DUAL`,
  [],
  { outFormat: oracledb.OUT_FORMAT_OBJECT },
);
console.log(`session_user/current_schema: ${JSON.stringify(who.rows)}`);

await conn.execute(`SELECT COUNT(1) AS n FROM USERS`);
check('SELECT USERS', true);
await conn.execute(`INSERT INTO USERS (EMAIL, PASSWORD_HASH) VALUES (:e, :h)`, {
  e: 'f0-05@example.invalid',
  h: 'x',
});
check('INSERT USERS', true);
await conn.execute(`UPDATE USERS SET DISPLAY_NAME = :n WHERE EMAIL = :e`, {
  n: 'T',
  e: 'f0-05@example.invalid',
});
check('UPDATE USERS', true);
await expectOra(
  'UNIQUE email',
  `INSERT INTO USERS (EMAIL, PASSWORD_HASH) VALUES ('f0-05@example.invalid', 'x')`,
  'ORA-00001',
);
await expectOra(
  'CHECK email lowercase',
  `INSERT INTO USERS (EMAIL, PASSWORD_HASH) VALUES ('A@B.C', 'x')`,
  'ORA-02290',
);
await conn.execute(`DELETE FROM USERS WHERE EMAIL = :e`, { e: 'f0-05@example.invalid' });
check('DELETE USERS', true);
await conn.execute(`INSERT INTO APP_SETTINGS (SETTING_KEY, SETTING_VAL) VALUES ('t', '{"a":1}')`);
check('INSERT APP_SETTINGS (json valido)', true);
await expectOra(
  'CHECK IS JSON',
  `INSERT INTO APP_SETTINGS (SETTING_KEY, SETTING_VAL) VALUES ('t2', 'nao-json')`,
  'ORA-02290',
);
await conn.rollback();

await expectOra(
  'DDL CREATE TABLE negado',
  `CREATE TABLE ${schema}.APP_HACK (X NUMBER)`,
  'ORA-01031',
);
await expectOra(
  'DDL ALTER TABLE negado',
  `ALTER TABLE ${schema}.USERS ADD (HACK NUMBER)`,
  'ORA-01031',
);
await expectOra('DDL DROP TABLE negado', `DROP TABLE ${schema}.USERS`, 'ORA-01031');
await expectOra('TRUNCATE negado', `TRUNCATE TABLE ${schema}.USERS`, 'ORA-01031');
await expectOra(
  'Sem acesso a flyway_schema_history',
  `SELECT COUNT(1) FROM "flyway_schema_history"`,
  'ORA-00942',
);
await conn.close();
process.exit(failed ? 1 : 0);
