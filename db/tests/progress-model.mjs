// F1-07: modelo de progresso (ADR-0002 item 8) como CIFRAI_APP.
// Uso (ver db/README.md):
//   docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps \
//     -v ./db/tests/progress-model.mjs:/repo/apps/api/scripts/progress-model.mjs:ro api node scripts/progress-model.mjs
// Prova: privilegios minimos por tabela, ON DELETE CASCADE, constraints, executeMany + batchErrors (thin).
// Tudo em UMA transacao que termina em ROLLBACK (nada e gravado); no fim confere que nao sobrou nada.
// Bind variables sempre; nao imprime segredos.
import { randomBytes } from 'node:crypto';
import oracledb from 'oracledb';

const schema = process.env.ORACLE_SCHEMA ?? 'CIFRAI_MIG';
const conn = await oracledb.getConnection({
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: `${process.env.ORACLE_HOST ?? 'host.docker.internal'}:${process.env.ORACLE_PORT ?? '1521'}/${process.env.ORACLE_SERVICE}`,
});
conn.currentSchema = schema;
const OBJ = { outFormat: oracledb.OUT_FORMAT_OBJECT };
let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${detail}`);
  if (!ok) failed = true;
};
const expectOra = async (name, sql, binds, code) => {
  // SAVEPOINT por tentativa: um erro de constraint nao deve contaminar o resto da transacao.
  await conn.execute('SAVEPOINT sp_expect');
  try {
    await conn.execute(sql, binds);
    check(name, false, 'executou sem erro');
  } catch (e) {
    check(name, String(e.message).includes(code), String(e.message).split('\n')[0]);
  }
  await conn.execute('ROLLBACK TO SAVEPOINT sp_expect');
};
const count = async (table, where, binds) =>
  (await conn.execute(`SELECT COUNT(1) AS N FROM ${table} WHERE ${where}`, binds, OBJ)).rows[0].N;

const TABLES = {
  PROGRESS_EVENTS: ['INSERT', 'SELECT'],
  SYNC_DEVICES: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  USER_PROGRESS_STATE: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  DAILY_ACTIVITY: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  LESSON_PROGRESS: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  REVIEW_CARDS: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  GUEST_CLAIMS: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
};

// 1. Privilegios concedidos (dicionario) e FKs com ON DELETE CASCADE
const privs = (
  await conn.execute(
    `SELECT TABLE_NAME, PRIVILEGE FROM ALL_TAB_PRIVS
      WHERE GRANTEE = SYS_CONTEXT('USERENV','SESSION_USER') AND TABLE_SCHEMA = :s`,
    { s: schema },
    OBJ,
  )
).rows;
for (const [t, expected] of Object.entries(TABLES)) {
  const got = privs
    .filter((r) => r.TABLE_NAME === t)
    .map((r) => r.PRIVILEGE)
    .sort();
  check(
    `privilegios ${t}`,
    JSON.stringify(got) === JSON.stringify(expected),
    `esperado=${expected} obtido=${got}`,
  );
}
const fks = (
  await conn.execute(
    `SELECT TABLE_NAME, DELETE_RULE FROM ALL_CONSTRAINTS
      WHERE OWNER = :s AND CONSTRAINT_TYPE = 'R' AND R_CONSTRAINT_NAME = 'PK_USERS'`,
    { s: schema },
    OBJ,
  )
).rows;
for (const t of Object.keys(TABLES)) {
  const r = fks.find((x) => x.TABLE_NAME === t);
  check(`FK ${t} -> USERS ON DELETE CASCADE`, r?.DELETE_RULE === 'CASCADE', r?.DELETE_RULE);
}
const uq = (
  await conn.execute(
    `SELECT COUNT(1) AS N FROM ALL_CONS_COLUMNS cc JOIN ALL_CONSTRAINTS c
       ON c.OWNER = cc.OWNER AND c.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
      WHERE c.OWNER = :s AND c.TABLE_NAME = 'PROGRESS_EVENTS' AND c.CONSTRAINT_TYPE = 'U'
        AND cc.COLUMN_NAME = 'SERVER_SEQ'`,
    { s: schema },
    OBJ,
  )
).rows[0].N;
check('UNIQUE em PROGRESS_EVENTS.SERVER_SEQ existe', uq === 1);

// 2. Dados de teste (transacao unica, sempre revertida)
const mkUser = async (email) => {
  const r = await conn.execute(
    `INSERT INTO USERS (EMAIL, PASSWORD_HASH) VALUES (:e, 'x') RETURNING ID INTO :id`,
    { e: email, id: { type: oracledb.BUFFER, dir: oracledb.BIND_OUT } },
  );
  return r.outBinds.id[0];
};
const tag = randomBytes(4).toString('hex');
const userA = await mkUser(`f1-07-a-${tag}@example.invalid`);
const userB = await mkUser(`f1-07-b-${tag}@example.invalid`);

const TS = `TO_TIMESTAMP_TZ(:ts, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM')`;
const EV_SQL = `INSERT INTO PROGRESS_EVENTS
  (ID, USER_ID, DEVICE_ID, CLIENT_SEQ, EVENT_TYPE, SCHEMA_VERSION, CONTENT_VERSION, SUBJECT_KEY,
   PAYLOAD, PAYLOAD_HASH, CLIENT_TS, EFFECTIVE_TS, CLIENT_TZ, LOCAL_DATE, LATE)
  VALUES (:id, :u, :dev, :seq, 'lesson.completed', 1, '1', :subj, :payload, :hash,
          ${TS}, ${TS}, 'America/Rio_Branco', TO_DATE(:d, 'YYYY-MM-DD'), :late)`;
const ev = (user, seq, payload = '{"lessonId":"u01.l01"}') => ({
  id: randomBytes(16),
  u: user,
  dev: Buffer.alloc(16, 1),
  seq,
  subj: 'u01.l01',
  payload,
  hash: randomBytes(32),
  ts: '2026-11-15T12:00:00.000+00:00',
  d: '2026-11-15',
  late: 0,
});
const insertEv = (e) => conn.execute(EV_SQL, e);

await insertEv(ev(userA, 1));
check('INSERT PROGRESS_EVENTS (evento valido)', true);
check(
  'SELECT PROGRESS_EVENTS',
  (await count('PROGRESS_EVENTS', 'USER_ID = :u', { u: userA })) === 1,
);

// 3. Menor privilegio em PROGRESS_EVENTS: sem UPDATE/DELETE direto
await expectOra(
  'UPDATE PROGRESS_EVENTS negado',
  `UPDATE PROGRESS_EVENTS SET LATE = 1 WHERE USER_ID = :u`,
  { u: userA },
  'ORA-01031',
);
await expectOra(
  'DELETE PROGRESS_EVENTS negado',
  `DELETE FROM PROGRESS_EVENTS WHERE USER_ID = :u`,
  { u: userA },
  'ORA-01031',
);

// 4. Constraints
await expectOra('CHECK PAYLOAD IS JSON', EV_SQL, ev(userA, 2, 'nao-json'), 'ORA-02290');
await expectOra('CHECK LATE IN (0,1)', EV_SQL, { ...ev(userA, 3), late: 2 }, 'ORA-02290');
await expectOra(
  'PK PROGRESS_EVENTS (eventId duplicado)',
  EV_SQL,
  {
    ...ev(userA, 4),
    id: (await conn.execute(`SELECT ID FROM PROGRESS_EVENTS WHERE USER_ID = :u`, { u: userA }, OBJ))
      .rows[0].ID,
  },
  'ORA-00001',
);
await expectOra(
  'SERVER_SEQ e GENERATED ALWAYS (valor explicito negado)',
  `INSERT INTO PROGRESS_EVENTS (ID, USER_ID, DEVICE_ID, CLIENT_SEQ, EVENT_TYPE, SCHEMA_VERSION, CONTENT_VERSION,
     PAYLOAD, PAYLOAD_HASH, CLIENT_TS, EFFECTIVE_TS, CLIENT_TZ, LOCAL_DATE, SERVER_SEQ)
   VALUES (:id, :u, :dev, 1, 't', 1, '1', '{}', :hash, SYSTIMESTAMP, SYSTIMESTAMP, 'UTC', TRUNC(SYSDATE), 1)`,
  { id: randomBytes(16), u: userA, dev: Buffer.alloc(16, 1), hash: randomBytes(32) },
  'ORA-32795',
);
await expectOra(
  'FK PROGRESS_EVENTS.USER_ID (usuario inexistente)',
  EV_SQL,
  ev(randomBytes(16), 5),
  'ORA-02291',
);
await expectOra(
  'NOT NULL PROGRESS_EVENTS.PAYLOAD_HASH',
  EV_SQL,
  { ...ev(userA, 6), hash: null },
  'ORA-01400',
);
await expectOra(
  'CHECK DAILY_ACTIVITY.GOAL_MET IN (0,1)',
  `INSERT INTO DAILY_ACTIVITY (USER_ID, LOCAL_DATE, GOAL_MET) VALUES (:u, TO_DATE('2026-11-15','YYYY-MM-DD'), 2)`,
  { u: userA },
  'ORA-02290',
);
await expectOra(
  'CHECK DAILY_ACTIVITY.COUNTS_FOR_STREAK IN (0,1)',
  `INSERT INTO DAILY_ACTIVITY (USER_ID, LOCAL_DATE, COUNTS_FOR_STREAK) VALUES (:u, TO_DATE('2026-11-15','YYYY-MM-DD'), 2)`,
  { u: userA },
  'ORA-02290',
);

// 5. executeMany + batchErrors (thin mode)
const mode = oracledb.thin ? 'thin' : 'thick';
check('node-oracledb em thin mode', mode === 'thin', `mode=${mode} lib=${oracledb.versionString}`);
const base = ev(userA, 10);
const batch = [ev(userA, 11), { ...ev(userA, 12), id: base.id }, ev(userA, 13), ev(userA, 14)];
await insertEv(base);
const before = await count('PROGRESS_EVENTS', 'USER_ID = :u', { u: userA });
const r1 = await conn.executeMany(EV_SQL, batch, { batchErrors: true });
const after = await count('PROGRESS_EVENTS', 'USER_ID = :u', { u: userA });
const errs1 = r1.batchErrors ?? [];
check(
  'batchErrors: so o ID duplicado falha (ORA-00001, offset 1)',
  errs1.length === 1 && errs1[0].offset === 1 && String(errs1[0].message).includes('ORA-00001'),
  JSON.stringify(errs1.map((e) => [e.offset, String(e.message).split(':')[0]])),
);
check(
  'batchErrors: os demais entram',
  r1.rowsAffected === 3 && after - before === 3,
  `rowsAffected=${r1.rowsAffected} delta=${after - before}`,
);
const mixed = [
  ev(userA, 20),
  ev(userA, 21, 'nao-json'),
  ev(userA, 22),
  { ...ev(userA, 23), id: base.id },
];
const r2 = await conn.executeMany(EV_SQL, mixed, { batchErrors: true });
const errs2 = (r2.batchErrors ?? []).map((e) => [e.offset, String(e.message).split(':')[0]]);
check(
  'batchErrors: erros mistos reportam offset correto (1=ORA-02290, 3=ORA-00001)',
  JSON.stringify(errs2) ===
    JSON.stringify([
      [1, 'ORA-02290'],
      [3, 'ORA-00001'],
    ]) && r2.rowsAffected === 2,
  JSON.stringify(errs2),
);
const seqs = (
  await conn.execute(
    `SELECT SERVER_SEQ FROM PROGRESS_EVENTS WHERE USER_ID = :u ORDER BY SERVER_SEQ`,
    { u: userA },
    OBJ,
  )
).rows.map((r) => r.SERVER_SEQ);
check(
  'SERVER_SEQ unico e crescente',
  seqs.length > 1 && seqs.every((v, i) => i === 0 || v > seqs[i - 1]),
  `n=${seqs.length}`,
);

// 6. Tabelas de projecao: DML + constraints de PK, depois cascade
await conn.execute(`INSERT INTO USER_PROGRESS_STATE (USER_ID) VALUES (:u)`, { u: userA });
await conn.execute(
  `UPDATE USER_PROGRESS_STATE SET XP_TOTAL = :x, STATE_VERSION = STATE_VERSION + 1 WHERE USER_ID = :u`,
  { x: 10, u: userA },
);
await conn.execute(`SELECT XP_TOTAL FROM USER_PROGRESS_STATE WHERE USER_ID = :u FOR UPDATE`, {
  u: userA,
});
check('USER_PROGRESS_STATE insert/update/select for update', true);
await conn.execute(`INSERT INTO SYNC_DEVICES (USER_ID, DEVICE_ID) VALUES (:u, :d)`, {
  u: userA,
  d: Buffer.alloc(16, 1),
});
await conn.execute(
  `INSERT INTO DAILY_ACTIVITY (USER_ID, LOCAL_DATE, XP) VALUES (:u, TO_DATE('2026-11-15','YYYY-MM-DD'), 10)`,
  { u: userA },
);
await conn.execute(`INSERT INTO LESSON_PROGRESS (USER_ID, LESSON_ID) VALUES (:u, 'u01.l01')`, {
  u: userA,
});
await conn.execute(
  `INSERT INTO REVIEW_CARDS (USER_ID, CARD_ID, EASINESS, INTERVAL_DAYS, REPETITIONS, DUE_AT)
   VALUES (:u, 'c01', 2.5, 1, 0, SYSTIMESTAMP)`,
  { u: userA },
);
const guest = randomBytes(16);
await conn.execute(`INSERT INTO GUEST_CLAIMS (GUEST_ID, USER_ID) VALUES (:g, :u)`, {
  g: guest,
  u: userA,
});
await expectOra(
  'PK GUEST_CLAIMS (mesmo guestId por outro usuario)',
  `INSERT INTO GUEST_CLAIMS (GUEST_ID, USER_ID) VALUES (:g, :u)`,
  { g: guest, u: userB },
  'ORA-00001',
);
await expectOra(
  'PK composta LESSON_PROGRESS',
  `INSERT INTO LESSON_PROGRESS (USER_ID, LESSON_ID) VALUES (:u, 'u01.l01')`,
  { u: userA },
  'ORA-00001',
);
// usuario B so com um evento e um estado, para provar que o cascade nao toca em outro usuario
await insertEv(ev(userB, 1));
await conn.execute(`INSERT INTO USER_PROGRESS_STATE (USER_ID) VALUES (:u)`, { u: userB });

const perUser = {
  PROGRESS_EVENTS: 'USER_ID',
  SYNC_DEVICES: 'USER_ID',
  USER_PROGRESS_STATE: 'USER_ID',
  DAILY_ACTIVITY: 'USER_ID',
  LESSON_PROGRESS: 'USER_ID',
  REVIEW_CARDS: 'USER_ID',
  GUEST_CLAIMS: 'USER_ID',
};
for (const t of Object.keys(perUser)) {
  check(
    `pre-cascade ${t} tem linhas do usuario A`,
    (await count(t, 'USER_ID = :u', { u: userA })) > 0,
  );
}

// 7. Exclusao de conta: so DELETE FROM USERS; o cascade apaga as 7 tabelas sem DELETE direto em PROGRESS_EVENTS
await conn.execute(`DELETE FROM USERS WHERE ID = :u`, { u: userA });
for (const t of Object.keys(perUser)) {
  check(
    `cascade ${t} zerado apos DELETE USERS`,
    (await count(t, 'USER_ID = :u', { u: userA })) === 0,
  );
}
check(
  'cascade nao afeta outro usuario (PROGRESS_EVENTS de B intacto)',
  (await count('PROGRESS_EVENTS', 'USER_ID = :u', { u: userB })) === 1,
);

// 8. Reverte tudo e confirma que nao sobrou nada
await conn.rollback();
const leftUsers = await count('USERS', `EMAIL LIKE :p`, { p: `f1-07-%-${tag}@example.invalid` });
check('rollback: nenhum usuario de teste sobrou', leftUsers === 0);
for (const t of Object.keys(perUser)) {
  const n = await count(t, 'USER_ID IN (:a, :b)', { a: userA, b: userB });
  check(`rollback: ${t} sem lixo`, n === 0);
}
await conn.close();
process.exit(failed ? 1 : 0);
