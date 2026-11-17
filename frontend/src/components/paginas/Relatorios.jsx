// Relatórios por categoria (RF7) e por fonte/destino (RF8), com tabelas e gráficos.
// Os totais vêm prontos do back-end (calculados no banco).
import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import api, { mensagemDeErro } from '../../services/api';
import { formatarMoeda, formatarData, periodoDoMesAtual, NOMES_TIPO_FONTE } from '../../services/formatacao';
import Estado from '../Estado';

const CORES = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#475569'];

function Variacao({ item }) {
  if (item.variacao === 'aumento') return <span className="valor-saida">▲ {formatarMoeda(item.diferenca_centavos)}</span>;
  if (item.variacao === 'reducao') return <span className="valor-entrada">▼ {formatarMoeda(-item.diferenca_centavos)}</span>;
  return <span>=</span>;
}

function TabelaCategorias({ grupo }) {
  return (
    <Estado vazio={grupo.categorias.length === 0} mensagemVazio="Sem lançamentos no período.">
      <table>
        <thead>
          <tr>
            <th>Categoria</th><th className="direita">Total</th><th className="direita">%</th>
            <th className="direita">Período anterior</th><th className="direita">Variação</th>
          </tr>
        </thead>
        <tbody>
          {grupo.categorias.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td className="direita">{formatarMoeda(item.total_centavos)}</td>
              <td className="direita">{item.percentual.toLocaleString('pt-BR')}%</td>
              <td className="direita">{formatarMoeda(item.total_anterior_centavos)}</td>
              <td className="direita"><Variacao item={item} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><th>Total</th><th className="direita">{formatarMoeda(grupo.total_centavos)}</th><th colSpan="3" /></tr>
        </tfoot>
      </table>
    </Estado>
  );
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState(periodoDoMesAtual());
  const [porCategoria, setPorCategoria] = useState(null);
  const [porFonte, setPorFonte] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!periodo.inicio || !periodo.fim) return;
    setCarregando(true);
    setErro('');
    Promise.all([
      api.get('/relatorios/categorias', { params: periodo }),
      api.get('/relatorios/fontes-destinos', { params: periodo }),
    ])
      .then(([respostaCategorias, respostaFontes]) => {
        setPorCategoria(respostaCategorias.data);
        setPorFonte(respostaFontes.data);
      })
      .catch((erroDaApi) => setErro(mensagemDeErro(erroDaApi)))
      .finally(() => setCarregando(false));
  }, [periodo]);

  // Dados do gráfico de pizza: só categorias com valor no período
  const dadosPizza = porCategoria
    ? porCategoria.saidas.categorias.filter((c) => c.total_centavos > 0)
    : [];

  return (
    <section>
      <h1>Relatórios</h1>

      <div className="cartao filtros">
        <label>De <input type="date" value={periodo.inicio} onChange={(e) => setPeriodo({ ...periodo, inicio: e.target.value })} /></label>
        <label>Até <input type="date" value={periodo.fim} onChange={(e) => setPeriodo({ ...periodo, fim: e.target.value })} /></label>
      </div>

      <Estado carregando={carregando} erro={erro}>
        {porCategoria && porFonte && (
          <>
            <div className="cartao">
              <h2>Saídas por categoria</h2>
              <p className="ajuda">
                Comparado com {formatarData(porCategoria.periodo_anterior.inicio)} a {formatarData(porCategoria.periodo_anterior.fim)} (período anterior de mesmo tamanho).
              </p>
              <div className="duas-colunas">
                <TabelaCategorias grupo={porCategoria.saidas} />
                {dadosPizza.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={dadosPizza} dataKey="total_centavos" nameKey="nome" innerRadius={60} outerRadius={110} isAnimationActive={false}>
                        {dadosPizza.map((item, indice) => <Cell key={item.id} fill={CORES[indice % CORES.length]} />)}
                      </Pie>
                      <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="cartao">
              <h2>Entradas por categoria</h2>
              <TabelaCategorias grupo={porCategoria.entradas} />
            </div>

            <div className="cartao">
              <h2>Por fonte/destino</h2>
              <div className="duas-colunas">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th><th>Tipo</th><th className="direita">Entradas</th>
                      <th className="direita">Saídas</th><th className="direita">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porFonte.itens.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nome}</td>
                        <td>{NOMES_TIPO_FONTE[item.tipo]}</td>
                        <td className="direita valor-entrada">{formatarMoeda(item.entradas_centavos)}</td>
                        <td className="direita valor-saida">{formatarMoeda(item.saidas_centavos)}</td>
                        <td className="direita">{item.saldo_centavos === null ? '-' : formatarMoeda(item.saldo_centavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={porFonte.itens}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis tickFormatter={(valor) => formatarMoeda(valor)} width={100} />
                    <Tooltip formatter={(valor) => formatarMoeda(valor)} />
                    <Legend />
                    <Bar dataKey="entradas_centavos" name="Entradas" fill="#16a34a" isAnimationActive={false} />
                    <Bar dataKey="saidas_centavos" name="Saídas" fill="#dc2626" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </Estado>
    </section>
  );
}
