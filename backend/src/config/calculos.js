// Funções "puras" de cálculo: recebem valores e devolvem resultados, sem acessar o banco.
// Datas são sempre texto no formato 'AAAA-MM-DD'.
// Internamente os meses vão de 0 (janeiro) a 11 (dezembro), como no JavaScript.

// ---------------------------------------------------------------- DATAS

// Monta o texto 'AAAA-MM-DD'. Se o mês ou o dia "passarem do limite",
// o Date.UTC ajusta sozinho (ex.: mês 12 vira janeiro do ano seguinte).
function paraTexto(ano, mes, dia) {
  return new Date(Date.UTC(ano, mes, dia)).toISOString().slice(0, 10);
}

// '2026-11-12' -> { ano: 2026, mes: 10, dia: 12 }
function lerData(texto) {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return { ano, mes: mes - 1, dia };
}

// O "dia 0" do mês seguinte é o último dia do mês atual.
function ultimoDiaDoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
}

// Cria uma data ajustando dias que não existem: dia 31 em fevereiro vira 28 (ou 29).
function criarDataAjustada(ano, mes, dia) {
  const primeiroDia = new Date(Date.UTC(ano, mes, 1)); // normaliza mês/ano
  const anoCerto = primeiroDia.getUTCFullYear();
  const mesCerto = primeiroDia.getUTCMonth();
  const diaCerto = Math.min(dia, ultimoDiaDoMes(anoCerto, mesCerto));
  return paraTexto(anoCerto, mesCerto, diaCerto);
}

function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const { ano, mes, dia } = lerData(texto);
  return mes >= 0 && mes <= 11 && dia >= 1 && dia <= ultimoDiaDoMes(ano, mes);
}

function hoje() {
  const agora = new Date();
  return paraTexto(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function somarDias(texto, dias) {
  const { ano, mes, dia } = lerData(texto);
  return paraTexto(ano, mes, dia + dias);
}

function diasEntre(inicio, fim) {
  return Math.round((Date.parse(fim) - Date.parse(inicio)) / (24 * 60 * 60 * 1000));
}

function periodoDoMesAtual() {
  const { ano, mes } = lerData(hoje());
  return {
    inicio: paraTexto(ano, mes, 1),
    fim: paraTexto(ano, mes, ultimoDiaDoMes(ano, mes)),
  };
}

// Período anterior com o MESMO tamanho.
// Ex.: 01/11 a 30/11 (30 dias) -> 02/10 a 31/10 (30 dias)
function periodoAnterior(inicio, fim) {
  const tamanho = diasEntre(inicio, fim) + 1;
  const fimAnterior = somarDias(inicio, -1);
  const inicioAnterior = somarDias(fimAnterior, -(tamanho - 1));
  return { inicio: inicioAnterior, fim: fimAnterior };
}

// ---------------------------------------------------------------- PARCELAS

// Divide um valor (em centavos) em parcelas.
// A sobra da divisão vai para a PRIMEIRA parcela.
// Ex.: 10000 em 3 -> [3334, 3333, 3333]  (soma exatamente 10000)
function dividirEmParcelas(totalCentavos, quantidade) {
  const valorBase = Math.floor(totalCentavos / quantidade);
  const sobra = totalCentavos - valorBase * quantidade;

  const parcelas = [];
  for (let i = 0; i < quantidade; i++) {
    parcelas.push(i === 0 ? valorBase + sobra : valorBase);
  }
  return parcelas;
}

// ---------------------------------------------------------------- FATURAS

// Descobre o mês da fatura (mês do FECHAMENTO) em que cai uma parcela.
// Regra: compra ANTES do dia de fechamento -> fatura deste mês;
//        compra NO dia de fechamento ou depois -> fatura do mês seguinte.
// A parcela k cai (k - 1) meses depois da primeira.
function mesDaFatura(dataCompra, numeroParcela, diaFechamento) {
  const { ano, mes, dia } = lerData(dataCompra);
  const fechamentoNesteMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mes));

  let mesFatura = mes;
  if (dia >= fechamentoNesteMes) {
    mesFatura += 1;
  }
  mesFatura += numeroParcela - 1;

  const normalizado = new Date(Date.UTC(ano, mesFatura, 1));
  return { ano: normalizado.getUTCFullYear(), mes: normalizado.getUTCMonth() };
}

// Datas de fechamento e vencimento de uma fatura.
// Se o dia de vencimento for MAIOR que o de fechamento, vence no mesmo mês;
// senão, vence no mês seguinte.
function datasDaFatura(ano, mes, diaFechamento, diaVencimento) {
  const fechamento = criarDataAjustada(ano, mes, diaFechamento);
  const vencimento = diaVencimento > diaFechamento
    ? criarDataAjustada(ano, mes, diaVencimento)
    : criarDataAjustada(ano, mes + 1, diaVencimento);
  return { fechamento, vencimento };
}

// Monta a fatura atual (aberta) e as próximas 'quantidadeFuturas' faturas de um cartão.
// 'lancamentos' são todas as parcelas de saída gravadas nesse cartão.
function montarFaturas(cartao, lancamentos, dataHoje, quantidadeFuturas) {
  const { dia_fechamento, dia_vencimento, limite_centavos } = cartao;

  // 1) Para cada parcela, descobre em qual fatura ela cai
  const parcelas = lancamentos.map((lancamento) => {
    const { ano, mes } = mesDaFatura(lancamento.data, lancamento.parcela_atual, dia_fechamento);
    const { fechamento, vencimento } = datasDaFatura(ano, mes, dia_fechamento, dia_vencimento);
    return {
      id: lancamento.id,
      descricao: lancamento.descricao,
      data_compra: lancamento.data,
      valor_centavos: lancamento.valor_centavos,
      parcela: `${lancamento.parcela_atual}/${lancamento.total_parcelas}`,
      fechamento,
      vencimento,
    };
  });

  // 2) Limite utilizado = soma de todas as parcelas cuja fatura AINDA NÃO VENCEU
  let limiteUtilizado = 0;
  for (const parcela of parcelas) {
    if (parcela.vencimento >= dataHoje) {
      limiteUtilizado += parcela.valor_centavos;
    }
  }

  // 3) A fatura atual é aquela em que entraria uma compra feita hoje
  const atual = mesDaFatura(dataHoje, 1, dia_fechamento);

  const faturas = [];
  for (let i = 0; i <= quantidadeFuturas; i++) {
    const { fechamento, vencimento } = datasDaFatura(atual.ano, atual.mes + i, dia_fechamento, dia_vencimento);
    const itens = parcelas.filter((parcela) => parcela.fechamento === fechamento);

    let total = 0;
    for (const item of itens) total += item.valor_centavos;

    faturas.push({
      situacao: i === 0 ? 'aberta' : 'futura',
      fechamento,
      vencimento,
      total_centavos: total,
      itens,
    });
  }

  return {
    cartao: {
      id: cartao.id,
      nome: cartao.nome,
      dia_fechamento,
      dia_vencimento,
      limite_centavos,
    },
    limite_utilizado_centavos: limiteUtilizado,
    limite_disponivel_centavos: limite_centavos - limiteUtilizado,
    faturas,
  };
}

module.exports = {
  dataValida,
  hoje,
  periodoDoMesAtual,
  periodoAnterior,
  dividirEmParcelas,
  mesDaFatura,
  datasDaFatura,
  montarFaturas,
};
