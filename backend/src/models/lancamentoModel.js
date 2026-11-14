// Acesso ao banco para a tabela "lancamentos".
const crypto = require('crypto');
const { pool } = require('../config/db');
const { dividirEmParcelas } = require('../config/calculos');

// Cria um lançamento. Se totalParcelas > 1, cria UMA LINHA POR PARCELA,
// todas com o mesmo grupo_parcelamento, dentro de uma TRANSAÇÃO (todas ou nenhuma).
async function criar(usuarioId, dados, totalParcelas) {
  const valores = dividirEmParcelas(dados.valor_centavos, totalParcelas);
  const grupo = totalParcelas > 1 ? crypto.randomUUID() : null;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const criados = [];
    for (let i = 0; i < totalParcelas; i++) {
      const resultado = await cliente.query(
        `INSERT INTO lancamentos
           (usuario_id, tipo, descricao, valor_centavos, data, categoria_id, fonte_destino_id,
            parcela_atual, total_parcelas, grupo_parcelamento)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          usuarioId, dados.tipo, dados.descricao, valores[i], dados.data,
          dados.categoria_id, dados.fonte_destino_id, i + 1, totalParcelas, grupo,
        ]
      );
      criados.push(resultado.rows[0]);
    }

    await cliente.query('COMMIT');
    return criados;
  } catch (erro) {
    await cliente.query('ROLLBACK');
    throw erro;
  } finally {
    cliente.release();
  }
}

// Monta o WHERE de acordo com os filtros recebidos.
// Cada filtro novo vira "$N" e o valor vai para o array (consulta parametrizada).
function montarFiltros(usuarioId, filtros) {
  const condicoes = ['l.usuario_id = $1', 'l.data BETWEEN $2 AND $3'];
  const valores = [usuarioId, filtros.inicio, filtros.fim];

  if (filtros.tipo) {
    valores.push(filtros.tipo);
    condicoes.push(`l.tipo = $${valores.length}`);
  }
  if (filtros.categoriaId) {
    valores.push(filtros.categoriaId);
    condicoes.push(`l.categoria_id = $${valores.length}`);
  }
  if (filtros.fonteDestinoId) {
    valores.push(filtros.fonteDestinoId);
    condicoes.push(`l.fonte_destino_id = $${valores.length}`);
  }

  return { where: condicoes.join(' AND '), valores };
}

async function listar(usuarioId, filtros) {
  const { where, valores } = montarFiltros(usuarioId, filtros);

  // Totais calculados NO BANCO (SUM), não somando listas no front-end
  const totais = await pool.query(
    `SELECT
       COUNT(*)::int AS quantidade,
       COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor_centavos END), 0)::int AS entradas,
       COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor_centavos END), 0)::int AS saidas
     FROM lancamentos l
     WHERE ${where}`,
    valores
  );

  const deslocamento = (filtros.pagina - 1) * filtros.limite;
  const lista = await pool.query(
    `SELECT l.*, c.nome AS categoria_nome, f.nome AS fonte_destino_nome, f.tipo AS fonte_destino_tipo
     FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id
     JOIN fontes_destinos f ON f.id = l.fonte_destino_id
     WHERE ${where}
     ORDER BY l.data DESC, l.id DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, filtros.limite, deslocamento]
  );

  return { lancamentos: lista.rows, totais: totais.rows[0] };
}

async function buscarPorId(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT l.*, c.nome AS categoria_nome, f.nome AS fonte_destino_nome
     FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id
     JOIN fontes_destinos f ON f.id = l.fonte_destino_id
     WHERE l.id = $1 AND l.usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function atualizar(id, usuarioId, dados) {
  const resultado = await pool.query(
    `UPDATE lancamentos
     SET tipo = $1, descricao = $2, valor_centavos = $3, data = $4, categoria_id = $5, fonte_destino_id = $6
     WHERE id = $7 AND usuario_id = $8
     RETURNING *`,
    [dados.tipo, dados.descricao, dados.valor_centavos, dados.data,
      dados.categoria_id, dados.fonte_destino_id, id, usuarioId]
  );
  return resultado.rows[0];
}

async function excluir(id, usuarioId) {
  await pool.query('DELETE FROM lancamentos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
}

async function excluirGrupo(grupo, usuarioId) {
  await pool.query(
    'DELETE FROM lancamentos WHERE grupo_parcelamento = $1 AND usuario_id = $2',
    [grupo, usuarioId]
  );
}

module.exports = { criar, listar, buscarPorId, atualizar, excluir, excluirGrupo };
