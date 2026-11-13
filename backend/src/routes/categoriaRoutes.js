// Rotas de categorias: /api/categorias
const express = require('express');
const categoriaModel = require('../models/categoriaModel');
const { verificarToken } = require('../middlewares/autenticacao');
const { criarErro } = require('../middlewares/erros');
const { paraId } = require('../config/validacoes');

const router = express.Router();

// Todas as rotas deste arquivo exigem login (o middleware roda antes de cada uma)
router.use(verificarToken);

const TIPOS = ['entrada', 'saida'];

function validarNome(nome) {
  const nomeLimpo = String(nome || '').trim();
  if (!nomeLimpo) return { erro: 'Informe o nome' };
  if (nomeLimpo.length > 60) return { erro: 'O nome pode ter no máximo 60 caracteres' };
  return { nome: nomeLimpo };
}

// GET /api/categorias?tipo=saida
router.get('/', async (req, res) => {
  const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
  const categorias = await categoriaModel.listar(req.usuarioId, tipo);
  res.json(categorias);
});

// POST /api/categorias
router.post('/', async (req, res) => {
  const { nome, tipo } = req.body || {};

  const erros = {};
  const validacao = validarNome(nome);
  if (validacao.erro) erros.nome = validacao.erro;
  if (!TIPOS.includes(tipo)) erros.tipo = 'O tipo deve ser entrada ou saída';
  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Dados inválidos', erros);
  }

  try {
    const categoria = await categoriaModel.criar(req.usuarioId, validacao.nome, tipo);
    res.status(201).json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      throw criarErro(409, 'Categoria já existe', { nome: 'Já existe uma categoria com este nome e tipo' });
    }
    throw erro;
  }
});

// PUT /api/categorias/:id  (só o nome pode ser alterado; o tipo é fixo
// para não deixar lançamentos com categoria de tipo diferente)
router.put('/:id', async (req, res) => {
  const id = paraId(req.params.id);
  const validacao = validarNome((req.body || {}).nome);
  if (validacao.erro) {
    throw criarErro(400, 'Dados inválidos', { nome: validacao.erro });
  }

  try {
    const categoria = await categoriaModel.atualizar(id, req.usuarioId, validacao.nome);
    if (!categoria) {
      throw criarErro(404, 'Categoria não encontrada');
    }
    res.json(categoria);
  } catch (erro) {
    if (erro.code === '23505') {
      throw criarErro(409, 'Categoria já existe', { nome: 'Já existe uma categoria com este nome e tipo' });
    }
    throw erro;
  }
});

// DELETE /api/categorias/:id
router.delete('/:id', async (req, res) => {
  const id = paraId(req.params.id);

  // Busca filtrando pelo usuário do token: categoria de outro usuário = 404
  const categoria = await categoriaModel.buscarPorId(id, req.usuarioId);
  if (!categoria) {
    throw criarErro(404, 'Categoria não encontrada');
  }

  const quantidade = await categoriaModel.contarLancamentos(id);
  if (quantidade > 0) {
    throw criarErro(409, `Não é possível excluir: a categoria possui ${quantidade} lançamento(s) vinculado(s)`);
  }

  await categoriaModel.excluir(id, req.usuarioId);
  res.status(204).end();
});

module.exports = router;
