// Acesso ao banco para a tabela "categorias".
// TODAS as consultas filtram por usuario_id: um usuário nunca enxerga dados de outro.
const { pool } = require('../config/db');

async function listar(usuarioId, tipo) {
  if (tipo) {
    const resultado = await pool.query(
      'SELECT id, nome, tipo FROM categorias WHERE usuario_id = $1 AND tipo = $2 ORDER BY nome',
      [usuarioId, tipo]
    );
    return resultado.rows;
  }

  const resultado = await pool.query(
    'SELECT id, nome, tipo FROM categorias WHERE usuario_id = $1 ORDER BY tipo, nome',
    [usuarioId]
  );
  return resultado.rows;
}

async function buscarPorId(id, usuarioId) {
  const resultado = await pool.query(
    'SELECT id, nome, tipo FROM categorias WHERE id = $1 AND usuario_id = $2',
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function criar(usuarioId, nome, tipo) {
  const resultado = await pool.query(
    'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3) RETURNING id, nome, tipo',
    [usuarioId, nome, tipo]
  );
  return resultado.rows[0];
}

async function atualizar(id, usuarioId, nome) {
  const resultado = await pool.query(
    'UPDATE categorias SET nome = $1 WHERE id = $2 AND usuario_id = $3 RETURNING id, nome, tipo',
    [nome, id, usuarioId]
  );
  return resultado.rows[0];
}

async function contarLancamentos(id) {
  const resultado = await pool.query(
    'SELECT COUNT(*)::int AS quantidade FROM lancamentos WHERE categoria_id = $1',
    [id]
  );
  return resultado.rows[0].quantidade;
}

async function excluir(id, usuarioId) {
  await pool.query('DELETE FROM categorias WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
}

module.exports = { listar, buscarPorId, criar, atualizar, contarLancamentos, excluir };
