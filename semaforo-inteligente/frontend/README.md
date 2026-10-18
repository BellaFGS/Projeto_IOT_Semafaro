# 🚦 Semáforo.IoT — Dashboard gamificado

Front-end do projeto **Semáforo Inteligente** (FATEC Sorocaba · Mobilidade urbana).
É um mini dashboard em pixel art, **somente leitura**, sobre um cenário 2D com rua, faixa de pedestres,
pórtico com semáforo, sensor HC-SR04, carros e um personagem. Tudo o que aparece na tela vem do fluxo de dados do projeto:

```
HC-SR04 + botão ──► ESP32 (Wokwi/PlatformIO) ──► MQTT (Aedes) ──► Node-RED ──► WebSocket + API ──► Dashboard
      LEDs ◄──────────────── comando (tempo de verde) ◄─────────────┘   └──► SQLite
```

Por padrão (`npm run dev`) o dashboard lê os dados do Node-RED, que recebe o ESP32 do Wokwi. Também
há uma **simulação fictícia do ESP32** no próprio navegador (`?fonte=simulacao`), que publica os mesmos
tópicos e JSON do firmware e passa pelas mesmas regras: serve para apresentar sem back-end.

---

## Sumário

1. [O que o dashboard mostra](#1-o-que-o-dashboard-mostra)
2. [Como executar](#2-como-executar)
3. [Fonte de dados: Node-RED × simulação](#3-fonte-de-dados-node-red--simulação)
4. [Simulação do Wokwi (3 componentes)](#4-simulação-do-wokwi-3-componentes)
5. [Contrato de dados (JSON do Node-RED → dashboard)](#5-contrato-de-dados-json-do-node-red--dashboard)
6. [Back-end](#6-back-end)
7. [Testes de integração (Etapa 8)](#7-testes-de-integração-etapa-8)
8. [Estrutura de arquivos](#8-estrutura-de-arquivos)
9. [Identidade visual](#9-identidade-visual)

---

## 1. O que o dashboard mostra

O painel cobre os elementos pedidos na Etapa 7 do roteiro:

| Elemento do roteiro | Onde aparece |
|---|---|
| Valores dos sensores | Card **DISTÂNCIA** (HC-SR04, em cm) e linha **Botão** do card do circuito |
| Gráficos | Linha em degraus da distância (com limiar de 50 cm) e barras de carros/min (com limiar de fluxo intenso) |
| Indicadores | Contagem regressiva e barra do sinal, total de carros, carros/min, modo de operação |
| Alertas | Faixa **ALERTAS** com os alertas ativos calculados pelo Node-RED |
| Status dos dispositivos | Card **CIRCUITO WOKWI**: ESP32 ON/OFF, LEDs, botão, sensor, Wi-Fi e tempo ligado |
| Histórico | Card **HISTÓRICO**: ao abrir, carrega os últimos eventos do banco (API do Node-RED) e depois segue ao vivo |
| Controle dos atuadores | Automático: o Node-RED muda o tempo de verde do ESP32 conforme o fluxo. O dashboard não tem botões |

Se os dados param de chegar (Node-RED fora do ar ou mais de 5 s sem mensagem), o card **CIRCUITO WOKWI** passa para
`OFF`. Antes da primeira mensagem, os valores aparecem como `--`.

No cenário:

- o semáforo do pórtico acende a lâmpada recebida na telemetria e o visor mostra o tempo restante;
- o botão de pedestre na calçada pisca quando há pedido de travessia;
- o **HC-SR04** fica preso no poste, com um feixe até a pista que acende quando detecta um carro;
- **carros**: o Wokwi não tem um "carro", então o carro do cenário é a leitura do HC-SR04. Quando a distância cai
  abaixo de 50 cm, um carro entra pela esquerda e para antes da faixa, embaixo do sensor. Quando a distância volta a
  subir, ele segue viagem atravessando a faixa. Cada carro que aparece é um carro contado pelo Node-RED
  (implementação em [`Car.tsx`](src/components/game/Car.tsx)).

O único controle do usuário é mover o personagem (`←` `→` ou `A` / `D`). O botão **OCULTAR/PAINEL** só esconde o painel.

---

## 2. Como executar

Pré-requisitos: Node.js 18+ e npm. Para dados reais, suba antes o Node-RED (`../node-red`, `npm start`).

```bash
cd semaforo-inteligente/frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Outros comandos:

| Comando | O que faz |
|---|---|
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve a pasta `dist/` |
| `npm run lint` | Roda o oxlint |

As fontes pixel art (Silkscreen e Pixelify Sans) vêm do npm (`@fontsource`), então funcionam sem internet na apresentação.

---

## 3. Fonte de dados: Node-RED × simulação

A fonte é escolhida em [`src/services/telemetry/config.ts`](src/services/telemetry/config.ts). Em
desenvolvimento, [`.env.development`](.env.development) já aponta para o Node-RED local:

```bash
VITE_DATA_SOURCE=websocket                              # ou simulation
VITE_NODE_RED_WS_URL=ws://localhost:1880/ws/semaforo   # telemetria ao vivo
VITE_NODE_RED_HTTP_URL=http://localhost:1880           # histórico do banco (/api/...)
```

Para mudar só na sua máquina, crie `.env.local` com os valores (não vai para o Git).

**Pela URL**, sem reiniciar (prático na apresentação):

| URL | Fonte |
|---|---|
| `http://localhost:5173/` | Node-RED local (padrão em desenvolvimento) |
| `http://localhost:5173/?fonte=simulacao` | ESP32 fictício no navegador, sem back-end |
| `http://localhost:5173/?ws=ws://192.168.0.10:1880/ws/semaforo&api=http://192.168.0.10:1880` | Node-RED em outra máquina |

No modo WebSocket o front reconecta sozinho se o Node-RED cair (espera de 1 s, dobrando até 10 s).
Mensagens fora do contrato são ignoradas e aparecem como aviso no console do navegador. Se a API de
histórico não responder, o dashboard funciona normalmente só com os dados ao vivo.

---

## 4. Simulação do Wokwi (3 componentes)

Arquivo: [`src/services/telemetry/simulatedWokwiSource.ts`](src/services/telemetry/simulatedWokwiSource.ts).
Ela imita o `loop()` do firmware a cada 500 ms e simula os três componentes do circuito:

| # | Componente | Pino ESP32 | Comportamento simulado |
|---|---|---|---|
| 1 | **LEDs** vermelho / amarelo / verde | GPIO 25 / 26 / 27 | Ciclo verde 12 s → amarelo 3 s → vermelho 8 s. O verde passa a 16 s quando o Node-RED manda o comando de fluxo intenso |
| 2 | **Botão de pedestre** | GPIO 14 (`INPUT_PULLUP`) | Apertado de vez em quando durante o verde: o verde cai para 3 s (o pedestre espera menos) e o vermelho seguinte dura 10 s para a travessia |
| 3 | **HC-SR04** (contador de carros) | TRIG 5 / ECHO 18 | Carros se aproximam de 230 cm, param na faixa no vermelho e passam no verde. Sem carro, a leitura fica em ~320 cm. Alguns carros param em cima da faixa (14 cm) para testar o alerta. A cada ~2 min há 45 s de trânsito intenso |

**Por que HC-SR04 para contar carros:** já está no `diagram.json` do grupo e na tabela da atividade. No Wokwi dá
para arrastar a distância e "passar um carro" na hora. Ele também mede *o quanto* o carro está perto, o que permite o
alerta de carro sobre a faixa, coisa que um sensor de presença (PIR/IR) não daria.

O caminho dos dados simulados é o mesmo do sistema real:

```
ESP32 simulado ──(tópico + JSON)──► regras do Node-RED (nodeRedRules.ts) ──(JSON)──► parseTelemetry ──► dashboard
                ◄──── cmd/tempo_verde ────┘
```

[`nodeRedRules.ts`](src/services/telemetry/nodeRedRules.ts) é a mesma lógica do nó function **Regras do semáforo** de [`../node-red/flows.json`](../node-red/flows.json).
Se uma regra mudar, mude nos dois lugares.

---

## 5. Contrato de dados (JSON do Node-RED → dashboard)

Tipo `TrafficTelemetry` em [`src/types/traffic.ts`](src/types/traffic.ts). O Node-RED envia **um objeto por mensagem**
no WebSocket, sempre com todos os campos:

```json
{
  "type": "telemetry",
  "deviceId": "esp32-semaforo-01",
  "timestamp": "2026-10-16T19:03:22.120Z",
  "light": { "state": "GREEN", "remainingS": 9, "durationS": 12 },
  "mode": "AUTOMATICO",
  "sensors": { "ultrasonicCm": 145.2, "vehicleDetected": false, "pedestrianRequest": false },
  "flow": { "vehicleCount": 14, "vehiclesPerMin": 5 },
  "actuators": { "ledRed": false, "ledYellow": false, "ledGreen": true },
  "device": { "online": true, "wifiRssi": -58, "uptimeS": 1234 },
  "alerts": [
    { "level": "warning", "code": "VEICULO_PROXIMO", "message": "Veículo sobre a faixa (14 cm)" }
  ]
}
```

| Campo | Tipo | Significado |
|---|---|---|
| `type` | `"telemetry"` | Obrigatório. Outras mensagens são ignoradas |
| `light.state` | `RED` \| `YELLOW` \| `GREEN` | Obrigatório. Lâmpada acesa |
| `light.remainingS` / `durationS` | número (s) | Tempo restante e duração total do estado. O front faz a contagem entre mensagens |
| `mode` | `AUTOMATICO` \| `PEDESTRE` \| `FLUXO_INTENSO` \| `ATENCAO` | Modo decidido pelas regras |
| `sensors.ultrasonicCm` | número (cm) | Leitura do HC-SR04 |
| `sensors.vehicleDetected` | booleano | Distância < 50 cm |
| `sensors.pedestrianRequest` | booleano | Pedido de travessia pendente |
| `flow.vehicleCount` | inteiro | Total de carros gravados no banco (continua depois de reiniciar o Node-RED) |
| `flow.vehiclesPerMin` | número | Carros no último minuto |
| `actuators.led*` | booleano | Estado dos LEDs. Se faltar, o front deduz pelo `light.state` |
| `device.online` / `wifiRssi` / `uptimeS` | booleano / dBm / s | Status do ESP32 |
| `alerts[]` | `{ level: info\|warning\|critical, code, message }` | Alertas ativos agora |

A validação fica em [`parseTelemetry.ts`](src/services/telemetry/parseTelemetry.ts): números podem vir como string,
campos opcionais ausentes recebem padrão e uma mensagem sem `light.state` válido é descartada.

---

## 6. Back-end

O back-end está implementado nas pastas irmãs do front. Cada uma tem seu README:

| Parte | Pasta | Resumo |
|---|---|---|
| Circuito e firmware | [`../wokwi`](../wokwi/README.md) | `diagram.json` (ESP32, 3 LEDs, botão, HC-SR04), `src/main.cpp`, `include/config.h` |
| Broker, regras e API | [`../node-red`](../node-red/README.md) | Aedes na porta 1883, função "Regras do semáforo", WebSocket `/ws/semaforo`, API `/api/...` |
| Banco | [`../database`](../database/README.md) | SQLite: `schema.sql` (tabelas `veiculos`, `mudancas_sinal`, `pedidos_pedestre`, `alertas`, `leituras`, `comandos`) |

Tópicos MQTT (prefixo `fatec/semaforo/01`): `sensor/ultrassonico`, `sensor/botao`, `estado`, `status`
(retido + Last Will) e `cmd/tempo_verde` (Node-RED → ESP32). Os mesmos nomes estão em
[`config.ts`](src/services/telemetry/config.ts), em `../wokwi/include/config.h` e no fluxo do Node-RED.

As regras do Node-RED (contagem por borda de subida abaixo de 50 cm, fluxo intenso com ≥ 8 carros/min,
pedestre, carro sobre a faixa, ESP32 offline, Wi-Fi fraco) também existem em
[`nodeRedRules.ts`](src/services/telemetry/nodeRedRules.ts), usado pela simulação do navegador.
Se uma regra mudar, mude nos dois lugares.

---

## 7. Testes de integração (Etapa 8)

| # | Teste | Como provocar | Resultado esperado no dashboard |
|---|---|---|---|
| 1 | Fluxo completo | Wokwi rodando, Node-RED ativo, abrir `http://localhost:5173` | Circuito `ON`, sinal do pórtico igual aos LEDs do Wokwi |
| 2 | Contagem | Arrastar o HC-SR04 abaixo de 50 cm e voltar | Total de carros +1, um carro para na faixa embaixo do sensor e segue viagem quando a distância volta a subir |
| 3 | Fluxo intenso | Passar 8 carros em menos de 1 min | Modo `FLUXO INTENSO`, alerta, verde seguinte com 16 s |
| 4 | Pedestre | Apertar o botão no verde | Contagem cai para 3 s, botão da calçada pisca, vermelho com 10 s |
| 5 | Carro na faixa | Distância < 20 cm | Alerta "Veículo sobre a faixa" |
| 6 | ESP32 cai | Parar a simulação do Wokwi | Após 5 s sem mensagem: circuito `OFF`. Após ~25 s (Last Will do broker): alerta crítico e modo `ATENÇÃO` |
| 7 | Node-RED cai | Parar o Node-RED | Circuito `OFF`; ao religar, os dados voltam sozinhos |

---

## 8. Estrutura de arquivos

```
frontend/
├── index.html
├── package.json
├── .env.development              ← fonte de dados padrão (Node-RED local)
├── src/
│   ├── main.tsx                      ← entrada React + fontes pixel art
│   ├── index.css                     ← tokens de cor e fontes (identidade visual)
│   ├── types/traffic.ts              ← contrato TrafficTelemetry
│   ├── services/telemetry/
│   │   ├── config.ts                 ← tópicos MQTT, pinos do Wokwi, fonte de dados e URL do WebSocket
│   │   ├── parseTelemetry.ts         ← validação das mensagens do Node-RED
│   │   ├── websocketSource.ts        ← cliente WebSocket com reconexão
│   │   ├── historyApi.ts             ← histórico do banco pela API do Node-RED
│   │   ├── nodeRedRules.ts           ← regras do Node-RED (usadas pela simulação)
│   │   ├── simulatedWokwiSource.ts   ← ESP32 fictício (LEDs, botão, HC-SR04)
│   │   └── index.ts                  ← escolhe a fonte conforme a config
│   ├── hooks/
│   │   ├── useTrafficTelemetry.ts    ← estado do dashboard, histórico e eventos
│   │   └── useCharacterControl.ts    ← movimento e animação do personagem
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── TrafficDashboard.tsx  ← mini dashboard somente leitura
│   │   │   ├── widgets.tsx           ← gráficos, LEDs, barras de sinal
│   │   │   └── dashboard.css
│   │   └── game/
│   │       ├── GameScene.tsx         ← cenário 2D ligado à telemetria
│   │       ├── Car.tsx               ← carros e HC-SR04 sincronizados com o sensor
│   │       └── TrafficLight.tsx      ← pórtico com LEDs em PNG sobre as lâmpadas
│   └── assets/game/                  ← sprites (personagem, rua, semáforo, LEDs)
└── README.md
```

---

## 9. Identidade visual

- **Fontes:** Silkscreen nos títulos, etiquetas e números (estilo 8-bit, com acentos) e Pixelify Sans no texto corrido.
- **Painéis:** azul-asfalto `#161a32` com borda dura de 4 px `#0b0d1a`, realce interno `#333b72` e sombra deslocada sem blur.
  Nada de cantos arredondados nem desfoque.
- **Cores:** vermelho `#ff4d5e`, amarelo `#ffc23d` e verde `#3ee87a` são as cores do sinal e também de erro, atenção e ok.
  Ciano `#55d6ff` é para dados de sensor e violeta `#b48cff` para o modo pedestre. Texto creme `#f6f0d8` e apoio `#9ea6d6`.
- **Sprites:** sempre com `image-rendering: pixelated` (classe `.pixel-art`). Os LEDs acesos são os PNGs `red/yellow/green.png`
  sobre as lâmpadas apagadas do `semaforo.png`.

Os tokens ficam em [`src/index.css`](src/index.css). Para mudar a identidade, edite as variáveis `--px-*`.
