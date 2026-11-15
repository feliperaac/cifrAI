# db/admin - usuarios do Oracle (F0-04)

Scripts de DBA, executados **uma vez por PDB/ambiente**. Nao sao migracoes do Flyway.

| Arquivo | Funcao |
|---|---|
| `discover_pdb.sql` | Somente leitura: mostra `CON_NAME`, PDBs e services. |
| `create_users.sql` | Cria `CIFRAI_MIG` (DDL/Flyway) e `CIFRAI_APP` (API). Aborta se estiver no `CDB$ROOT`. |
| `drop_users.sql` | Reverte (DROP USER ... CASCADE). Destrutivo. |

## 1. Descobrir o service name do PDB
`ORCL` pode ser o CDB. Os usuarios **devem** ficar no PDB (service name do PDB, ex. `ORCLPDB1`).
Como DBA: `sqlplus system@//192.168.20.242:1521/ORCL @db/admin/discover_pdb.sql`.
Se `CON_NAME = CDB$ROOT`, use na coluna `NAME` de `v$pdbs` o PDB desejado e reconecte
com o service dele (`v$services` onde `pdb` = nome do PDB). Registre o service correto
em `ORACLE_SERVICE` no `.env` (nunca commitado).

## 2. Criar
```
sqlplus <dba>@//192.168.20.242:1521/<SERVICE_DO_PDB> @db/admin/create_users.sql
```
O script pede as senhas com prompt oculto (nada fica no arquivo, no historico ou no chat).
Tablespace padrao `USERS`; mude a linha `DEFINE ts_name` se preciso. Privilegios:
`CIFRAI_MIG` = CREATE SESSION/TABLE/SEQUENCE/VIEW/PROCEDURE/TRIGGER/TYPE + quota no tablespace;
`CIFRAI_APP` = so CREATE SESSION, quota 0. O DML do app e concedido por tabela nas
migracoes (`GRANT SELECT, INSERT, UPDATE, DELETE ON T TO CIFRAI_APP`) a partir de F0-05.
Como o app nao possui as tabelas, a API deve usar `ALTER SESSION SET CURRENT_SCHEMA = CIFRAI_MIG`
(ou sinonimos criados nas migracoes) - decidir em F0-05/F0-06.

## 3. Verificar
A propria execucao lista usuarios, `password_versions` (deve ter `11G`/`12C`, nunca so `10G`),
privilegios e quotas. Depois rode o teste de conexao (`apps/api/scripts/oracle-check.mjs`).

## 4. Reverter
```
sqlplus <dba>@//192.168.20.242:1521/<SERVICE_DO_PDB> @db/admin/drop_users.sql
```
Apaga todos os dados de `CIFRAI_MIG`. Em prod: backup antes.
