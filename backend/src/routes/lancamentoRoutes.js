// Rotas de lançamentos: /api/lancamentos
const express = require('express');
const lancamentoModel = require('../models/lancamentoModel');
const categoriaModel = require('../models/categoriaModel');
const fonteDestinoModel = require('../models/fonteDestinoModel');
const { verificarToken } = require('../middlewares/autenticacao');
const { criarErro } = require('../middlewares/erros');
const { paraId, lerPeriodo } = require('../config/validacoes');
const { dataValida } = require('../config/calculos');

const router = express.Router();
router.use(verificarToken);

const TIPOS = ['entrada', 'saida'];
const NOME_DO_TIPO = { entrada: 'entrada', saida: 'saída' };

// Valida um lançamento (usado na criação e na edição).
// Confere também se a categoria e a fonte/destino pertencem ao usuário logado.
async function validarLancamento(corpo, usuarioId, totalParcelas) {
  const dados = corpo || {};
  const erros = {};

  const tipo = dados.tipo;
  if (!TIPOS.includes(tipo)) erros.tipo = 'O tipo deve ser entrada ou saída';

  const descricao = String(dados.descricao || '').trim();
  if (!descricao) erros.descricao = 'Informe a descrição';
  else if (descricao.length > 200) erros.descricao = 'A descrição pode ter no máximo 200 caracteres';

  const valor = Number(dados.valor_centavos);
  if (!Number.isInteger(valor) || valor <= 0) erros.valor_centavos = 'O valor deve ser maior que zero';

  if (!dataValida(dados.data)) erros.data = 'Informe uma data válida';

  if (!Number.isInteger(totalParcelas) || totalParcelas < 1 || totalParcelas > 48) {
    erros.total_parcelas = 'O número de parcelas deve ser de 1 a 48';
  }

  if (!dados.categoria_id) erros.categoria_id = 'Selecione a categoria';
  if (!dados.fonte_destino_id) erros.fonte_destino_id = 'Selecione a fonte/destino';

  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Dados inválidos', erros);
  }

  // Busca com o id do usuário do token: de outro usuário = "não existe" (404)
  const categoria = await categoriaModel.buscarPorId(paraId(dados.categoria_id), usuarioId);
  if (!categoria) {
    throw criarErro(404, 'Categoria não encontrada', { categoria_id: 'Categoria não encontrada' });
  }

  const fonteDestino = await fonteDestinoModel.buscarPorId(paraId(dados.fonte_destino_id), usuarioId);
  if (!fonteDestino) {
    throw criarErro(404, 'Fonte/destino não encontrado', { fonte_destino_id: 'Fonte/destino não encontrado' });
  }

  // Regras de negócio
  if (categoria.tipo !== tipo) {
    erros.categoria_id = `Esta categoria é de ${NOME_DO_TIPO[categoria.tipo]}; escolha uma categoria de ${NOME_DO_TIPO[tipo]}`;
  }
  if (totalParcelas > 1 && fonteDestino.tipo !== 'cartao_credito') {
    erros.total_parcelas = 'Parcelamento só é permitido em cartão de crédito';
  }
  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Dados inválidos', erros);
  }

  return {
    tipo,
    descricao,
    valor_centavos: valor,
    data: dados.data,
    categoria_id: categoria.id,
    fonte_destino_id: fonteDestino.id,
  };
}

// GET /api/lancamentos?inicio=&fim=&tipo=&categoria_id=&fonte_destino_id=&pagina=&limite=
router.get('/', async (req, res) => {
  const { inicio, fim } = lerPeriodo(req.query);

  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(100, Math.max(1, Number.parseInt(req.query.limite, 10) || 10));

  const filtros = {
    inicio,
    fim,
    tipo: TIPOS.includes(req.query.tipo) ? req.query.tipo : null,
    categoriaId: paraId(req.query.categoria_id),
    fonteDestinoId: paraId(req.query.fonte_destino_id),
    pagina,
    limite,
  };

  const { lancamentos, totais } = await lancamentoModel.listar(req.usuarioId, filtros);

  res.json({
    periodo: { inicio, fim },
    lancamentos,
    totais: {
      entradas_centavos: totais.entradas,
      saidas_centavos: totais.saidas,
      saldo_centavos: totais.entradas - totais.saidas,
    },
    paginacao: {
      pagina,
      limite,
      total_itens: totais.quantidade,
      total_paginas: Math.max(1, Math.ceil(totais.quantidade / limite)),
    },
  });
});

// GET /api/lancamentos/:id
router.get('/:id', async (req, res) => {
  const lancamento = await lancamentoModel.buscarPorId(paraId(req.params.id), req.usuarioId);
  if (!lancamento) {
    throw criarErro(404, 'Lançamento não encontrado');
  }
  res.json(lancamento);
});

// POST /api/lancamentos  (com parcelas: total_parcelas de 1 a 48)
router.post('/', async (req, res) => {
  const totalParcelas = Number((req.body || {}).total_parcelas || 1);
  const dados = await validarLancamento(req.body, req.usuarioId, totalParcelas);
  const criados = await lancamentoModel.criar(req.usuarioId, dados, totalParcelas);
  res.status(201).json(criados);
});

// PUT /api/lancamentos/:id  (edita um lançamento ou UMA parcela)
router.put('/:id', async (req, res) => {
  const id = paraId(req.params.id);
  const existente = await lancamentoModel.buscarPorId(id, req.usuarioId);
  if (!existente) {
    throw criarErro(404, 'Lançamento não encontrado');
  }

  // O número de parcelas não muda na edição
  const dados = await validarLancamento(req.body, req.usuarioId, existente.total_parcelas);
  const atualizado = await lancamentoModel.atualizar(id, req.usuarioId, dados);
  res.json(atualizado);
});

// DELETE /api/lancamentos/:id?todasParcelas=true
router.delete('/:id', async (req, res) => {
  const id = paraId(req.params.id);
  const existente = await lancamentoModel.buscarPorId(id, req.usuarioId);
  if (!existente) {
    throw criarErro(404, 'Lançamento não encontrado');
  }

  if (req.query.todasParcelas === 'true' && existente.grupo_parcelamento) {
    await lancamentoModel.excluirGrupo(existente.grupo_parcelamento, req.usuarioId);
  } else {
    await lancamentoModel.excluir(id, req.usuarioId);
  }
  res.status(204).end();
});

module.exports = router;
