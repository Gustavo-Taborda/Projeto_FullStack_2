// Consultas de relatórios. As somas são feitas NO BANCO com SUM e GROUP BY.
const { pool } = require('../config/db');

// Total por categoria no período atual E no período anterior, numa única consulta.
// FILTER (WHERE ...) faz o SUM considerar só as linhas daquele período.
async function totaisPorCategoria(usuarioId, periodo, anterior) {
  const resultado = await pool.query(
    `SELECT c.id, c.nome, c.tipo,
       COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.data BETWEEN $2 AND $3), 0)::int AS total_centavos,
       COALESCE(SUM(l.valor_centavos) FILTER (WHERE l.data BETWEEN $4 AND $5), 0)::int AS total_anterior_centavos
     FROM categorias c
     LEFT JOIN lancamentos l ON l.categoria_id = c.id
     WHERE c.usuario_id = $1
     GROUP BY c.id, c.nome, c.tipo
     ORDER BY total_centavos DESC, c.nome`,
    [usuarioId, periodo.inicio, periodo.fim, anterior.inicio, anterior.fim]
  );
  return resultado.rows;
}

// Entradas e saídas de cada fonte/destino no período.
async function totaisPorFonteDestino(usuarioId, periodo) {
  const resultado = await pool.query(
    `SELECT f.id, f.nome, f.tipo,
       COALESCE(SUM(CASE WHEN l.tipo = 'entrada' THEN l.valor_centavos END), 0)::int AS entradas_centavos,
       COALESCE(SUM(CASE WHEN l.tipo = 'saida' THEN l.valor_centavos END), 0)::int AS saidas_centavos
     FROM fontes_destinos f
     LEFT JOIN lancamentos l
       ON l.fonte_destino_id = f.id AND l.data BETWEEN $2 AND $3
     WHERE f.usuario_id = $1
     GROUP BY f.id, f.nome, f.tipo
     ORDER BY f.nome`,
    [usuarioId, periodo.inicio, periodo.fim]
  );
  return resultado.rows;
}

// Todas as parcelas de saída lançadas em um cartão (usadas para montar as faturas).
async function parcelasDoCartao(cartaoId, usuarioId) {
  const resultado = await pool.query(
    `SELECT id, descricao, valor_centavos, data, parcela_atual, total_parcelas
     FROM lancamentos
     WHERE fonte_destino_id = $1 AND usuario_id = $2 AND tipo = 'saida'
     ORDER BY data, id`,
    [cartaoId, usuarioId]
  );
  return resultado.rows;
}

module.exports = { totaisPorCategoria, totaisPorFonteDestino, parcelasDoCartao };
