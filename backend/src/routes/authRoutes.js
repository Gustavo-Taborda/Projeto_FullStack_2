// Rotas de autenticação: /api/auth (cadastro e login são as únicas rotas sem token)
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const usuarioModel = require('../models/usuarioModel');
const { verificarToken } = require('../middlewares/autenticacao');
const { criarErro } = require('../middlewares/erros');
const {
  normalizarEmail, normalizarCpf, emailValido, senhaValida, cpfValido,
} = require('../config/validacoes');

const router = express.Router();

// POST /api/auth/cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, email, cpf, senha, confirmacaoSenha } = req.body || {};

  const emailNormalizado = normalizarEmail(email);
  const cpfNormalizado = normalizarCpf(cpf);

  const erros = {};
  if (!nome || !String(nome).trim()) erros.nome = 'Informe o nome';
  if (!emailValido(emailNormalizado)) erros.email = 'E-mail inválido';
  if (!cpfValido(cpfNormalizado)) erros.cpf = 'CPF inválido';
  if (!senhaValida(senha)) erros.senha = 'A senha deve ter no mínimo 8 caracteres, com letras e números';
  if (senha !== confirmacaoSenha) erros.confirmacaoSenha = 'As senhas não conferem';

  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Dados inválidos', erros);
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    const usuario = await usuarioModel.criar({
      nome: String(nome).trim(),
      email: emailNormalizado,
      cpf: cpfNormalizado,
      senhaHash,
    });
    res.status(201).json(usuario);
  } catch (erro) {
    if (erro.code === '23505' && erro.constraint === 'usuarios_email_key') {
      throw criarErro(409, 'E-mail já cadastrado', { email: 'Este e-mail já está cadastrado' });
    }
    if (erro.code === '23505' && erro.constraint === 'usuarios_cpf_key') {
      throw criarErro(409, 'CPF já cadastrado', { cpf: 'Este CPF já está cadastrado' });
    }
    throw erro;
  }
});

// Limita tentativas de login: 10 erros a cada 15 minutos por IP
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { mensagem: 'Muitas tentativas de login. Tente novamente em 15 minutos.', campos: {} },
});

// POST /api/auth/login
router.post('/login', limiteLogin, async (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    throw criarErro(400, 'Informe e-mail e senha');
  }

  const usuario = await usuarioModel.buscarPorEmail(normalizarEmail(email));
  const senhaCorreta = usuario && await bcrypt.compare(String(senha), usuario.senha_hash);

  if (!senhaCorreta) {
    throw criarErro(401, 'E-mail ou senha inválidos');
  }

  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});

// GET /api/auth/me
router.get('/me', verificarToken, async (req, res) => {
  const usuario = await usuarioModel.buscarPorId(req.usuarioId);
  if (!usuario) {
    throw criarErro(401, 'Usuário não encontrado');
  }
  res.json(usuario);
});

module.exports = router;
