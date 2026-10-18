# 🗄️ Banco de dados — SQLite

**Por que SQLite:** o projeto roda numa máquina só, para a apresentação. O SQLite é um arquivo
(`semaforo.db`), não precisa instalar nem configurar servidor, o Node-RED já tem o nó pronto
(`node-red-node-sqlite`) e as consultas são SQL comum, fáceis de mostrar na avaliação.

- `schema.sql`: tabelas, índices e views. O Node-RED executa este arquivo toda vez que inicia
  (é idempotente: `CREATE ... IF NOT EXISTS`).
- `semaforo.db`: criado automaticamente. Não vai para o Git.

## Tabelas

| Tabela | Uma linha por… | Colunas principais |
|---|---|---|
| `veiculos` | carro contado pelo HC-SR04 | `registrado_em`, `distancia_cm`, `estado_sinal` |
| `mudancas_sinal` | troca de cor dos LEDs | `estado`, `duracao_s`, `modo` |
| `pedidos_pedestre` | aperto do botão | `estado_sinal` no momento |
| `alertas` | alerta que surgiu | `nivel`, `codigo`, `mensagem` |
| `leituras` | amostra a cada 5 s | `distancia_cm`, `carros_por_min`, `wifi_rssi`, `online` |
| `comandos` | comando do Node-RED ao ESP32 | `topico`, `payload` |

Views: `v_eventos` (linha do tempo usada no card Histórico) e `v_carros_por_hora`.

Datas em ISO 8601 UTC. Para horário local: `datetime(registrado_em, 'localtime')`.

## Consultas úteis

```sql
-- Carros por hora hoje
SELECT * FROM v_carros_por_hora WHERE hora >= date('now', 'localtime');

-- Em que cor o sinal estava quando cada carro passou
SELECT estado_sinal, COUNT(*) FROM veiculos GROUP BY estado_sinal;

-- Quantas vezes o Node-RED estendeu o verde
SELECT COUNT(*) FROM comandos WHERE payload LIKE '%16%';

-- Últimos 10 eventos
SELECT datetime(registrado_em, 'localtime') AS quando, tipo, mensagem
  FROM v_eventos ORDER BY registrado_em DESC LIMIT 10;
```

Para abrir o arquivo: extensão **SQLite Viewer** do VS Code, DB Browser for SQLite, ou pela API do
Node-RED (`http://localhost:1880/api/estatisticas`).

Para zerar os dados: pare o Node-RED e apague `semaforo.db`, `semaforo.db-wal` e `semaforo.db-shm`.
