-- Banco do Semáforo Inteligente (SQLite)
-- Executado pelo Node-RED a cada inicialização (nó "Criar tabelas"); é idempotente.
-- Datas em ISO 8601 UTC (ex.: 2026-10-18T14:03:22.120Z). Para horário local use
-- datetime(registrado_em, 'localtime').

PRAGMA journal_mode = WAL;

-- Cada carro contado pelo HC-SR04 (distância cruzou para menos de 50 cm)
CREATE TABLE IF NOT EXISTS veiculos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  distancia_cm  REAL    NOT NULL,
  estado_sinal  TEXT    NOT NULL CHECK (estado_sinal IN ('RED', 'YELLOW', 'GREEN'))
);
CREATE INDEX IF NOT EXISTS idx_veiculos_registrado_em ON veiculos (registrado_em);

-- Cada troca de cor dos LEDs
CREATE TABLE IF NOT EXISTS mudancas_sinal (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  estado        TEXT    NOT NULL CHECK (estado IN ('RED', 'YELLOW', 'GREEN')),
  duracao_s     INTEGER NOT NULL,
  modo          TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mudancas_sinal_registrado_em ON mudancas_sinal (registrado_em);

-- Cada acionamento do botão de pedestre
CREATE TABLE IF NOT EXISTS pedidos_pedestre (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  estado_sinal  TEXT    NOT NULL
);

-- Alertas gerados pelas regras (gravados quando aparecem)
CREATE TABLE IF NOT EXISTS alertas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  nivel         TEXT    NOT NULL CHECK (nivel IN ('info', 'warning', 'critical')),
  codigo        TEXT    NOT NULL,
  mensagem      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alertas_registrado_em ON alertas (registrado_em);

-- Amostra periódica (a cada 5 s) para os gráficos do dashboard
CREATE TABLE IF NOT EXISTS leituras (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em  TEXT    NOT NULL,
  distancia_cm   REAL    NOT NULL,
  carros_por_min INTEGER NOT NULL,
  wifi_rssi      INTEGER,
  online         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leituras_registrado_em ON leituras (registrado_em);

-- Comandos enviados pelo Node-RED ao ESP32 (automação)
CREATE TABLE IF NOT EXISTS comandos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  topico        TEXT    NOT NULL,
  payload       TEXT    NOT NULL
);

-- Linha do tempo única usada pelo card "Histórico" do dashboard
CREATE VIEW IF NOT EXISTS v_eventos AS
  SELECT registrado_em, 'info' AS nivel, 'SINAL' AS tipo,
         'Sinal ' || CASE estado WHEN 'RED' THEN 'vermelho' WHEN 'YELLOW' THEN 'amarelo' ELSE 'verde' END
         || ' (' || duracao_s || 's)' AS mensagem
    FROM mudancas_sinal
  UNION ALL
  SELECT registrado_em, nivel, 'ALERTA', mensagem FROM alertas
  UNION ALL
  SELECT registrado_em, 'info', 'VEICULO', 'Carro contado (' || printf('%.0f', distancia_cm) || ' cm)' FROM veiculos
  UNION ALL
  SELECT registrado_em, 'info', 'PEDESTRE', 'Botão de pedestre acionado' FROM pedidos_pedestre;

-- Carros por hora (horário local), para relatórios
CREATE VIEW IF NOT EXISTS v_carros_por_hora AS
  SELECT strftime('%Y-%m-%d %H:00', registrado_em, 'localtime') AS hora, COUNT(*) AS carros
    FROM veiculos
   GROUP BY hora
   ORDER BY hora;
