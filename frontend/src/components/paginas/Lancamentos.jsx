// Tela de lançamentos: filtros, totais, tabela paginada, criar/editar/excluir.
import { useEffect, useState } from 'react';
import api, { mensagemDeErro } from '../../services/api';
import { formatarMoeda, formatarData, periodoDoMesAtual } from '../../services/formatacao';
import Estado from '../Estado';
import LancamentoForm from './LancamentoForm';

export default function Lancamentos() {
  const [filtros, setFiltros] = useState({
    ...periodoDoMesAtual(),
    tipo: '',
    categoria_id: '',
    fonte_destino_id: '',
  });
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0); // muda para forçar recarregar a lista

  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState(null); // lançamento sendo editado (ou null)

  // Carrega categorias e fontes/destinos uma vez (para filtros e formulário)
  useEffect(() => {
    Promise.all([api.get('/categorias'), api.get('/fontes-destinos')])
      .then(([respostaCategorias, respostaFontes]) => {
        setCategorias(respostaCategorias.data);
        setFontes(respostaFontes.data);
      })
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)));
  }, []);

  // Recarrega a lista sempre que filtros, página ou versão mudarem
  useEffect(() => {
    setCarregando(true);
    setErro('');

    // Só envia os filtros preenchidos
    const params = { pagina, limite: 10 };
    for (const [chave, valor] of Object.entries(filtros)) {
      if (valor) params[chave] = valor;
    }

    api.get('/lancamentos', { params })
      .then((resposta) => setDados(resposta.data))
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, [filtros, pagina, versao]);

  function alterarFiltro(campo, valor) {
    setFiltros({ ...filtros, [campo]: valor });
    setPagina(1);
  }

  function abrirNovo() {
    setEmEdicao(null);
    setFormAberto(true);
  }

  function abrirEdicao(lancamento) {
    setEmEdicao(lancamento);
    setFormAberto(true);
  }

  function fecharFormulario() {
    setFormAberto(false);
    setEmEdicao(null);
  }

  function depoisDeSalvar() {
    fecharFormulario();
    setVersao(versao + 1);
  }

  async function excluir(lancamento, todasParcelas) {
    try {
      await api.delete(`/lancamentos/${lancamento.id}`, {
        params: todasParcelas ? { todasParcelas: true } : {},
      });
      setVersao(versao + 1);
    } catch (erroDaApi) {
      window.alert(mensagemDeErro(erroDaApi));
    }
  }

  function pedirExclusao(lancamento) {
    // Lançamento sem parcelas: uma confirmação simples
    if (lancamento.total_parcelas === 1) {
      if (window.confirm(`Excluir o lançamento "${lancamento.descricao}"?`)) {
        excluir(lancamento, false);
      }
      return;
    }

    // Parcela: pergunta primeiro se é para excluir TODAS; se não, só esta
    const total = lancamento.total_parcelas;
    if (window.confirm(`"${lancamento.descricao}" tem ${total} parcelas. Excluir TODAS as ${total} parcelas?`)) {
      excluir(lancamento, true);
    } else if (window.confirm(`Excluir só a parcela ${lancamento.parcela_atual}/${total}?`)) {
      excluir(lancamento, false);
    }
  }

  return (
    <section>
      <div className="titulo-com-acao">
        <h1>Lançamentos</h1>
        {!formAberto && <button type="button" onClick={abrirNovo}>+ Novo lançamento</button>}
      </div>

      {formAberto && (
        <LancamentoForm
          key={emEdicao?.id || 'novo'}
          lancamento={emEdicao}
          categorias={categorias}
          fontes={fontes}
          aoSalvar={depoisDeSalvar}
          aoCancelar={fecharFormulario}
        />
      )}

      <div className="cartao filtros">
        <label>De <input type="date" value={filtros.inicio} onChange={(e) => alterarFiltro('inicio', e.target.value)} /></label>
        <label>Até <input type="date" value={filtros.fim} onChange={(e) => alterarFiltro('fim', e.target.value)} /></label>
        <label>
          Tipo
          <select value={filtros.tipo} onChange={(e) => alterarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
        </label>
        <label>
          Categoria
          <select value={filtros.categoria_id} onChange={(e) => alterarFiltro('categoria_id', e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'entrada' ? 'entrada' : 'saída'})</option>
            ))}
          </select>
        </label>
        <label>
          Fonte/Destino
          <select value={filtros.fonte_destino_id} onChange={(e) => alterarFiltro('fonte_destino_id', e.target.value)}>
            <option value="">Todos</option>
            {fontes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      </div>

      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <div className="resumo">
              <div className="cartao"><span>Entradas</span><strong className="valor-entrada">{formatarMoeda(dados.totais.entradas_centavos)}</strong></div>
              <div className="cartao"><span>Saídas</span><strong className="valor-saida">{formatarMoeda(dados.totais.saidas_centavos)}</strong></div>
              <div className="cartao">
                <span>Saldo</span>
                <strong className={dados.totais.saldo_centavos >= 0 ? 'valor-entrada' : 'valor-saida'}>
                  {formatarMoeda(dados.totais.saldo_centavos)}
                </strong>
              </div>
            </div>

            <div className="cartao">
              <Estado vazio={dados.lancamentos.length === 0} mensagemVazio="Nenhum lançamento encontrado neste período.">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th><th>Descrição</th><th>Categoria</th><th>Fonte/Destino</th>
                      <th className="direita">Valor</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {dados.lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td>{formatarData(l.data)}</td>
                        <td>
                          {l.descricao}
                          {l.total_parcelas > 1 && <span className="etiqueta">{l.parcela_atual}/{l.total_parcelas}</span>}
                        </td>
                        <td>{l.categoria_nome}</td>
                        <td>{l.fonte_destino_nome}</td>
                        <td className={`direita ${l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}`}>
                          {l.tipo === 'saida' ? '- ' : '+ '}{formatarMoeda(l.valor_centavos)}
                        </td>
                        <td className="direita acoes-tabela">
                          <button type="button" className="botao-link" onClick={() => abrirEdicao(l)}>Editar</button>
                          <button type="button" className="botao-link perigo" onClick={() => pedirExclusao(l)}>Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="paginacao">
                  <button type="button" className="botao-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
                    ← Anterior
                  </button>
                  <span>Página {dados.paginacao.pagina} de {dados.paginacao.total_paginas} ({dados.paginacao.total_itens} itens)</span>
                  <button
                    type="button"
                    className="botao-secundario"
                    disabled={pagina >= dados.paginacao.total_paginas}
                    onClick={() => setPagina(pagina + 1)}
                  >
                    Próxima →
                  </button>
                </div>
              </Estado>
            </div>
          </>
        )}
      </Estado>
    </section>
  );
}
