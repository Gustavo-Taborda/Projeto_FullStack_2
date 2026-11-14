// Rotas de fontes/destinos: /api/fontes-destinos
const express = require('express');
const fonteDestinoModel = require('../models/fonteDestinoModel');
const { verificarToken } = require('../middlewares/autenticacao');
const { criarErro } = require('../middlewares/erros');
const { paraId } = require('../config/validacoes');

const router = express.Router();
router.use(verificarToken);

const TIPOS = ['renda', 'conta', 'cartao_credito'];

function diaValido(dia) {
  return Number.isInteger(dia) && dia >= 1 && dia <= 31;
}

// Valida o corpo da requisição e devolve os dados prontos para gravar.
function validarFonteDestino(corpo) {
  const dados = corpo || {};
  const erros = {};

  const nome = String(dados.nome || '').trim();
  if (!nome) erros.nome = 'Informe o nome';
  else if (nome.length > 60) erros.nome = 'O nome pode ter no máximo 60 caracteres';

  const tipo = dados.tipo;
  if (!TIPOS.includes(tipo)) erros.tipo = 'O tipo deve ser renda, conta ou cartão de crédito';

  // Campos de cartão: obrigatórios SÓ quando o tipo é cartão; senão ficam nulos
  let diaFechamento = null;
  let diaVencimento = null;
  let limite = null;

  if (tipo === 'cartao_credito') {
    diaFechamento = Number(dados.dia_fechamento);
    diaVencimento = Number(dados.dia_vencimento);
    limite = Number(dados.limite_centavos);

    if (!diaValido(diaFechamento)) erros.dia_fechamento = 'Informe um dia de fechamento de 1 a 31';
    if (!diaValido(diaVencimento)) erros.dia_vencimento = 'Informe um dia de vencimento de 1 a 31';
    if (!Number.isInteger(limite) || limite <= 0) erros.limite_centavos = 'Informe um limite maior que zero';
  }

  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Dados inválidos', erros);
  }

  return {
    nome,
    tipo,
    dia_fechamento: diaFechamento,
    dia_vencimento: diaVencimento,
    limite_centavos: limite,
  };
}

function erroDeNomeRepetido() {
  return criarErro(409, 'Fonte/destino já existe', { nome: 'Já existe uma fonte/destino com este nome' });
}

// GET /api/fontes-destinos?tipo=cartao_credito
router.get('/', async (req, res) => {
  const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
  const lista = await fonteDestinoModel.listar(req.usuarioId, tipo);
  res.json(lista);
});

// POST /api/fontes-destinos
router.post('/', async (req, res) => {
  const dados = validarFonteDestino(req.body);
  try {
    const criado = await fonteDestinoModel.criar(req.usuarioId, dados);
    res.status(201).json(criado);
  } catch (erro) {
    if (erro.code === '23505') throw erroDeNomeRepetido();
    throw erro;
  }
});

// PUT /api/fontes-destinos/:id
router.put('/:id', async (req, res) => {
  const id = paraId(req.params.id);
  const dados = validarFonteDestino(req.body);
  try {
    const atualizado = await fonteDestinoModel.atualizar(id, req.usuarioId, dados);
    if (!atualizado) {
      throw criarErro(404, 'Fonte/destino não encontrado');
    }
    res.json(atualizado);
  } catch (erro) {
    if (erro.code === '23505') throw erroDeNomeRepetido();
    throw erro;
  }
});

// DELETE /api/fontes-destinos/:id
router.delete('/:id', async (req, res) => {
  const id = paraId(req.params.id);

  const existente = await fonteDestinoModel.buscarPorId(id, req.usuarioId);
  if (!existente) {
    throw criarErro(404, 'Fonte/destino não encontrado');
  }

  const quantidade = await fonteDestinoModel.contarLancamentos(id);
  if (quantidade > 0) {
    throw criarErro(409, `Não é possível excluir: existem ${quantidade} lançamento(s) vinculado(s)`);
  }

  await fonteDestinoModel.excluir(id, req.usuarioId);
  res.status(204).end();
});

module.exports = router;
