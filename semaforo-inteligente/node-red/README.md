# 🔀 Node-RED — broker MQTT, os dois fluxos, banco e API

Tudo do back-end roda em um único processo Node-RED instalado nesta pasta. Ele liga as duas
pontas do projeto, o **Wokwi** (ESP32) e o **dashboard**, com dois sistemas independentes:

```
SISTEMA 1 — SEMÁFORO (Wokwi → dashboard)
  ESP32 ──MQTT :1883──► [Aedes] ──► [mqtt in] ──► [Estado do semáforo] ──► WebSocket /ws/semaforo ──► dashboard
                                                     (luzes, tempos, botão, status)

SISTEMA 2 — CARROS (dashboard → banco, caminho inverso)
  dashboard ──WebSocket──► [Comandos do dashboard] ──► [Validar passagem] ──► [Registrar passagem] ──► SQLite (passagens)
     ▲                              │ botão              placa, ESP32 online,                     │
     │                              │                    duplicada, sinal oficial                 │
     │                              ▼                                                      ▼
     │                    MQTT cmd/botao_virtual ──► ESP32       [Avisar dashboard e ESP32] ─► MQTT cmd/passagem ──► ESP32 (buzzer)
     └──────────────────────── evento "passagem" (placa, sinal, multa, totais) ◄──┘
```

Os carros andam só no dashboard e obedecem à cor que vem do ESP32. Quando um carro cruza o
sensor, o dashboard avisa o Node-RED. **Nada vai direto para o banco:** o nó **Validar passagem**
confere a placa, exige o ESP32 online (para saber a cor oficial do sinal) e descarta leituras
duplicadas. Só então **Registrar passagem** grava **data/hora + placa + sinal**, e o Node-RED devolve
a confirmação para o dashboard (apito e balão no sensor) e para o ESP32 (buzzer e Monitor Serial).

## Como rodar

```bash
cd semaforo-inteligente/node-red
npm install
npm start
```

- Editor do Node-RED: http://localhost:1880
- Broker MQTT: `localhost:1883` (para o Wokwi: `host.wokwi.internal:1883`)
- WebSocket do dashboard: `ws://localhost:1880/ws/semaforo`

Requer Node.js 22.9 ou superior. Ao iniciar, o Node-RED executa `../database/schema.sql` e
carrega os totais do banco.

## O fluxo (`flows.json`)

| Bloco | O que faz |
|---|---|
| 1. Broker MQTT | Nó **Aedes** na porta 1883; o ESP32 e o próprio Node-RED conectam nele |
| 2. Banco | Ao iniciar: lê `schema.sql`, cria a tabela `passagens` e carrega os totais |
| 3. Semáforo | `mqtt in fatec/semaforo/01/#` → **Estado do semáforo**: guarda luz, segundos, tempos de cada LED, pedido de pedestre e status em `flow.semaforo` e manda a telemetria ao dashboard |
| 4. Carros | `websocket in` → **Comandos do dashboard** → botão vai ao ESP32; passagem vai a **Validar passagem** → **Registrar passagem** (INSERT) → **Consultar totais** → **Avisar dashboard e ESP32** |
| 5. API HTTP | Endpoints GET para consulta e para o dashboard abrir com o histórico |

O status embaixo de cada função mostra o que está acontecendo: cor e segundos do semáforo,
último botão, último carro no sensor e total de passagens/infrações.

### Validação (nó "Validar passagem")

| Regra | Recusa quando |
|---|---|
| Placa conhecida | A placa não é `1`, `2`, `3` ou `WOKWI` |
| Semáforo verificável | O ESP32 nunca mandou estado (Wokwi não iniciado) ou está offline |
| Sem duplicata | A mesma placa chegou há menos de 3 s |
| Sinal oficial | Não recusa: grava sempre a cor que o ESP32 publicou, mesmo que o dashboard tenha mandado outra |

As recusadas vão para o debug **passagens recusadas** com o motivo, e o status do nó mostra a última decisão.

### Mensagens

| De → para | Canal | Exemplo |
|---|---|---|
| ESP32 → Node-RED | MQTT `.../estado` (1 s) | `{"light":"RED","remainingS":5,"durationS":8,"pedestrianRequest":false,"tempos":{"verde":12,"amarelo":3,"vermelho":8,"vermelhoPedestre":10}}` |
| ESP32 → Node-RED | MQTT `.../status` (10 s, retido + Last Will) | `{"online":true,"wifiRssi":-58,"uptimeS":1234}` |
| ESP32 → Node-RED | MQTT `.../sensor/botao` | `{"pressed":true}` |
| ESP32 → Node-RED | MQTT `.../sensor/veiculo` (slider do HC-SR04) | `{"distanceCm":25}` |
| Dashboard → Node-RED | WebSocket | `{"type":"botao_virtual"}` · `{"type":"passagem","placa":"2","sinal":"RED"}` |
| Node-RED → ESP32 | MQTT `.../cmd/botao_virtual` | `{"pressed":true}` |
| Node-RED → ESP32 | MQTT `.../cmd/passagem` | `{"placa":"2","sinal":"RED","infracao":true}` |
| Node-RED → dashboard | WebSocket | telemetria (`type: "telemetry"`) e passagem gravada (`type: "passagem"`) |

### API

| Endpoint | Retorna |
|---|---|
| `GET /api/passagens?limite=10` | Últimas passagens (id, data, placa, sinal, infração) |
| `GET /api/infracoes` | Passagens no vermelho (até 100) |
| `GET /api/estatisticas` | Totais por sinal e quantidades de hoje |
| `GET /api/resumo-por-placa` | Por carro: passagens, no verde, no amarelo, infrações |

## Testar sem o Wokwi

`scripts/esp32-fake.mjs` faz o papel do ESP32 (mesmos tópicos e comandos do firmware):

```bash
npm run esp32-fake   # teclas: p = botão de pedestre, c = carro no HC-SR04, q = sair
```

Pare o ESP32 fake antes de ligar o Wokwi: os dois usam o mesmo tópico.

## Teste de integração

`scripts/teste-integracao.mjs` faz o papel do ESP32 (MQTT) e do dashboard (WebSocket) e confere as regras de validação, a gravação no banco e a API. Roda também no GitHub Actions (`.github/workflows/validacao.yml`). Use um banco vazio e deixe o Wokwi e o ESP32 fake desligados:

```bash
SEMAFORO_DB=/tmp/teste.db npm start   # terminal 1
npm run test:integracao               # terminal 2
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `flows.json` | O fluxo; edite pelo editor do Node-RED e clique em **Implementar** (Deploy) |
| `settings.js` | Porta, CORS da API e caminhos do banco (`SEMAFORO_DB`, `SEMAFORO_SCHEMA`) |
| `scripts/esp32-fake.mjs` | ESP32 de teste |
| `scripts/teste-integracao.mjs` | Teste de integração (MQTT, WebSocket, banco e API) |
