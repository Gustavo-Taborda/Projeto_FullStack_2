// Acesso ao banco para a tabela "usuarios" (e criação dos dados padrão no cadastro).
const { pool } = require('../config/db');

const CATEGORIAS_PADRAO = [
  { nome: 'Salário', tipo: 'entrada' },
  { nome: 'Outros', tipo: 'entrada' },
  { nome: 'Alimentação', tipo: 'saida' },
  { nome: 'Moradia', tipo: 'saida' },
  { nome: 'Saúde', tipo: 'saida' },
  { nome: 'Mobilidade', tipo: 'saida' },
  { nome: 'Lazer', tipo: 'saida' },
  { nome: 'Educação', tipo: 'saida' },
  { nome: 'Outros', tipo: 'saida' },
];

async function criar({ nome, email, cpf, senhaHash }) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const resultado = await cliente.query(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email, cpf, criado_em`,
      [nome, email, cpf, senhaHash]
    );
    const usuario = resultado.rows[0];

    for (const categoria of CATEGORIAS_PADRAO) {
      await cliente.query(
        'INSERT INTO categorias (usuario_id, nome, tipo) VALUES ($1, $2, $3)',
        [usuario.id, categoria.nome, categoria.tipo]
      );
    }

    await cliente.query(
      "INSERT INTO fontes_destinos (usuario_id, nome, tipo) VALUES ($1, 'Conta corrente', 'conta')",
      [usuario.id]
    );

    await cliente.query('COMMIT');
    return usuario;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

async function buscarPorEmail(email) {
  const resultado = await pool.query(
    'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1',
    [email]
  );
  return resultado.rows[0];
}

async function buscarPorId(id) {
  const resultado = await pool.query(
    'SELECT id, nome, email, cpf, criado_em FROM usuarios WHERE id = $1',
    [id]
  );
  return resultado.rows[0];
}

module.exports = { criar, buscarPorEmail, buscarPorId };
