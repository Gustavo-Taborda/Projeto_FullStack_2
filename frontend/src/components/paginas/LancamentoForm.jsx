// Formulário de lançamento (usado para criar e para editar).
import { useState } from 'react';
import api, { mensagemDeErro, errosDosCampos } from '../../services/api';
import { mascaraValor, textoParaCentavos, centavosParaTexto, hoje } from '../../services/formatacao';
import Campo from '../Campo';

function validar(form) {
  const erros = {};
  if (!form.descricao.trim()) erros.descricao = 'Informe a descrição';
  if (textoParaCentavos(form.valor) <= 0) erros.valor_centavos = 'O valor deve ser maior que zero';
  if (!form.data) erros.data = 'Informe a data';
  if (!form.categoria_id) erros.categoria_id = 'Selecione a categoria';
  if (!form.fonte_destino_id) erros.fonte_destino_id = 'Selecione a fonte/destino';
  const parcelas = Number(form.total_parcelas);
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 48) erros.total_parcelas = 'De 1 a 48 parcelas';
  return erros;
}

// lancamento = null -> novo | objeto -> edição
export default function LancamentoForm({ lancamento, categorias, fontes, aoSalvar, aoCancelar }) {
  const editando = Boolean(lancamento);

  const [form, setForm] = useState({
    tipo: lancamento?.tipo || 'saida',
    descricao: lancamento?.descricao || '',
    valor: lancamento ? centavosParaTexto(lancamento.valor_centavos) : '',
    data: lancamento?.data || hoje(),
    categoria_id: lancamento?.categoria_id || '',
    fonte_destino_id: lancamento?.fonte_destino_id || '',
    total_parcelas: 1,
  });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Só mostra categorias do mesmo tipo do lançamento
  const categoriasDoTipo = categorias.filter((c) => c.tipo === form.tipo);
  const fonteEscolhida = fontes.find((f) => f.id === Number(form.fonte_destino_id));
  const podeParcelar = !editando && fonteEscolhida?.tipo === 'cartao_credito';

  function alterar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  function alterarTipo(tipo) {
    // Ao trocar o tipo, limpa a categoria (as categorias são de outro tipo)
    setForm({ ...form, tipo, categoria_id: '' });
  }

  async function salvar(evento) {
    evento.preventDefault();
    setErroGeral('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length > 0) return;

    const corpo = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor_centavos: textoParaCentavos(form.valor),
      data: form.data,
      categoria_id: Number(form.categoria_id),
      fonte_destino_id: Number(form.fonte_destino_id),
      total_parcelas: podeParcelar ? Number(form.total_parcelas) : 1,
    };

    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/lancamentos/${lancamento.id}`, corpo);
      } else {
        await api.post('/lancamentos', corpo);
      }
      aoSalvar();
    } catch (erroDaApi) {
      setErros(errosDosCampos(erroDaApi));
      setErroGeral(mensagemDeErro(erroDaApi));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cartao" onSubmit={salvar} noValidate>
      <h2>
        {editando ? 'Editar lançamento' : 'Novo lançamento'}
        {editando && lancamento.total_parcelas > 1 && ` (parcela ${lancamento.parcela_atual}/${lancamento.total_parcelas})`}
      </h2>
      {erroGeral && <p className="estado-erro">{erroGeral}</p>}

      <div className="grade">
        <Campo rotulo="Tipo" erro={erros.tipo}>
          <select value={form.tipo} onChange={(e) => alterarTipo(e.target.value)}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
        </Campo>
        <Campo rotulo="Descrição" erro={erros.descricao}>
          <input value={form.descricao} onChange={(e) => alterar('descricao', e.target.value)} maxLength={200} />
        </Campo>
        <Campo rotulo={podeParcelar && form.total_parcelas > 1 ? 'Valor total (R$)' : 'Valor (R$)'} erro={erros.valor_centavos}>
          <input
            value={form.valor}
            onChange={(e) => alterar('valor', mascaraValor(e.target.value))}
            placeholder="0,00"
            inputMode="numeric"
          />
        </Campo>
        <Campo rotulo="Data" erro={erros.data}>
          <input type="date" value={form.data} onChange={(e) => alterar('data', e.target.value)} />
        </Campo>
        <Campo rotulo="Categoria" erro={erros.categoria_id}>
          <select value={form.categoria_id} onChange={(e) => alterar('categoria_id', e.target.value)}>
            <option value="">Selecione...</option>
            {categoriasDoTipo.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo={form.tipo === 'entrada' ? 'Fonte' : 'Destino'} erro={erros.fonte_destino_id}>
          <select value={form.fonte_destino_id} onChange={(e) => alterar('fonte_destino_id', e.target.value)}>
            <option value="">Selecione...</option>
            {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </Campo>
        {podeParcelar && (
          <Campo rotulo="Parcelas" erro={erros.total_parcelas}>
            <input
              type="number"
              min="1"
              max="48"
              value={form.total_parcelas}
              onChange={(e) => alterar('total_parcelas', e.target.value)}
            />
          </Campo>
        )}
      </div>

      <div className="acoes">
        <button type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
