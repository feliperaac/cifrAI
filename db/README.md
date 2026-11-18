# db - migracoes Oracle (F0-05)

Usuarios/DBA: ver `db/admin/README.md`. Aqui ficam as migracoes (Flyway) e testes de privilegio.

## Flyway (D4 fechada)
Imagem fixa `flyway/flyway:13.12.2-alpine` (OSS/Community). Detecta e migra **Oracle 19.0** sem plugin extra
(o driver Oracle ja vem na imagem). Conecta como `CIFRAI_MIG` por service name (`ORACLE_HOST/PORT/SERVICE` do `.env`).
Variaveis do `.env`: `ORACLE_MIG_USER`, `ORACLE_MIG_PASSWORD` (nunca commitar).

## Comandos (a partir da raiz do repo)
```
docker compose --profile migrate run --rm migrate info
docker compose --profile migrate run --rm migrate validate
docker compose --profile migrate run --rm migrate migrate
```
Reaplicar `migrate` sem migracao nova nao faz nada ("up to date").

## Convencoes
- `V<nnn>__descricao.sql`, imutavel apos aplicada; mudanca = arquivo novo; forward-only (Community nao tem undo).
- **Um DDL por arquivo**: DDL tem commit implicito no Oracle; falha no meio deixaria estado parcial (`flyway repair`).
- Sem `;` final nem `/` em arquivo de um unico comando.
- Compativel com a versao anterior da API (expandir -> migrar -> contrair).
- Tabela de historico: `CIFRAI_MIG."flyway_schema_history"` (minuscula, entre aspas; o APP nao enxerga).
- Dev nao exige backup. **Prod: backup do schema antes de migrar** (`infra/scripts/backup.sh`, ainda a criar).

## Acesso do CIFRAI_APP (decisao)
Tabelas pertencem a `CIFRAI_MIG`. O APP usa **`ALTER SESSION SET CURRENT_SCHEMA = CIFRAI_MIG`**
(node-oracledb: `connection.currentSchema = ...` ou `sessionCallback` do pool; nome vindo de `ORACLE_SCHEMA`,
padrao `CIFRAI_MIG`), em vez de sinonimos: `CIFRAI_MIG` nao tem `CREATE SYNONYM` e isso evita uma migracao por tabela.
CURRENT_SCHEMA so muda a resolucao de nomes; a seguranca vem dos `GRANT` por tabela, uma migracao `V...__grant_app_<tabela>.sql`
a cada tabela nova (so `SELECT, INSERT, UPDATE, DELETE`). Sem DDL, sem acesso ao historico do Flyway.
O codigo SQL da API usa nomes nao qualificados (`FROM USERS`).

## Tabelas atuais
`USERS` (PK `RAW(16)` via `SYS_GUID()`, e-mail unico e obrigatoriamente minusculo) e `APP_SETTINGS` (chave + JSON validado).

Modelo de progresso (F1-07, V005..V023, ADR-0002 item 8). Todas com FK `USER_ID -> USERS(ID) ON DELETE CASCADE`:

| Tabela | PK | Grant ao `CIFRAI_APP` | Indices (alem da PK) |
|---|---|---|---|
| `PROGRESS_EVENTS` (log append-only) | `ID` | **`SELECT, INSERT`** | `IX_PROGRESS_EVENTS_USER_EFF (USER_ID, EFFECTIVE_TS)`, `..._USER_SUBJ (USER_ID, SUBJECT_KEY, EFFECTIVE_TS)`, `..._USER_DATE (USER_ID, LOCAL_DATE)`; `UQ_PROGRESS_EVENTS_SERVER_SEQ` |
| `SYNC_DEVICES` | `(USER_ID, DEVICE_ID)` | `SELECT, INSERT, UPDATE, DELETE` | - |
| `USER_PROGRESS_STATE` (linha de lock do sync) | `USER_ID` | `SELECT, INSERT, UPDATE, DELETE` | - |
| `DAILY_ACTIVITY` | `(USER_ID, LOCAL_DATE)` | `SELECT, INSERT, UPDATE, DELETE` | - |
| `LESSON_PROGRESS` | `(USER_ID, LESSON_ID)` | `SELECT, INSERT, UPDATE, DELETE` | - |
| `REVIEW_CARDS` | `(USER_ID, CARD_ID)` | `SELECT, INSERT, UPDATE, DELETE` | `IX_REVIEW_CARDS_USER_DUE (USER_ID, DUE_AT)` |
| `GUEST_CLAIMS` | `GUEST_ID` | `SELECT, INSERT, UPDATE, DELETE` | `IX_GUEST_CLAIMS_USER (USER_ID)` (FK) |

