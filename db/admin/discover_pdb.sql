-- Somente leitura. Mostra onde voce esta e quais PDBs/services existem.
-- Rode como DBA no service name informado (ORCL) para saber se e CDB ou PDB.
SET LINESIZE 200
COLUMN name FORMAT A30
COLUMN pdb FORMAT A20
SELECT SYS_CONTEXT('USERENV','CON_NAME') con_name,
       SYS_CONTEXT('USERENV','SERVICE_NAME') service_name FROM dual;
SELECT name, open_mode FROM v$pdbs;
SELECT name, pdb FROM v$services ORDER BY pdb, name;
-- NNE do servidor (informativo; o thin mode nao suporta NNE):
SELECT network_service_banner FROM v$session_connect_info
 WHERE sid = SYS_CONTEXT('USERENV','SID');
EXIT 0
