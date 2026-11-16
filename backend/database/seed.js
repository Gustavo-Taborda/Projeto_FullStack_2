// Recria o banco do zero e insere dados de exemplo.
// Uso (dentro da pasta backend):  npm run db:reset
//
// 1) Executa o schema.sql (apaga e recria as tabelas)
// 2) Cria 2 usuários com 3 meses de lançamentos (incluindo compras parceladas)
//
// Logins criados:
//   ana@email.com   / senha1234
//   bruno@email.com / senha1234
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { pool } = require('../src/config/db');
const usuarioModel = require('../src/models/usuarioModel');
const categoriaModel = require('../src/models/categoriaModel');
const fonteDestinoModel = require('../src/models/fonteDestinoModel');
const lancamentoModel = require('../src/models/lancamentoModel');

// Data no formato 'AAAA-MM-DD' em relação ao mês atual.
// deslocamento: 0 = mês atual, -1 = mês passado, -2 = retrasado
function dataNoMes(deslocamento, dia) {
  const agora = new Date();
  const data = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + deslocamento, dia));
  return data.toISOString().slice(0, 10);
}

async function criarUsuarioComDados(usuario, lancamentosDoUsuario) {
  const senhaHash = await bcrypt.hash(usuario.senha, 10);
  const criado = await usuarioModel.criar({
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf,
    senhaHash,
  });

  // O cadastro já criou as categorias padrão e a "Conta corrente"
  await fonteDestinoModel.criar(criado.id, {
    nome: 'Empresa', tipo: 'renda', dia_fechamento: null, dia_vencimento: null, limite_centavos: null,
  });
  await fonteDestinoModel.criar(criado.id, {
    nome: 'Cartão Visa', tipo: 'cartao_credito', dia_fechamento: 10, dia_vencimento: 17, limite_centavos: 800000,
  });

  // Mapas "nome -> id" para facilitar
  const categorias = {};
  for (const c of await categoriaModel.listar(criado.id)) categorias[`${c.tipo}:${c.nome}`] = c.id;
  const fontes = {};
  for (const f of await fonteDestinoModel.listar(criado.id)) fontes[f.nome] = f.id;

  for (const l of lancamentosDoUsuario) {
    await lancamentoModel.criar(criado.id, {
      tipo: l.tipo,
      descricao: l.descricao,
      valor_centavos: l.valor,
      data: l.data,
      categoria_id: categorias[`${l.tipo}:${l.categoria}`],
      fonte_destino_id: fontes[l.fonte],
    }, l.parcelas || 1);
  }

  console.log(`Usuário criado: ${usuario.email} / ${usuario.senha}`);
}

// Lançamentos que se repetem nos 3 meses (valores variam um pouco por mês)
function lancamentosMensais(salario, aluguel) {
  const lista = [];
  for (const mes of [-2, -1, 0]) {
    const ajuste = (mes + 3) * 1000; // R$ 10, 20, 30 a mais a cada mês
    lista.push(
      { tipo: 'entrada', descricao: 'Salário', valor: salario, data: dataNoMes(mes, 5), categoria: 'Salário', fonte: 'Conta corrente' },
      { tipo: 'saida', descricao: 'Aluguel', valor: aluguel, data: dataNoMes(mes, 8), categoria: 'Moradia', fonte: 'Conta corrente' },
      { tipo: 'saida', descricao: 'Supermercado', valor: 60000 + ajuste * 3, data: dataNoMes(mes, 6), categoria: 'Alimentação', fonte: 'Cartão Visa' },
      { tipo: 'saida', descricao: 'Transporte', valor: 18000, data: dataNoMes(mes, 2), categoria: 'Mobilidade', fonte: 'Conta corrente' },
      { tipo: 'saida', descricao: 'Farmácia', valor: 8000 + ajuste, data: dataNoMes(mes, 14), categoria: 'Saúde', fonte: 'Cartão Visa' },
      { tipo: 'saida', descricao: 'Cinema', valor: 12000 - ajuste, data: dataNoMes(mes, 20), categoria: 'Lazer', fonte: 'Cartão Visa' },
    );
  }
  return lista;
}

async function main() {
  console.log('Recriando tabelas...');
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);

  console.log('Inserindo dados de exemplo...');
  await criarUsuarioComDados(
    { nome: 'Ana Souza', email: 'ana@email.com', cpf: '52998224725', senha: 'senha1234' },
    [
      ...lancamentosMensais(650000, 180000),
      { tipo: 'entrada', descricao: 'Freelance site', valor: 120000, data: dataNoMes(-1, 18), categoria: 'Outros', fonte: 'Empresa' },
      { tipo: 'saida', descricao: 'Notebook', valor: 360000, data: dataNoMes(-1, 22), categoria: 'Educação', fonte: 'Cartão Visa', parcelas: 10 },
      // Compra NO dia do fechamento (10): deve cair na fatura do mês seguinte
      { tipo: 'saida', descricao: 'Tênis', valor: 10000, data: dataNoMes(0, 10), categoria: 'Lazer', fonte: 'Cartão Visa', parcelas: 3 },
    ]
  );

  await criarUsuarioComDados(
    { nome: 'Bruno Lima', email: 'bruno@email.com', cpf: '11144477735', senha: 'senha1234' },
    [
      ...lancamentosMensais(420000, 120000),
      { tipo: 'saida', descricao: 'Celular', valor: 240000, data: dataNoMes(-2, 25), categoria: 'Outros', fonte: 'Cartão Visa', parcelas: 6 },
    ]
  );

  console.log('Banco pronto!');
}

main()
  .catch((erro) => {
    console.error('Erro ao criar o banco:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
