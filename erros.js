// Tratamento de erros: criarErro() gera erros "etiquetados" e tratarErros() responde no formato { mensagem, campos }.
function criarErro(status, mensagem, campos = {}) {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.campos = campos;
  return erro;
}

function tratarErros(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'JSON inválido', campos: {} });
  }

  if (err.status) {
    return res.status(err.status).json({ mensagem: err.message, campos: err.campos || {} });
  }

  console.error(err);
  res.status(500).json({ mensagem: 'Erro interno do servidor', campos: {} });
}

module.exports = { criarErro, tratarErros };
