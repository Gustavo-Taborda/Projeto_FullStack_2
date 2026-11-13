// Middleware de autenticação: confere o token JWT antes das rotas protegidas.
const jwt = require('jsonwebtoken');
const { criarErro } = require('./erros');

function verificarToken(req, res, next) {
  const cabecalho = req.headers.authorization;

  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    throw criarErro(401, 'Token não informado');
  }

  const token = cabecalho.split(' ')[1];

  let dados;
  try {
    dados = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw criarErro(401, 'Token inválido ou expirado');
  }

  req.usuarioId = dados.id;
  next();
}

module.exports = { verificarToken };
