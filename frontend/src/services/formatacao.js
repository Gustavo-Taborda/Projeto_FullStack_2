// Funções de formatação e máscaras usadas nas telas.
// Os valores em dinheiro circulam SEMPRE em centavos (número inteiro), como no banco.

const formatadorMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 123456 -> "R$ 1.234,56"
export function formatarMoeda(centavos) {
  return formatadorMoeda.format((centavos || 0) / 100);
}

// "2026-11-12" -> "12/11/2026"
export function formatarData(data) {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Máscara de valor: o usuário digita só números e eles "entram pela direita".
// "123456" -> "1.234,56"
export function mascaraValor(texto) {
  const digitos = String(texto).replace(/\D/g, '').slice(0, 11);
  if (!digitos) return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "1.234,56" -> 123456 (como a máscara sempre tem 2 casas, os dígitos já são os centavos)
export function textoParaCentavos(texto) {
  const digitos = String(texto || '').replace(/\D/g, '');
  return digitos ? Number(digitos) : 0;
}

// 123456 -> "1.234,56" (para preencher o formulário na edição)
export function centavosParaTexto(centavos) {
  return mascaraValor(String(centavos));
}

// "52998224725" -> "529.982.247-25"
export function mascaraCpf(texto) {
  const digitos = String(texto).replace(/\D/g, '').slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function doisDigitos(numero) {
  return String(numero).padStart(2, '0');
}

export function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

export function periodoDoMesAtual() {
  const d = new Date();
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const anoMes = `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`;
  return { inicio: `${anoMes}-01`, fim: `${anoMes}-${doisDigitos(ultimoDia)}` };
}

export const NOMES_TIPO = { entrada: 'Entrada', saida: 'Saída' };
export const NOMES_TIPO_FONTE = { renda: 'Renda', conta: 'Conta', cartao_credito: 'Cartão de crédito' };
