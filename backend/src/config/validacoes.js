// Funções de validação e normalização usadas pelas rotas.
const { criarErro } = require('../middlewares/erros');
const { dataValida, periodoDoMesAtual } = require('./calculos');

// "  Ana@Email.COM " -> "ana@email.com"
function normalizarEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// "529.982.247-25" -> "52998224725"  (\D = qualquer caractere que NÃO é dígito)
function normalizarCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mínimo 8 caracteres, com pelo menos uma letra e um número
function senhaValida(senha) {
  return typeof senha === 'string'
    && senha.length >= 8
    && /[a-zA-Z]/.test(senha)
    && /[0-9]/.test(senha);
}

// Calcula um dígito verificador do CPF.
// Cada dígito é multiplicado por um peso decrescente e tudo é somado.
function calcularDigitoCpf(base) {
  let soma = 0;
  let peso = base.length + 1;
  for (const numero of base) {
    soma += Number(numero) * peso;
    peso--;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function cpfValido(cpf) {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais (111.111.111-11)

  const digito1 = calcularDigitoCpf(cpf.slice(0, 9));
  const digito2 = calcularDigitoCpf(cpf.slice(0, 10));
  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}

// Converte um id vindo da URL/corpo em número inteiro positivo.
// Se for inválido, devolve null (a consulta no banco não vai achar nada -> 404).
function paraId(valor) {
  const numero = Number(valor);
  if (Number.isInteger(numero) && numero > 0 && numero <= 2147483647) {
    return numero;
  }
  return null;
}

// Lê ?inicio=AAAA-MM-DD&fim=AAAA-MM-DD da URL. Padrão: mês atual.
function lerPeriodo(query) {
  const padrao = periodoDoMesAtual();
  const inicio = query.inicio || padrao.inicio;
  const fim = query.fim || padrao.fim;

  const erros = {};
  if (!dataValida(inicio)) erros.inicio = 'Data inicial inválida';
  if (!dataValida(fim)) erros.fim = 'Data final inválida';
  if (!erros.inicio && !erros.fim && inicio > fim) {
    erros.fim = 'A data final deve ser igual ou posterior à inicial';
  }

  if (Object.keys(erros).length > 0) {
    throw criarErro(400, 'Período inválido', erros);
  }
  return { inicio, fim };
}

module.exports = {
  normalizarEmail,
  normalizarCpf,
  emailValido,
  senhaValida,
  cpfValido,
  paraId,
  lerPeriodo,
};
