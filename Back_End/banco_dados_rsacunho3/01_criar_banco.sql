-- =====================================================================
--  PASSO 1 — CRIAR O BANCO DE DADOS "banco_db"
-- =====================================================================
--  Rode conectado ao banco padrão "postgres":
--
--      psql -U postgres -f 01_criar_banco.sql
--
--  ATENÇÃO: o PostgreSQL NÃO aceita "IF NOT EXISTS" no CREATE DATABASE
--  (isso existe no MySQL, mas não aqui). Se o banco já existir, o comando
--  apenas mostra o erro "already exists": é inofensivo.
--
--  Este comando fica em um arquivo SEPARADO das tabelas porque, depois
--  de criar o banco, é preciso CONECTAR nele (opção -d) antes de criar
--  as tabelas. Se estivessem no mesmo arquivo, as tabelas seriam criadas
--  no banco "postgres", e não no "banco_db".
-- =====================================================================

CREATE DATABASE banco_db;
