-- =============================================================================
-- CifrAI - criacao dos usuarios de banco (F0-04)
-- Executar COMO DBA (ex.: SYSTEM ou SYS AS SYSDBA), CONECTADO NO PDB.
--   Nunca no CDB$ROOT: o script aborta se detectar isso.
--
-- Cria:
--   CIFRAI_MIG : dono do schema; DDL via Flyway apenas. Nao e usado pela API.
--   CIFRAI_APP : usuario da API; so CREATE SESSION aqui. Os GRANTs de DML por
--                tabela sao feitos pelas migracoes (dono = CIFRAI_MIG).
--
-- Senhas: NUNCA no arquivo. Sao lidas por ACCEPT ... HIDE (prompt) ou, se as
-- variaveis ja estiverem definidas (DEFINE mig_pwd=... no wrapper do DBA),
-- reaproveitadas. Tablespace: variavel opcional ts_name (default USERS).
--
-- Uso:  sqlplus <dba>@//HOST:1521/<SERVICE_DO_PDB> @db/admin/create_users.sql
-- =============================================================================
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET VERIFY OFF
SET SERVEROUTPUT ON
SET DEFINE '&'

-- 1) Guarda de PDB: aborta no CDB$ROOT ------------------------------------
DECLARE
  v_con VARCHAR2(128) := SYS_CONTEXT('USERENV', 'CON_NAME');
BEGIN
  DBMS_OUTPUT.PUT_LINE('CON_NAME=' || v_con || ' SERVICE=' || SYS_CONTEXT('USERENV','SERVICE_NAME'));
  IF v_con = 'CDB$ROOT' THEN
    RAISE_APPLICATION_ERROR(-20001,
      'Conectado no CDB$ROOT. Reconecte usando o service name do PDB (veja db/admin/README.md).');
  END IF;
END;
/

-- 2) Parametros (senhas por prompt oculto; nunca ecoadas) -------------------
DEFINE ts_name = USERS
ACCEPT mig_pwd CHAR PROMPT 'Senha de CIFRAI_MIG: ' HIDE
ACCEPT app_pwd CHAR PROMPT 'Senha de CIFRAI_APP: ' HIDE

-- 3) Pre-checagens: tablespace existe e usuarios ainda nao existem ----------
DECLARE
  v_n NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_n FROM dba_tablespaces WHERE tablespace_name = UPPER('&&ts_name');
  IF v_n = 0 THEN
    RAISE_APPLICATION_ERROR(-20002, 'Tablespace &&ts_name nao existe. Ajuste ts_name.');
  END IF;
  SELECT COUNT(*) INTO v_n FROM dba_users WHERE username IN ('CIFRAI_MIG','CIFRAI_APP');
  IF v_n > 0 THEN
    RAISE_APPLICATION_ERROR(-20003, 'CIFRAI_MIG/CIFRAI_APP ja existe. Veja README para DROP USER.');
  END IF;
END;
/

-- 4) Usuarios --------------------------------------------------------------
-- Senha entre aspas duplas permite caracteres especiais. Verificador 11G/12C
-- (padrao do 19c) e exigido pelo thin mode do node-oracledb (nao aceita 10G).
CREATE USER CIFRAI_MIG IDENTIFIED BY "&&mig_pwd"
  DEFAULT TABLESPACE &&ts_name TEMPORARY TABLESPACE TEMP QUOTA UNLIMITED ON &&ts_name;
CREATE USER CIFRAI_APP IDENTIFIED BY "&&app_pwd"
  DEFAULT TABLESPACE &&ts_name TEMPORARY TABLESPACE TEMP QUOTA 0 ON &&ts_name;

-- 5) Privilegios minimos ----------------------------------------------------
-- MIG: so objetos do proprio schema. Sem CREATE ANY, sem DBA/RESOURCE.
-- (Flyway cria a tabela FLYWAY_SCHEMA_HISTORY no schema de CIFRAI_MIG.)
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE VIEW,
      CREATE PROCEDURE, CREATE TRIGGER, CREATE TYPE TO CIFRAI_MIG;
-- APP: apenas conectar. DML por tabela via GRANT nas migracoes.
GRANT CREATE SESSION TO CIFRAI_APP;

-- 6) Verificacao (saida para o validation_log) ------------------------------
COLUMN username FORMAT A12
COLUMN password_versions FORMAT A16
COLUMN account_status FORMAT A10
COLUMN default_tablespace FORMAT A12
SELECT username, account_status, default_tablespace, password_versions
  FROM dba_users WHERE username IN ('CIFRAI_MIG','CIFRAI_APP') ORDER BY username;
SELECT grantee, privilege FROM dba_sys_privs
 WHERE grantee IN ('CIFRAI_MIG','CIFRAI_APP') ORDER BY grantee, privilege;
SELECT username, tablespace_name, max_bytes FROM dba_ts_quotas
 WHERE username IN ('CIFRAI_MIG','CIFRAI_APP');
-- password_versions deve conter 11G e/ou 12C (nao apenas 10G).

UNDEFINE mig_pwd app_pwd
EXIT 0
