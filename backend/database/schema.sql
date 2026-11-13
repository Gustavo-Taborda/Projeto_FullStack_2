DROP TABLE IF EXISTS lancamentos, fontes_destinos, categorias, usuarios CASCADE;

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  cpf         CHAR(11)     NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        VARCHAR(60) NOT NULL,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  UNIQUE (usuario_id, nome, tipo)
);

CREATE TABLE fontes_destinos (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome             VARCHAR(60) NOT NULL,
  tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento   INTEGER CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento   INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite_centavos  INTEGER CHECK (limite_centavos > 0),
  UNIQUE (usuario_id, nome),
  CHECK (tipo <> 'cartao_credito'
         OR (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite_centavos IS NOT NULL))
);

CREATE TABLE lancamentos (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo                VARCHAR(10)  NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao           VARCHAR(200) NOT NULL,
  valor_centavos      INTEGER      NOT NULL CHECK (valor_centavos > 0),
  data                DATE         NOT NULL,
  categoria_id        INTEGER NOT NULL REFERENCES categorias(id),
  fonte_destino_id    INTEGER NOT NULL REFERENCES fontes_destinos(id),
  parcela_atual       INTEGER NOT NULL DEFAULT 1,
  total_parcelas      INTEGER NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento  UUID,
  CHECK (parcela_atual BETWEEN 1 AND total_parcelas)
);

CREATE INDEX idx_lancamentos_usuario_data ON lancamentos (usuario_id, data);
