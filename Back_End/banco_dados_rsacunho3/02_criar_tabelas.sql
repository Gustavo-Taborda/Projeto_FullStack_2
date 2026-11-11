-- =====================================================================
--  PASSO 2 — CRIAR AS TABELAS DENTRO DO BANCO "banco_db"
-- =====================================================================
--  Rode conectado AO BANCO "banco_db":
--
--      psql -U postgres -d banco_db -f 02_criar_tabelas.sql
--
--  ORDEM IMPORTA: uma tabela só pode referenciar (REFERENCES) outra que
--  já exista. Por isso a ordem é:
--      usuarios -> categorias -> fontes_destinos -> lancamentos
--  (lancamentos vem por último porque aponta para as três anteriores)
--
--  Mapa das relações ("1 usuário tem N de cada"):
--
--      usuarios ──┬──< categorias ───────┐
--                 ├──< fontes_destinos ──┼──< lancamentos
--                 └──────────────────────┘      (também aponta para usuarios)
-- =====================================================================


-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  -- SERIAL: o próprio banco gera 1, 2, 3... (substitui o "proximoId++")
  -- PRIMARY KEY: identifica cada linha de forma única
  id          SERIAL PRIMARY KEY,

  -- UNIQUE: o BANCO impede dois usuários com o mesmo email.
  -- NOT NULL: o campo é obrigatório.
  -- 255 é o tamanho máximo de um email; 50 poderia rejeitar emails válidos.
  -- DICA: converta o email para minúsculas na aplicação antes de gravar;
  -- senão "A@x.com" e "a@x.com" contam como emails diferentes.
  email       VARCHAR(255) NOT NULL UNIQUE,

  -- UNIQUE: o BANCO impede dois usuários com o mesmo CPF.
  -- 14 caracteres cabem "000.000.000-00". Escolha UM formato (com ou sem
  -- pontuação) e use sempre o mesmo; senão "123.456.789-09" e
  -- "12345678909" seriam tratados como CPFs diferentes.
  cpf         VARCHAR(14)  NOT NULL UNIQUE,

  -- Guardamos o HASH do bcrypt (60 caracteres), nunca a senha pura.
  senha_hash  VARCHAR(100) NOT NULL,

  -- Data de criação, preenchida automaticamente pelo banco.
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------
-- CATEGORIAS (ex.: Salário, Mercado, Lazer)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id       SERIAL PRIMARY KEY,

  -- REFERENCES usuarios(id): chave estrangeira. O banco só aceita um
  -- user_id que exista em usuarios.
  -- ON DELETE CASCADE: se o usuário for excluído, suas categorias
  -- vão junto (sem isso, o banco impediria excluir o usuário).
  user_id  INT         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  nome     VARCHAR(50) NOT NULL,

  -- No PostgreSQL, a lista de valores permitidos NÃO vai no lugar do tipo
  -- (isso era o erro: "tipo ('entrada','saida')"). Declaramos o tipo da
  -- coluna (VARCHAR) e restringimos os valores com CHECK ... IN (...).
  tipo     VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida'))
);


-- ---------------------------------------------------------------------
-- FONTES_DESTINOS (de onde o dinheiro sai ou para onde vai:
-- uma renda, uma conta bancária ou um cartão de crédito)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fontes_destinos (
  id       SERIAL PRIMARY KEY,
  user_id  INT         NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome     VARCHAR(50) NOT NULL,
  tipo     VARCHAR(20) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),

  -- "dia" de fechamento/vencimento é um número de 1 a 31, e não uma data
  -- completa. Por isso SMALLINT + CHECK, no lugar de DATE.
  dia_fechamento_cartao  SMALLINT CHECK (dia_fechamento_cartao BETWEEN 1 AND 31),
  dia_vencimento_cartao  SMALLINT CHECK (dia_vencimento_cartao BETWEEN 1 AND 31),

  -- Sem NOT NULL: só cartões têm limite (renda e conta ficam com NULL).
  limite_cartao  DECIMAL(10, 2) CHECK (limite_cartao >= 0),

  -- DEFAULT 0: se não informarem o saldo, começa zerado.
  saldo    DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Regra entre colunas: se for cartão de crédito, os três dados do cartão
  -- são obrigatórios. Lê-se: "ou NÃO é cartão, ou todos estão preenchidos".
  CONSTRAINT chk_dados_cartao CHECK (
    tipo <> 'cartao_credito'
    OR (dia_fechamento_cartao IS NOT NULL
        AND dia_vencimento_cartao IS NOT NULL
        AND limite_cartao IS NOT NULL)
  )
);


-- ---------------------------------------------------------------------
-- LANCAMENTOS (cada entrada ou saída de dinheiro)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lancamentos (
  id        SERIAL PRIMARY KEY,
  user_id   INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Sem ON DELETE CASCADE de propósito: o banco IMPEDE excluir uma
  -- categoria ou conta que ainda tenha lançamentos (protege o histórico).
  categoria_id      INT NOT NULL REFERENCES categorias(id),
  fonte_destino_id  INT NOT NULL REFERENCES fontes_destinos(id),

  -- OBS: não há coluna "tipo" aqui. Entrada ou saída já está na categoria
  -- (categorias.tipo). Guardar nos dois lugares permitiria contradições,
  -- como um lançamento "entrada" ligado a uma categoria "saida".
  -- Para obter o tipo: JOIN com categorias.

  descricao  VARCHAR(100) NOT NULL,

  -- DECIMAL(10,2): dinheiro com 2 casas, sem erros de arredondamento
  -- (nunca use FLOAT para dinheiro). Máximo: 99.999.999,99.
  -- CHECK: só aceita valores maiores que zero (o sinal vem do tipo).
  valor      DECIMAL(10, 2) NOT NULL CHECK (valor > 0),

  data       TIMESTAMP NOT NULL DEFAULT NOW(),

  -- DEFAULT 1: um lançamento à vista é a "parcela 1 de 1", sem a
  -- aplicação precisar mandar esses campos.
  parcela_atual   INT NOT NULL DEFAULT 1,
  total_parcelas  INT NOT NULL DEFAULT 1,

  -- Identifica as parcelas de uma mesma compra. Sem NOT NULL: lançamentos
  -- à vista não pertencem a nenhum grupo.
  grupo_parcelas  VARCHAR(50),

  -- Regra entre colunas: pelo menos 1 parcela e a atual nunca passa do total.
  CONSTRAINT chk_parcelas CHECK (
    total_parcelas >= 1 AND parcela_atual BETWEEN 1 AND total_parcelas
  )
);


-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
-- O PostgreSQL cria índice automático para PRIMARY KEY e UNIQUE, mas NÃO
-- para chaves estrangeiras. Como quase toda consulta do app filtra por
-- usuário ("meus lançamentos"), criamos índices nessas colunas; sem eles,
-- o banco leria a tabela inteira a cada consulta.
CREATE INDEX IF NOT EXISTS idx_categorias_user        ON categorias (user_id);
CREATE INDEX IF NOT EXISTS idx_fontes_destinos_user   ON fontes_destinos (user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_data  ON lancamentos (user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria  ON lancamentos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fonte      ON lancamentos (fonte_destino_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_fonte      ON lancamentos (fonte_destino_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_grupo      ON lancamentos (grupo_parcelas) WHERE grupo_parcelas IS NOT NULL;
