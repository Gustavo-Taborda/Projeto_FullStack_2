// Tela de categorias: listar, criar, renomear e excluir.
import { useEffect, useState } from 'react';
import api, { mensagemDeErro, errosDosCampos } from '../../services/api';
import Campo from '../Campo';
import Estado from '../Estado';

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  // Formulário de nova categoria
  const [nova, setNova] = useState({ nome: '', tipo: 'saida' });
  const [errosNova, setErrosNova] = useState({});

  // Mensagem de erro ao renomear ou excluir (ex.: 409 categoria em uso)
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    setCarregando(true);
    api.get('/categorias')
      .then((resposta) => setCategorias(resposta.data))
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, [versao]);

  async function criar(evento) {
    evento.preventDefault();
    setAviso('');
    if (!nova.nome.trim()) {
      setErrosNova({ nome: 'Informe o nome' });
      return;
    }
    try {
      await api.post('/categorias', nova);
      setNova({ nome: '', tipo: nova.tipo });
      setErrosNova({});
      setVersao(versao + 1);
    } catch (erroDaApi) {
      setErrosNova(errosDosCampos(erroDaApi));
    }
  }

  async function renomear(categoria) {
    setAviso('');
    const nome = window.prompt('Novo nome da categoria:', categoria.nome);
    if (nome === null) return; // clicou em Cancelar
    try {
      await api.put(`/categorias/${categoria.id}`, { nome });
      setVersao(versao + 1);
    } catch (erroDaApi) {
      setAviso(errosDosCampos(erroDaApi).nome || mensagemDeErro(erroDaApi));
    }
  }

  async function excluir(categoria) {
    setAviso('');
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    try {
      await api.delete(`/categorias/${categoria.id}`);
      setVersao(versao + 1);
    } catch (erroDaApi) {
      setAviso(mensagemDeErro(erroDaApi));
    }
  }

  function lista(tipo, titulo) {
    const doTipo = categorias.filter((c) => c.tipo === tipo);
    return (
      <div className="cartao">
        <h2>{titulo}</h2>
        <Estado vazio={doTipo.length === 0} mensagemVazio="Nenhuma categoria.">
          <ul className="lista">
            {doTipo.map((categoria) => (
              <li key={categoria.id}>
                <span>{categoria.nome}</span>
                <span className="acoes-tabela">
                  <button type="button" className="botao-link" onClick={() => renomear(categoria)}>Renomear</button>
                  <button type="button" className="botao-link perigo" onClick={() => excluir(categoria)}>Excluir</button>
                </span>
              </li>
            ))}
          </ul>
        </Estado>
      </div>
    );
  }

  return (
    <section>
      <h1>Categorias</h1>

      <form className="cartao linha-form" onSubmit={criar} noValidate>
        <Campo rotulo="Nova categoria" erro={errosNova.nome}>
          <input value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} maxLength={60} />
        </Campo>
        <Campo rotulo="Tipo" erro={errosNova.tipo}>
          <select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
            <option value="saida">Saída</option>
            <option value="entrada">Entrada</option>
          </select>
        </Campo>
        <button type="submit">Adicionar</button>
      </form>

      {aviso && <p className="estado-erro">{aviso}</p>}

      <Estado carregando={carregando} erro={erro}>
        <div className="duas-colunas">
          {lista('saida', 'Saídas')}
          {lista('entrada', 'Entradas')}
        </div>
      </Estado>
    </section>
  );
}
