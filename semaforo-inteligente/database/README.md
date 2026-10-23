# 🗄️ Banco de dados — SQLite

O banco guarda **só o sistema de carros**: cada carro que passou pelo sensor e a cor do
semáforo no momento da passagem. Passar no **vermelho** é infração (a "multa" da simulação).

**Por que SQLite:** o projeto roda numa máquina só. O banco é um arquivo (`semaforo.db`), não
precisa de servidor, o Node-RED já tem o nó pronto (`node-red-node-sqlite`) e as consultas são
SQL comum. Para ver os dados: **DB Browser for SQLite** (abra o `semaforo.db` em modo somente
leitura enquanto o Node-RED estiver rodando).

- `schema.sql`: tabela, índices e views. O Node-RED executa este arquivo toda vez que inicia
  (é idempotente). Ele também apaga as tabelas da versão antiga do projeto, se existirem.
- `semaforo.db`: criado automaticamente. Não vai para o Git.

## Tabela `passagens`

| Coluna | Tipo | Exemplo |
|---|---|---|
| `id` | inteiro, autoincremento | `8` |
| `registrado_em` | texto ISO 8601 (UTC) | `2026-10-18T22:33:38.120Z` |
| `placa` | texto | `2` (carros do dashboard: 1, 2, 3 · `WOKWI`: slider do HC-SR04 no simulador) |
| `sinal` | `VERDE` · `AMARELO` · `VERMELHO` | `VERMELHO` |

O sinal gravado é o **oficial do ESP32** (último estado que o Wokwi publicou) no instante em
que o carro cruzou o sensor no dashboard.

## Views

| View | O que mostra |
|---|---|
| `v_infracoes` | Só as passagens no vermelho (as multas) |
| `v_resumo_por_placa` | Por carro: total de passagens, quantas no verde, no amarelo e infrações |

## Consultas úteis

```sql
-- Últimas 10 passagens, em horário local
SELECT id, datetime(registrado_em, 'localtime') AS quando, placa, sinal
  FROM passagens ORDER BY id DESC LIMIT 10;

-- Multas por carro
SELECT placa, COUNT(*) AS multas FROM v_infracoes GROUP BY placa;

-- Distribuição das passagens por cor do sinal
SELECT sinal, COUNT(*) FROM passagens GROUP BY sinal;

-- Resumo por carro
SELECT * FROM v_resumo_por_placa;
```

Para zerar os dados: pare o Node-RED e apague `semaforo.db`, `semaforo.db-wal` e `semaforo.db-shm`
(ou rode `DELETE FROM passagens;`).
