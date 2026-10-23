# 🚦 Semáforo.IoT — Dashboard

Front-end do projeto **Semáforo Inteligente** (FATEC Sorocaba · Mobilidade urbana). É a ponta final
do projeto: um mini dashboard em pixel art sobre uma cena de rua com o semáforo, o sensor, os carros
e um pedestre.

O projeto tem **dois sistemas independentes** que conversam pelo Node-RED:

```
1. SEMÁFORO   ESP32 (Wokwi) ──MQTT──► Node-RED ──WebSocket──► dashboard
              (LEDs com o tempo de cada cor, botão de pedestre)

2. CARROS     dashboard ──WebSocket──► Node-RED ──► SQLite (placa + sinal)
              (carros obedecem ao LED)        └──► confirmação ao dashboard (apito) e ao ESP32 (buzzer)
```

Os carros andam só no dashboard e obedecem à cor publicada pelo ESP32; de tempos em tempos um carro
fura o vermelho. Quando um carro cruza o sensor, a passagem é gravada no banco com a cor do sinal
naquele instante. Passar no vermelho é infração (a "multa" da simulação).

---

## Sumário

1. [O que aparece na tela](#1-o-que-aparece-na-tela)
2. [Como executar](#2-como-executar)
3. [Fonte de dados: Node-RED × simulação](#3-fonte-de-dados-node-red--simulação)
4. [Sistema dos carros](#4-sistema-dos-carros)
5. [Contrato de dados](#5-contrato-de-dados)
6. [Back-end](#6-back-end)
7. [Testes de integração (Etapa 8)](#7-testes-de-integração-etapa-8)
8. [Estrutura de arquivos](#8-estrutura-de-arquivos)
9. [Identidade visual](#9-identidade-visual)

---

## 1. O que aparece na tela

### Cena

- **Fundo**: `src/assets/game/backgrounds/rua-melhorada.webp` (3072×2048), com a rua principal na
  horizontal e a rua do meio indo para o fundo. Cobre a tela em 3:2, alinhado por baixo.
- **Semáforo da imagem**: acende conforme o ESP32. A lâmpada acesa recebe o LED em PNG com brilho
  (`traffic-light/on/`) e as outras a luz apagada (`traffic-light/off/`). Ao lado, os segundos restantes.
- **Semáforo de pedestre**: no mesmo poste, logo abaixo. É o inverso dos carros (boneco verde só com os
  carros no vermelho), calculado no dashboard como no ESP32; não passa pelo MQTT nem pelo Node-RED. A
  lâmpada apagada recebe a mesma luz apagada de `traffic-light/off/`.
- **Botão de pedestre do poste**: **clique nele** para pedir a
  travessia; o pedido vai ao ESP32 como se fosse o botão físico. No verde, o verde termina em até 3 s
  e o vermelho seguinte dura 10 s. Com o sinal já vermelho, o ESP32 ignora o pedido.
- **HC-SR04**: preso no poste, com o feixe atravessando a rua do meio na faixa de pedestres. O feixe
  acende enquanto um carro passa. Quando o Node-RED confirma a passagem gravada, o sensor apita e
  mostra um balão: **"CARRO 2"**, ou **"MULTA! CARRO 2"** em vermelho se passou no vermelho.
- **Carros** com placa **1, 2 e 3** (ver [seção 4](#4-sistema-dos-carros)).
- **Pedestre**: controlado pelo usuário com **← →** (ou **A / D**) pela calçada da frente. Para
  atravessar a rua do meio com segurança, peça a travessia no botão e espere o sinal dos carros fechar.

O apito do site só toca depois do primeiro clique na página (regra dos navegadores).

### Painel (somente leitura)

| Card | Mostra |
|---|---|
| **Semáforo** | Segundos restantes, modo (automático, pedestre, sem ESP32) e o tempo de cada LED publicado pelo ESP32 |
| **Passagens** | Total de carros que passaram pelo sensor, carros/min e uma barra dividida por cor do sinal |
| **Infrações** | Quantas passaram no vermelho, a porcentagem e a última multa (carro e horário) |
| **Passagens recentes** | Últimas passagens do banco: horário, carro, sinal e MULTA |

Na barra do título ficam os alertas do semáforo (ESP32 sem comunicação, pedestre aguardando, Wi-Fi
fraco).

---

## 2. Como executar

Pré-requisitos: Node.js 18+ e npm. Para dados reais, suba antes o Node-RED (`../node-red`, `npm start`)
e inicie a simulação do Wokwi.

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
VITE_NODE_RED_WS_URL=ws://localhost:1880/ws/semaforo   # telemetria, passagens e comandos
VITE_NODE_RED_HTTP_URL=http://localhost:1880           # passagens já gravadas (/api/passagens)
```

Para mudar só na sua máquina, crie `.env.local` com os valores (não vai para o Git).

**Pela URL**, sem reiniciar (prático na apresentação):

| URL | Fonte |
|---|---|
| `http://localhost:5173/` | Node-RED local (padrão em desenvolvimento) |
| `http://localhost:5173/?fonte=simulacao` | ESP32 + Node-RED simulados no navegador, sem back-end (passagens só em memória) |
| `http://localhost:5173/?ws=ws://192.168.0.10:1880/ws/semaforo&api=http://192.168.0.10:1880` | Node-RED em outra máquina |

No modo WebSocket o front reconecta sozinho se o Node-RED cair (espera de 1 s, dobrando até 10 s).
Mensagens fora do contrato são ignoradas e aparecem como aviso no console do navegador.

---

## 4. Sistema dos carros

Implementação em [`traffic/useTrafficSystem.ts`](src/components/game/traffic/useTrafficSystem.ts),
geometria da rua em [`traffic/roadGeometry.ts`](src/components/game/traffic/roadGeometry.ts) e
sprites em `assets/game/vehicles/` (frente, costas e lateral).

- **Independente do semáforo**: só lê a cor que o ESP32 publicou. No vermelho os carros param na linha
  da faixa de pedestres; no amarelo, decidem uma vez: se já estavam perto demais para frear, seguem.
- **Placas 1, 2 e 3**: no máximo três carros na rua, um a cada 5–9 s, devagar. Carros da mesma rota
  fazem fila sem encostar.
- **Furando o vermelho**: um a cada quatro carros ignora o vermelho e passa, gerando a infração.
- **Rotas com perspectiva**:
  - *descendo*: nasce pequeno no fundo da rua do meio (faixa da esquerda), cresce com a perspectiva
    medida na imagem (sprite de frente), cruza e vira à direita dele para a rua principal (sprite lateral);
  - *subindo*: vem pela rua principal pela direita (sprite lateral), espera o verde, vira para a rua do
    meio e vai embora pela faixa da direita (sprite de costas), diminuindo até sumir.
- **Passagem**: cada carro avisa uma única vez, ao cruzar a linha do sensor, mandando
  `{"type":"passagem","placa":"2","sinal":"RED"}` pelo WebSocket. O Node-RED grava com o sinal **oficial
  do ESP32** e devolve a confirmação, que faz o sensor apitar.

---

## 5. Contrato de dados

Tipos em [`src/types/traffic.ts`](src/types/traffic.ts), validação em
[`parseTelemetry.ts`](src/services/telemetry/parseTelemetry.ts).

**Telemetria do semáforo** (Node-RED → dashboard, a cada estado do ESP32):

```json
{
  "type": "telemetry",
  "deviceId": "esp32-semaforo-01",
  "timestamp": "2026-10-18T22:33:22.120Z",
  "light": { "state": "GREEN", "remainingS": 9, "durationS": 12 },
  "times": { "verde": 12, "amarelo": 3, "vermelho": 8, "vermelhoPedestre": 10 },
  "mode": "AUTOMATICO",
  "pedestrianRequest": false,
  "actuators": { "ledRed": false, "ledYellow": false, "ledGreen": true },
  "device": { "online": true, "wifiRssi": -58, "uptimeS": 1234 },
  "alerts": [],
  "passages": { "total": 13, "green": 8, "yellow": 2, "red": 3, "perMin": 6 },
  "lastPassage": { "id": 13, "at": "2026-10-18T22:34:31.000Z", "plate": "2", "light": "RED", "violation": true }
}
```

**Passagem gravada** (Node-RED → dashboard, a cada carro):

```json
{ "type": "passagem", "passage": { "id": 14, "at": "...", "plate": "1", "light": "GREEN", "violation": false },
  "stats": { "total": 14, "green": 9, "yellow": 2, "red": 3, "perMin": 6 } }
```

**Comandos** (dashboard → Node-RED): `{"type":"botao_virtual"}` e `{"type":"passagem","placa":"2","sinal":"RED"}`.

---

## 6. Back-end

| Parte | Pasta | Resumo |
|---|---|---|
| Circuito e firmware | [`../wokwi`](../wokwi/README.md) | ESP32 com LEDs, botão, HC-SR04 e buzzer; tempos em `include/config.h` |
| Broker, fluxos e API | [`../node-red`](../node-red/README.md) | Aedes na 1883, fluxo do semáforo e fluxo dos carros separados |
| Banco | [`../database`](../database/README.md) | SQLite: tabela `passagens` (placa + sinal) e views de infrações |

[`nodeRedRules.ts`](src/services/telemetry/nodeRedRules.ts) reproduz no navegador as funções do Node-RED
para o modo `?fonte=simulacao`. Se uma regra mudar no fluxo, mude lá também.

---

## 7. Testes de integração (Etapa 8)

| # | Teste | Como provocar | Resultado esperado |
|---|---|---|---|
| 1 | Semáforo sincronizado | Wokwi rodando, Node-RED ativo, abrir o dashboard | O semáforo da imagem troca junto com os LEDs do Wokwi |
| 2 | Carros obedecem ao LED | Observar um vermelho | Carros param na linha da faixa e seguem no verde |
| 3 | Passagem gravada | Carro cruza o sensor | Balão "CARRO n", apito, linha nova em Passagens recentes e no banco; buzzer do Wokwi apita 1 vez |
| 4 | Infração | Esperar um carro furar o vermelho (1 a cada 4) | "MULTA! CARRO n", 3 apitos graves, card Infrações +1, `sinal = VERMELHO` no banco, 3 bips no Wokwi |
| 5 | Botão de pedestre | Clicar no botão do poste com o sinal verde | Verde termina em até 3 s, vermelho de 10 s, botão pisca; o pedestre pode atravessar |
| 6 | Sensor do Wokwi | HC-SR04 abaixo de 50 cm no simulador | Passagem com placa `WOKWI` no banco |
| 7 | ESP32 cai | Parar a simulação do Wokwi | Após 8 s, alerta "Dados atrasados"; após ~25 s, alerta "ESP32 sem comunicação" |
| 8 | Node-RED cai | Parar o Node-RED | Alerta "Sem conexão com o Node-RED"; ao religar, os dados voltam sozinhos |

---

## 8. Estrutura de arquivos

```
frontend/
├── arte/                            ← artes originais em alta resolução (fora do build)
├── index.html
├── package.json
├── .env.development                 ← fonte de dados padrão (Node-RED local)
├── src/
│   ├── main.tsx                     ← entrada React + fontes pixel art
│   ├── index.css                    ← tokens de cor e fontes (identidade visual)
│   ├── types/traffic.ts             ← contrato (telemetria, passagem)
│   ├── services/telemetry/
│   │   ├── config.ts                ← tópicos MQTT, pinos do Wokwi, URLs
│   │   ├── parseTelemetry.ts        ← validação das mensagens do Node-RED
│   │   ├── websocketSource.ts       ← WebSocket com reconexão e envio de comandos
│   │   ├── historyApi.ts            ← passagens já gravadas (API do Node-RED)
│   │   ├── nodeRedRules.ts          ← funções do Node-RED para a simulação
│   │   ├── simulatedWokwiSource.ts  ← ESP32 simulado
│   │   └── index.ts                 ← escolhe a fonte conforme a config
│   ├── hooks/
│   │   ├── useTrafficTelemetry.ts   ← estado do semáforo, passagens e comandos
│   │   ├── usePedestrianControl.ts  ← pedestre da calçada, controlado no teclado
│   │   └── useBeep.ts               ← apito do sensor (Web Audio)
│   ├── components/
│   │   ├── dashboard/               ← painel (cards, widgets, CSS)
│   │   └── game/
│   │       ├── GameScene.tsx        ← cena: fundo, semáforo, botão, sensor, carros, pedestre
│   │       ├── BackgroundTrafficLight.tsx ← luzes do semáforo da imagem
│   │       ├── sceneLayout.ts       ← posições medidas na imagem de fundo
│   │       └── traffic/             ← sistema dos carros (geometria, rotas, placas, sensor)
│   └── assets/game/                 ← imagens (ver assets/game/README.md)
└── README.md
```

---

## 9. Identidade visual

- **Fontes:** Silkscreen nos títulos, etiquetas, placas e números (estilo 8-bit, com acentos) e Pixelify Sans no texto corrido.
- **Painéis:** azul-asfalto `#161a32` com borda dura de 4 px `#0b0d1a`, realce interno `#333b72` e sombra deslocada sem blur.
  Nada de cantos arredondados nem desfoque.
- **Cores:** vermelho `#ff4d5e`, amarelo `#ffc23d` e verde `#3ee87a` são as cores do sinal e também de infração, atenção e ok.
  Ciano `#55d6ff` para dados do circuito e violeta `#b48cff` para o modo pedestre. Texto creme `#f6f0d8` e apoio `#9ea6d6`.
- **Sprites:** sempre com `image-rendering: pixelated` (classe `.pixel-art`). Artes originais em `arte/`.

Os tokens ficam em [`src/index.css`](src/index.css). Para mudar a identidade, edite as variáveis `--px-*`.
