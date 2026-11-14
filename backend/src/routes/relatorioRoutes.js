// Rotas de relatórios: /api/relatorios
const express = require('express');
const relatorioModel = require('../models/relatorioModel');
const fonteDestinoModel = require('../models/fonteDestinoModel');
const { verificarToken } = require('../middlewares/autenticacao');
const { lerPeriodo } = require('../config/validacoes');
const { periodoAnterior, montarFaturas, hoje } = require('../config/calculos');

const router = express.Router();
router.use(verificarToken);

// Percentual com 1 casa decimal (evita divisão por zero)
function percentual(parte, total) {
  if (total === 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

// Monta a lista de um tipo (entrada ou saída) com percentual e comparação
function montarGrupo(linhas, tipo) {
  const doTipo = linhas.filter((linha) => linha.tipo === tipo
    && (linha.total_centavos > 0 || linha.total_anterior_centavos > 0));

  let total = 0;
  for (const linha of doTipo) total += linha.total_centavos;

  const categorias = doTipo.map((linha) => {
    const diferenca = linha.total_centavos - linha.total_anterior_centavos;
    let variacao = 'igual';
    if (diferenca > 0) variacao = 'aumento';
    if (diferenca < 0) variacao = 'reducao';

    return {
      id: linha.id,
      nome: linha.nome,
      total_centavos: linha.total_centavos,
      percentual: percentual(linha.total_centavos, total),
      total_anterior_centavos: linha.total_anterior_centavos,
      diferenca_centavos: diferenca,
      variacao,
    };
  });

  return { total_centavos: total, categorias };
}

// GET /api/relatorios/categorias?inicio=&fim=   (RF7)
router.get('/categorias', async (req, res) => {
  const periodo = lerPeriodo(req.query);
  const anterior = periodoAnterior(periodo.inicio, periodo.fim);
  const linhas = await relatorioModel.totaisPorCategoria(req.usuarioId, periodo, anterior);

  res.json({
    periodo,
    periodo_anterior: anterior,
    saidas: montarGrupo(linhas, 'saida'),
    entradas: montarGrupo(linhas, 'entrada'),
  });
});

// GET /api/relatorios/fontes-destinos?inicio=&fim=   (RF8)
router.get('/fontes-destinos', async (req, res) => {
  const periodo = lerPeriodo(req.query);
  const linhas = await relatorioModel.totaisPorFonteDestino(req.usuarioId, periodo);

  const itens = linhas.map((linha) => ({
    ...linha,
    // Saldo só faz sentido para contas
    saldo_centavos: linha.tipo === 'conta' ? linha.entradas_centavos - linha.saidas_centavos : null,
  }));

  res.json({ periodo, itens });
});

// GET /api/relatorios/faturas?meses=3   (RF9)
router.get('/faturas', async (req, res) => {
  const meses = Math.min(12, Math.max(3, Number.parseInt(req.query.meses, 10) || 3));
  const cartoes = await fonteDestinoModel.listar(req.usuarioId, 'cartao_credito');
  const dataHoje = hoje();

  const resultado = [];
  for (const cartao of cartoes) {
    const parcelas = await relatorioModel.parcelasDoCartao(cartao.id, req.usuarioId);
    resultado.push(montarFaturas(cartao, parcelas, dataHoje, meses));
  }

  res.json({ hoje: dataHoje, cartoes: resultado });
});

module.exports = router;
