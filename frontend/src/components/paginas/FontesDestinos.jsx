// Tela de fontes/destinos (rendas, contas e cartões de crédito).
import { useEffect, useState } from 'react';
import api, { mensagemDeErro, errosDosCampos } from '../../services/api';
import {
  formatarMoeda, mascaraValor, textoParaCentavos, centavosParaTexto, NOMES_TIPO_FONTE,
} from '../../services/formatacao';
import Campo from '../Campo';
import Estado from '../Estado';

const FORM_VAZIO = { nome: '', tipo: 'conta', dia_fechamento: '', dia_vencimento: '', limite: '' };

function validar(form) {
  const erros = {};
  if (!form.nome.trim()) erros.nome = 'Informe o nome';
  if (form.tipo === 'cartao_credito') {
    const fechamento = Number(form.dia_fechamento);
    const vencimento = Number(form.dia_vencimento);
    if (!Number.isInteger(fechamento) || fechamento < 1 || fechamento > 31) erros.dia_fechamento = 'Dia de 1 a 31';
    if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) erros.dia_vencimento = 'Dia de 1 a 31';
    if (textoParaCentavos(form.limite) <= 0) erros.limite_centavos = 'Informe o limite';
  }
  return erros;
}

export default function FontesDestinos() {
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  const [form, setForm] = useState(FORM_VAZIO);
  const [editandoId, setEditandoId] = useState(null);
  const [erros, setErros] = useState({});
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get('/fontes-destinos')
      .then((resposta) => setLista(resposta.data))
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, [versao]);

  function alterar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  function editar(item) {
    setEditandoId(item.id);
    setErros({});
    setAviso('');
    setForm({
      nome: item.nome,
      tipo: item.tipo,
      dia_fechamento: item.dia_fechamento || '',
      dia_vencimento: item.dia_vencimento || '',
      limite: item.limite_centavos ? centavosParaTexto(item.limite_centavos) : '',
    });
  }

  function cancelar() {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErros({});
  }

  async function salvar(evento) {
    evento.preventDefault();
    setAviso('');

    const errosCliente = validar(form);
    setErros(errosCliente);
    if (Object.keys(errosCliente).length > 0) return;

    const ehCartao = form.tipo === 'cartao_credito';
    const corpo = {
      nome: form.nome.trim(),
      tipo: form.tipo,
      dia_fechamento: ehCartao ? Number(form.dia_fechamento) : null,
      dia_vencimento: ehCartao ? Number(form.dia_vencimento) : null,
      limite_centavos: ehCartao ? textoParaCentavos(form.limite) : null,
    };

    try {
      if (editandoId) {
        await api.put(`/fontes-destinos/${editandoId}`, corpo);
      } else {
        await api.post('/fontes-destinos', corpo);
      }
      cancelar();
      setVersao(versao + 1);
    } catch (erroDaApi) {
      setErros(errosDosCampos(erroDaApi));
      setAviso(mensagemDeErro(erroDaApi));
    }
  }

  async function excluir(item) {
    setAviso('');
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    try {
      await api.delete(`/fontes-destinos/${item.id}`);
      setVersao(versao + 1);
    } catch (erroDaApi) {
      setAviso(mensagemDeErro(erroDaApi));
    }
  }

  return (
    <section>
      <h1>Fontes e destinos</h1>

      <form className="cartao" onSubmit={salvar} noValidate>
        <h2>{editandoId ? 'Editar' : 'Nova fonte/destino'}</h2>
        <div className="grade">
          <Campo rotulo="Nome" erro={erros.nome}>
            <input value={form.nome} onChange={(e) => alterar('nome', e.target.value)} maxLength={60} />
          </Campo>
          <Campo rotulo="Tipo" erro={erros.tipo}>
            <select value={form.tipo} onChange={(e) => alterar('tipo', e.target.value)}>
              <option value="conta">Conta</option>
              <option value="renda">Renda</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </Campo>
          {form.tipo === 'cartao_credito' && (
            <>
              <Campo rotulo="Dia de fechamento" erro={erros.dia_fechamento}>
                <input type="number" min="1" max="31" value={form.dia_fechamento} onChange={(e) => alterar('dia_fechamento', e.target.value)} />
              </Campo>
              <Campo rotulo="Dia de vencimento" erro={erros.dia_vencimento}>
                <input type="number" min="1" max="31" value={form.dia_vencimento} onChange={(e) => alterar('dia_vencimento', e.target.value)} />
              </Campo>
              <Campo rotulo="Limite (R$)" erro={erros.limite_centavos}>
                <input value={form.limite} onChange={(e) => alterar('limite', mascaraValor(e.target.value))} placeholder="0,00" inputMode="numeric" />
              </Campo>
            </>
          )}
        </div>
        <div className="acoes">
          <button type="submit">{editandoId ? 'Salvar alterações' : 'Adicionar'}</button>
          {editandoId && <button type="button" className="botao-secundario" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      {aviso && <p className="estado-erro">{aviso}</p>}

      <div className="cartao">
        <Estado carregando={carregando} erro={erro} vazio={lista.length === 0}>
          <table>
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Fechamento</th><th>Vencimento</th><th className="direita">Limite</th><th /></tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{NOMES_TIPO_FONTE[item.tipo]}</td>
                  <td>{item.dia_fechamento ? `Dia ${item.dia_fechamento}` : '-'}</td>
                  <td>{item.dia_vencimento ? `Dia ${item.dia_vencimento}` : '-'}</td>
                  <td className="direita">{item.limite_centavos ? formatarMoeda(item.limite_centavos) : '-'}</td>
                  <td className="direita acoes-tabela">
                    <button type="button" className="botao-link" onClick={() => editar(item)}>Editar</button>
                    <button type="button" className="botao-link perigo" onClick={() => excluir(item)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Estado>
      </div>
    </section>
  );
}
