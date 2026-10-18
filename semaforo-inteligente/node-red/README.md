# 🔀 Node-RED — broker MQTT, regras, banco e API

Tudo do back-end roda em um único processo Node-RED instalado nesta pasta:

```
ESP32 (Wokwi) ──MQTT :1883──► [Aedes broker] ──► [mqtt in] ──► [Regras do semáforo] ─┬─► WebSocket /ws/semaforo ──► dashboard
                                                                                     ├─► mqtt out cmd/tempo_verde ──► ESP32
                                                                                     └─► SQLite (database/semaforo.db)
dashboard ──HTTP──► /api/eventos · /api/leituras · /api/estatisticas · /api/carros-por-hora ──► SQLite
```

## Como rodar

```bash
cd semaforo-inteligente/node-red
npm install
npm start
```

- Editor do Node-RED: http://localhost:1880
- Broker MQTT: `localhost:1883` (para o Wokwi: `host.wokwi.internal:1883`)
- WebSocket do dashboard: `ws://localhost:1880/ws/semaforo`

Requer Node.js 22.9 ou superior. Na primeira vez o Node-RED cria o banco executando
`../database/schema.sql`.

## O fluxo (`flows.json`)

| Bloco | O que faz |
|---|---|
| 1. Broker MQTT | Nó **Aedes** escutando na porta 1883; o ESP32 e o próprio Node-RED conectam nele |
| 2. Banco SQLite | Ao iniciar: lê `schema.sql`, cria as tabelas e carrega o total de carros já gravados (o contador continua depois de reiniciar) |
| 3. Regras | `mqtt in fatec/semaforo/01/#` → função **Regras do semáforo** com 3 saídas: telemetria para o dashboard, comando para o ESP32 e INSERTs no banco |
| 4. API HTTP | Endpoints GET que o dashboard usa para abrir com o histórico |

O status embaixo do nó **Regras do semáforo** mostra em tempo real: cor, segundos, distância e modo.

### Regras

| Regra | Condição | Efeito |
|---|---|---|
| Contagem | Distância cruza para < 50 cm | +1 carro, INSERT em `veiculos` |
| Fluxo intenso | ≥ 8 carros no último minuto | Modo `FLUXO_INTENSO`, alerta, comando `{"durationS":16}` ao ESP32 (volta a 12 quando normaliza) |
| Pedestre | Botão apertado | Modo `PEDESTRE`, alerta informativo, INSERT em `pedidos_pedestre` |
| Carro na faixa | Distância < 20 cm | Alerta `VEICULO_PROXIMO` |
| ESP32 offline | Last Will `{"online":false}` | Modo `ATENCAO`, alerta crítico |
| Wi-Fi fraco | RSSI < −80 dBm | Alerta `SINAL_FRACO` |

Cada troca de cor vai para `mudancas_sinal`, cada alerta novo para `alertas`, cada comando para
`comandos`, e a cada 5 s uma amostra vai para `leituras`.

### API

| Endpoint | Retorna |
|---|---|
| `GET /api/eventos?limite=8` | Últimos eventos (sinal, carros, pedestre, alertas) da view `v_eventos` |
| `GET /api/leituras?limite=60` | Últimas amostras (distância, carros/min), mais antiga primeiro |
| `GET /api/estatisticas` | Total de carros e contagens de hoje (carros, pedestres, alertas, ciclos) |
| `GET /api/carros-por-hora` | Carros por hora (últimas 24 horas com movimento) |

## Testar sem o Wokwi

`scripts/esp32-fake.mjs` publica no broker exatamente o que o firmware publica:

```bash
npm run esp32-fake            # teclas: c = passa um carro, p = botão de pedestre, q = sair
npm run esp32-fake -- --auto  # carros e pedestres aleatórios
```

Pare o ESP32 fake antes de ligar o Wokwi: os dois usam o mesmo tópico.

## Arquivos

| Arquivo | O que é |
|---|---|
| `flows.json` | O fluxo; edite pelo editor do Node-RED e clique em **Deploy** (o arquivo é salvo formatado) |
| `settings.js` | Porta, CORS da API e caminhos do banco (`SEMAFORO_DB`, `SEMAFORO_SCHEMA`) |
| `scripts/esp32-fake.mjs` | ESP32 de teste |

Para usar outro arquivo de banco: `SEMAFORO_DB=C:\caminho\outro.db npm start`.
