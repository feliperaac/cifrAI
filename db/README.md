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
Progresso/XP/streak ficam para F1-07.

## Testes
```
docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps \
  -v ./db/tests/app-privileges.mjs:/repo/apps/api/scripts/app-privileges.mjs:ro \
  api node scripts/app-privileges.mjs
```
Roda como `CIFRAI_APP`: DML ok, constraints, DDL negado (ORA-01031). Tudo com rollback. Requer imagem dev (`--build` se preciso). O mount cria um stub vazio em `apps/api/scripts/app-privileges.mjs` (root); `pnpm validate --db` o remove ao final. O WORKDIR da imagem dev e `/repo/apps/api`.
Tudo isso em um comando: `pnpm validate --db`.

## Recomecar do zero (somente dev, destrutivo)
`flyway clean` vem desabilitado. Para limpar o schema `CIFRAI_MIG` inteiro:
`docker compose --profile migrate run --rm -e FLYWAY_CLEAN_DISABLED=false migrate clean` e depois `migrate`.
Nunca em prod. Alternativa: `db/admin/drop_users.sql` + `create_users.sql`.
