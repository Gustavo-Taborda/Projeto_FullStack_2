// Previsão de faturas dos cartões (RF9). Todo o cálculo é feito no back-end.
import { useEffect, useState } from 'react';
import api, { mensagemDeErro } from '../../services/api';
import { formatarMoeda, formatarData } from '../../services/formatacao';
import Estado from '../Estado';

export default function Faturas() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/relatorios/faturas', { params: { meses: 3 } })
      .then((resposta) => setDados(resposta.data))
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <section>
      <h1>Faturas dos cartões</h1>
      <Estado
        carregando={carregando}
        erro={erro}
        vazio={dados?.cartoes.length === 0}
        mensagemVazio="Nenhum cartão de crédito cadastrado. Cadastre um em Fontes/Destinos."
      >
        {dados?.cartoes.map((item) => (
            <div className="cartao" key={item.cartao.id}>
              <h2>{item.cartao.nome}</h2>
              <p className="ajuda">
                Fecha todo dia {item.cartao.dia_fechamento} · vence todo dia {item.cartao.dia_vencimento}
              </p>

              <div className="resumo">
                <div><span>Limite</span><strong>{formatarMoeda(item.cartao.limite_centavos)}</strong></div>
                <div><span>Utilizado</span><strong className="valor-saida">{formatarMoeda(item.limite_utilizado_centavos)}</strong></div>
                <div><span>Disponível</span><strong className="valor-entrada">{formatarMoeda(item.limite_disponivel_centavos)}</strong></div>
              </div>

              {item.faturas.map((fatura) => (
                <div className="fatura" key={fatura.fechamento}>
                  <div className="fatura-topo">
                    <strong>{fatura.situacao === 'aberta' ? 'Fatura atual (aberta)' : 'Próxima fatura'}</strong>
                    <span>Fecha em {formatarData(fatura.fechamento)} · vence em {formatarData(fatura.vencimento)}</span>
                    <strong>{formatarMoeda(fatura.total_centavos)}</strong>
                  </div>
                  <Estado vazio={fatura.itens.length === 0} mensagemVazio="Sem lançamentos nesta fatura.">
                    <table>
                      <thead>
                        <tr><th>Compra</th><th>Descrição</th><th>Parcela</th><th className="direita">Valor</th></tr>
                      </thead>
                      <tbody>
                        {fatura.itens.map((parcela) => (
                          <tr key={parcela.id}>
                            <td>{formatarData(parcela.data_compra)}</td>
                            <td>{parcela.descricao}</td>
                            <td>{parcela.parcela}</td>
                            <td className="direita">{formatarMoeda(parcela.valor_centavos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Estado>
                </div>
              ))}
            </div>
        ))}
      </Estado>
    </section>
  );
}
