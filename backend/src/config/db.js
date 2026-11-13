// Conexão com o PostgreSQL usando um POOL de conexões.
// O pool mantém algumas conexões abertas e as reaproveita a cada requisição.
const { Pool, types } = require('pg');

// Por padrão o 'pg' transforma colunas DATE em objetos Date do JavaScript,
// o que pode "mudar o dia" por causa do fuso horário.
// Aqui pedimos para receber a data como texto puro: '2026-11-12'.
// (1082 é o código interno do tipo DATE no PostgreSQL)
types.setTypeParser(1082, (valor) => valor);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function testarConexao() {
  try {
    await pool.query('SELECT 1');
    console.log('Banco de dados conectado!');
  } catch (erro) {
    console.error('Não foi possível conectar ao banco:', erro.message);
  }
}

module.exports = { pool, testarConexao };