Decisoes de modelagem (onde o ADR nao fixou):
- Contadores das projecoes sao `NOT NULL DEFAULT 0` (`RULES_VERSION` default 1); `USER_PROGRESS_STATE.DAILY_GOAL_XP` default 0 (= sem meta definida; a API define a meta padrao do produto ao criar a linha).
- Timestamps de auditoria (`RECEIVED_AT`, `FIRST_SEEN_AT`, `LAST_SYNC_AT`, `CLAIMED_AT`, `UPDATED_AT`) tem default UTC; o resto e informado pela API.
- `SERVER_SEQ` e `GENERATED ALWAYS AS IDENTITY` + `UNIQUE`: a API nao pode informa-lo (ORA-32795). Pode haver buracos na sequencia (rollback/cache); serve para ordem, nao para contagem.
- `PROGRESS_EVENTS.GUEST_ID` nao tem FK (o convidado nao existe no servidor). `DEVICE_ID` tambem nao (`SYNC_DEVICES` e criada depois do primeiro evento aceito).

### Menor privilegio em `PROGRESS_EVENTS` e exclusao de conta
O `CIFRAI_APP` so tem `SELECT, INSERT` em `PROGRESS_EVENTS`: nao ha `UPDATE` nem `DELETE` direto (ambos dao ORA-01031), entao o log e
imutavel para a aplicacao. A exclusao de conta (LGPD) exige **somente `DELETE` em `USERS`**: o `ON DELETE CASCADE` e executado pelo
motor com os direitos do dono do schema e nao exige privilegio do usuario sobre as tabelas filhas (provado em `progress-model.mjs`).
Portanto a rotina de exclusao faz `DELETE FROM USERS WHERE ID = :id` (uma transacao) e nao precisa de nada alem disso. Se um dia for
necessario apagar eventos sem apagar o usuario (ex.: arquivamento/retencao), isso exige uma migracao nova concedendo `DELETE` (ou um job
com usuario proprio) e deve passar por revisao de seguranca.
O cascade apaga linhas por `USER_ID`; em `PROGRESS_EVENTS` os indices `(USER_ID, ...)` evitam full scan.

## Testes
```
docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps \
  -v ./db/tests/app-privileges.mjs:/repo/apps/api/scripts/app-privileges.mjs:ro \
  api node scripts/app-privileges.mjs
```
Roda como `CIFRAI_APP`: DML ok, constraints, DDL negado (ORA-01031). Tudo com rollback. Requer imagem dev (`--build` se preciso). O mount cria um stub vazio em `apps/api/scripts/app-privileges.mjs` (root); `pnpm validate --db` o remove ao final. O WORKDIR da imagem dev e `/repo/apps/api`.
Tudo isso em um comando: `pnpm validate --db`.

Modelo de progresso (F1-07), mesmo padrao:
```
docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps \
  -v ./db/tests/progress-model.mjs:/repo/apps/api/scripts/progress-model.mjs:ro \
  api node scripts/progress-model.mjs
```
Como `CIFRAI_APP`: privilegios por tabela (dicionario `ALL_TAB_PRIVS`), UPDATE/DELETE negados em `PROGRESS_EVENTS`, FKs `CASCADE`,
CHECKs (JSON, `LATE`, `GOAL_MET`, `COUNTS_FOR_STREAK`), PK/FK/NOT NULL, `SERVER_SEQ` (UNIQUE + `GENERATED ALWAYS`),
`executeMany` com `batchErrors: true` em thin mode, e `DELETE FROM USERS` apagando as 7 tabelas sem tocar em outro usuario.
Tudo roda numa unica transacao que termina em `ROLLBACK` (usuarios de teste `f1-07-*@example.invalid`), e o fim confere que nao sobrou nada.
Tambem roda dentro de `pnpm validate --db`.

## Recomecar do zero (somente dev, destrutivo)
`flyway clean` vem desabilitado. Para limpar o schema `CIFRAI_MIG` inteiro:
`docker compose --profile migrate run --rm -e FLYWAY_CLEAN_DISABLED=false migrate clean` e depois `migrate`.
Nunca em prod. Alternativa: `db/admin/drop_users.sql` + `create_users.sql`.
