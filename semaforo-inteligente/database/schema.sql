-- Banco do Semáforo Inteligente (SQLite)
-- Executado pelo Node-RED a cada inicialização (nó "Criar tabelas"); é idempotente.
--
-- Guarda só o sistema de carros: cada carro que passou pelo sensor e o sinal
-- (cor do semáforo) no momento da passagem. Passar no VERMELHO é infração (multa).
-- Datas em ISO 8601 UTC (ex.: 2026-10-18T14:03:22.120Z). Para horário local use
-- datetime(registrado_em, 'localtime').

PRAGMA journal_mode = WAL;

-- Limpeza da estrutura antiga (versões anteriores do projeto gravavam leituras,
-- alertas e trocas de sinal; agora o banco é só das passagens).
DROP VIEW IF EXISTS v_eventos;
DROP VIEW IF EXISTS v_carros_por_hora;
DROP TABLE IF EXISTS veiculos;
DROP TABLE IF EXISTS mudancas_sinal;
DROP TABLE IF EXISTS pedidos_pedestre;
DROP TABLE IF EXISTS alertas;
DROP TABLE IF EXISTS leituras;
DROP TABLE IF EXISTS comandos;

-- Uma linha por carro que passou pelo sensor
CREATE TABLE IF NOT EXISTS passagens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  registrado_em TEXT    NOT NULL,
  placa         TEXT    NOT NULL,
  sinal         TEXT    NOT NULL CHECK (sinal IN ('VERDE', 'AMARELO', 'VERMELHO'))
);
CREATE INDEX IF NOT EXISTS idx_passagens_registrado_em ON passagens (registrado_em);
CREATE INDEX IF NOT EXISTS idx_passagens_placa ON passagens (placa);

-- Infrações: carros que passaram no vermelho (as "multas")
CREATE VIEW IF NOT EXISTS v_infracoes AS
  SELECT id, registrado_em, placa
    FROM passagens
   WHERE sinal = 'VERMELHO';

-- Resumo por carro: quantas vezes passou em cada sinal
CREATE VIEW IF NOT EXISTS v_resumo_por_placa AS
  SELECT placa,
         COUNT(*)                  AS passagens,
         SUM(sinal = 'VERDE')      AS no_verde,
         SUM(sinal = 'AMARELO')    AS no_amarelo,
         SUM(sinal = 'VERMELHO')   AS infracoes
    FROM passagens
   GROUP BY placa
   ORDER BY placa;
