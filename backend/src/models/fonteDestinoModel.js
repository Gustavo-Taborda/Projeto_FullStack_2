// Acesso ao banco para a tabela "fontes_destinos" (contas, rendas e cartões).
const { pool } = require('../config/db');

const COLUNAS = 'id, nome, tipo, dia_fechamento, dia_vencimento, limite_centavos';

async function listar(usuarioId, tipo) {
  if (tipo) {
    const resultado = await pool.query(
      `SELECT ${COLUNAS} FROM fontes_destinos WHERE usuario_id = $1 AND tipo = $2 ORDER BY nome`,
      [usuarioId, tipo]
    );
    return resultado.rows;
  }

  const resultado = await pool.query(
    `SELECT ${COLUNAS} FROM fontes_destinos WHERE usuario_id = $1 ORDER BY nome`,
    [usuarioId]
  );
  return resultado.rows;
}

async function buscarPorId(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT ${COLUNAS} FROM fontes_destinos WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function criar(usuarioId, dados) {
  const resultado = await pool.query(
    `INSERT INTO fontes_destinos (usuario_id, nome, tipo, dia_fechamento, dia_vencimento, limite_centavos)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUNAS}`,
    [usuarioId, dados.nome, dados.tipo, dados.dia_fechamento, dados.dia_vencimento, dados.limite_centavos]
  );
  return resultado.rows[0];
}

async function atualizar(id, usuarioId, dados) {
  const resultado = await pool.query(
    `UPDATE fontes_destinos
     SET nome = $1, tipo = $2, dia_fechamento = $3, dia_vencimento = $4, limite_centavos = $5
     WHERE id = $6 AND usuario_id = $7
     RETURNING ${COLUNAS}`,
    [dados.nome, dados.tipo, dados.dia_fechamento, dados.dia_vencimento, dados.limite_centavos, id, usuarioId]
  );
  return resultado.rows[0];
}

async function contarLancamentos(id) {
  const resultado = await pool.query(
    'SELECT COUNT(*)::int AS quantidade FROM lancamentos WHERE fonte_destino_id = $1',
    [id]
  );
  return resultado.rows[0].quantidade;
}

async function excluir(id, usuarioId) {
  await pool.query('DELETE FROM fontes_destinos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
}

module.exports = { listar, buscarPorId, criar, atualizar, contarLancamentos, excluir };
