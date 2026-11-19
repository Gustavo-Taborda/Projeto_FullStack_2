# Projeto 2: Controle Financeiro Full Stack

Link do Site: https://fullstack2-front.onrender.com/login

Aplicação de controle financeiro pessoal. Ela tem uma API REST em Node.js/Express com PostgreSQL e uma SPA em React que consome essa API.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Banco de dados | PostgreSQL (driver `pg`, com pool de conexões) |
| Back-end | Node.js, Express 5, dotenv, bcrypt, jsonwebtoken, cors, express-rate-limit |
| Front-end | React + Vite, React Router, Context API, Axios, Recharts |

## Como rodar do zero

### Pré-requisitos
- Node.js 20 ou mais recente
- PostgreSQL rodando

### 1. Criar o banco
```bash
psql -U postgres -c "CREATE DATABASE financas;"
```

### 2. Back-end
```bash
cd backend
npm install
cp .env.example .env      # no Windows: copy .env.example .env
```
Edite o arquivo `.env`: coloque a senha do PostgreSQL em `DB_PASSWORD` e um texto longo e aleatório em `JWT_SECRET`.

```bash
npm run db:reset   # cria as tabelas (database/schema.sql) e insere os dados de exemplo (database/seed.js)
npm run dev        # API em http://localhost:3000
```

### 3. Front-end (em outro terminal)
```bash
cd frontend
npm install
npm run dev        # app em http://localhost:5173
```

### Usuários de exemplo (criados pelo seed)
| E-mail | Senha |
|---|---|
| ana@email.com | senha1234 |
| bruno@email.com | senha1234 |

Cada um tem 3 meses de lançamentos, um cartão de crédito e compras parceladas.

## Variáveis de ambiente (`backend/.env`)
| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão 3000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o PostgreSQL |
| `JWT_SECRET` | Segredo usado para assinar os tokens JWT |
| `FRONTEND_URL` | Origem autorizada no CORS (`http://localhost:5173`) |

O `.env` não vai para o Git. O `.env.example` é versionado como modelo.

## Rotas da API

Todas as rotas exigem o cabeçalho `Authorization: Bearer <token>`, **exceto** cadastro e login.
Todo erro responde no formato `{ "mensagem": "...", "campos": { "campo": "mensagem" } }`.

| Método | Rota | Função | Respostas |
|---|---|---|---|
| POST | `/api/auth/cadastro` | Cadastro | 201, 400, 409 |
| POST | `/api/auth/login` | Login, devolve o JWT (validade de 1h) | 200, 400, 401, 429 |
| GET | `/api/auth/me` | Usuário logado | 200, 401 |
| GET, POST | `/api/categorias` | Listar (`?tipo=`) / criar | 200, 201, 400, 409 |
| PUT, DELETE | `/api/categorias/:id` | Renomear / excluir | 200, 204, 400, 404, 409 |
| GET, POST | `/api/fontes-destinos` | Listar (`?tipo=`) / criar | 200, 201, 400, 409 |
| PUT, DELETE | `/api/fontes-destinos/:id` | Editar / excluir | 200, 204, 400, 404, 409 |
| GET | `/api/lancamentos` | Lista com filtros `inicio`, `fim`, `tipo`, `categoria_id`, `fonte_destino_id`, `pagina`, `limite` e os totais | 200, 400 |
| POST | `/api/lancamentos` | Criar (`total_parcelas` de 1 a 48, só em cartão) | 201, 400, 404 |
| GET, PUT, DELETE | `/api/lancamentos/:id` | Detalhar / editar / excluir (`?todasParcelas=true`) | 200, 204, 400, 404 |
| GET | `/api/relatorios/categorias` | RF7 (`inicio`, `fim`; padrão: mês atual) | 200, 400 |
| GET | `/api/relatorios/fontes-destinos` | RF8 (`inicio`, `fim`) | 200, 400 |
| GET | `/api/relatorios/faturas` | RF9 (`meses`, padrão 3) | 200 |

## Estrutura de pastas
```
backend/
  database/schema.sql      tabelas, UNIQUE, FK, CHECK e índice
  database/seed.js         recria o banco e insere os dados de exemplo
  src/server.js            configura o Express e registra as rotas
  src/config/              db.js (pool), validacoes.js, calculos.js (funções puras)
  src/middlewares/         autenticacao.js (JWT), erros.js (tratamento centralizado)
  src/models/              ÚNICA camada que acessa o banco
  src/routes/              rotas + controladores
frontend/
  src/contexts/AuthContext.jsx   usuário, token, login, logout e cadastro
  src/services/api.js            cliente HTTP único (Axios), com o token e o tratamento de 401
  src/services/formatacao.js     moeda, datas e máscaras
  src/components/                RotaProtegida, Layout, Campo, Estado
  src/components/paginas/        telas
```

### Funções utilitárias (documentadas conforme o enunciado)
- `backend/src/config/validacoes.js`: normalização de e-mail e CPF, validação de CPF (dígitos verificadores), de senha e de período.
- `backend/src/config/calculos.js`: datas, divisão de parcelas em centavos e cálculo de faturas.

## Decisões de projeto
- **Dinheiro em centavos (`INTEGER`).** R$ 10,50 é guardado como `1050`. Isso evita os erros de arredondamento do ponto flutuante.
- **Parcelas.** Cada parcela é uma linha da tabela, com o mesmo `grupo_parcelamento`. A sobra da divisão vai para a 1ª parcela (R$ 100,00 em 3× = 33,34 + 33,33 + 33,33). Todas as parcelas são gravadas numa transação.
- **Data das parcelas.** Todas as parcelas guardam a **data da compra**. A fatura de cada parcela é **calculada** a partir da data da compra e do número da parcela, usando a regra de fechamento (opção 1 do enunciado). Por isso as faturas continuam corretas mesmo que o dia de fechamento do cartão seja alterado depois.
- **Faturas.** Uma compra feita antes do dia de fechamento entra na fatura do mês. Uma compra feita no dia do fechamento ou depois entra na do mês seguinte. A parcela k cai k−1 meses depois. Se o dia de vencimento for maior que o de fechamento, a fatura vence no mesmo mês; senão, no mês seguinte. Dias que não existem no mês (31 em fevereiro, por exemplo) viram o último dia do mês.
- **Limite utilizado.** É a soma de todas as parcelas cuja fatura ainda não venceu.
- **Unicidade de categoria.** Vale para usuário, nome e tipo. O tipo da categoria não pode ser alterado depois de criado, para não gerar lançamentos com categoria de tipo diferente.
- **Exclusão.** Categorias e fontes/destinos com lançamentos vinculados não podem ser excluídos: a API responde 409 e a FK no banco também bloqueia.
- **Isolamento.** O id do usuário vem **só** do token (`req.usuarioId`). Todas as consultas filtram por ele. Registro de outro usuário responde 404.
