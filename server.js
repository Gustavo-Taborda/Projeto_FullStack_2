// Ponto de partida da API.
require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const { testarConexao } = require('./config/db');
const { tratarErros } = require('./middlewares/erros');

const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares globais (rodam em TODAS as requisições, nesta ordem)
app.use(cors({ origin: process.env.FRONTEND_URL })); // só o nosso front pode chamar a API
app.use(express.json()); // lê o corpo JSON e coloca em req.body

app.get('/api/status', (req, res) => {
  res.json({ status: 'API funcionando' });
});

// Rotas (cada arquivo cuida de um "recurso")
app.use('/api/auth', authRoutes);

// Nenhuma rota atendeu -> 404
app.use((req, res) => {
  res.status(404).json({ mensagem: 'Rota não encontrada', campos: {} });
});

// Tratamento centralizado de erros (sempre o ÚLTIMO)
app.use(tratarErros);

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, async () => {
  console.log(`API rodando em http://localhost:${PORTA}`);
  await testarConexao();
});
