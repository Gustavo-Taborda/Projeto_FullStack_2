// Tela inicial: resumo do mês atual e últimos lançamentos.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensagemDeErro } from '../../services/api';
import { formatarMoeda, formatarData, periodoDoMesAtual } from '../../services/formatacao';
import Estado from '../Estado';

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const periodo = periodoDoMesAtual();
    api.get('/lancamentos', { params: { ...periodo, limite: 5 } })
      .then((resposta) => setDados(resposta.data))
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <section>
      <h1>Resumo do mês</h1>
      <Estado carregando={carregando} erro={erro}>
        {dados && (
          <>
            <div className="resumo">
              <div className="cartao">
                <span>Entradas</span>
                <strong className="valor-entrada">{formatarMoeda(dados.totais.entradas_centavos)}</strong>
              </div>
              <div className="cartao">
                <span>Saídas</span>
                <strong className="valor-saida">{formatarMoeda(dados.totais.saidas_centavos)}</strong>
              </div>
              <div className="cartao">
                <span>Saldo</span>
                <strong className={dados.totais.saldo_centavos >= 0 ? 'valor-entrada' : 'valor-saida'}>
                  {formatarMoeda(dados.totais.saldo_centavos)}
                </strong>
              </div>
            </div>

            <div className="cartao">
              <h2>Últimos lançamentos do mês</h2>
              <Estado vazio={dados.lancamentos.length === 0} mensagemVazio="Nenhum lançamento neste mês.">
                <table>
                  <thead>
                    <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="direita">Valor</th></tr>
                  </thead>
                  <tbody>
                    {dados.lancamentos.map((l) => (
                      <tr key={l.id}>
                        <td>{formatarData(l.data)}</td>
                        <td>{l.descricao}</td>
                        <td>{l.categoria_nome}</td>
                        <td className={`direita ${l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida'}`}>
                          {formatarMoeda(l.valor_centavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Estado>
              <p><Link to="/lancamentos">Ver todos os lançamentos →</Link></p>
            </div>
          </>
        )}
      </Estado>
    </section>
  );
}
