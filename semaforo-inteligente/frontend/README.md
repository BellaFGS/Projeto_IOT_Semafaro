# 🚦 Semáforo.IoT — Dashboard gamificado

Front-end do projeto **Semáforo Inteligente** (FATEC Sorocaba · Mobilidade urbana).
É um mini dashboard em pixel art, **somente leitura**, sobre um cenário 2D com rua, faixa de pedestres,
pórtico com semáforo e um personagem. Tudo o que aparece na tela vem do fluxo de dados do projeto:

```
HC-SR04 + botão ──► ESP32 (Wokwi/PlatformIO) ──► MQTT (broker) ──► Node-RED ──► WebSocket ──► Dashboard
      LEDs ◄──────────────── comando (tempo de verde) ◄──────────────┘
```

Enquanto o circuito real do Wokwi não está pronto, o front roda uma **simulação fictícia do ESP32**
que publica exatamente os mesmos tópicos e JSON do firmware e passa pelas mesmas regras do Node-RED.
Para ligar nos dados reais, basta trocar a fonte para `websocket` (sem mudar código).

---

## Sumário

1. [O que o dashboard mostra](#1-o-que-o-dashboard-mostra)
2. [Como executar](#2-como-executar)
3. [Fonte de dados: simulação × Node-RED](#3-fonte-de-dados-simulação--node-red)
4. [Simulação do Wokwi (3 componentes)](#4-simulação-do-wokwi-3-componentes)
5. [Contrato de dados (JSON do Node-RED → dashboard)](#5-contrato-de-dados-json-do-node-red--dashboard)
6. [Guia do back-end](#6-guia-do-back-end)
   - [6.1 Circuito no Wokwi](#61-circuito-no-wokwi)
   - [6.2 Firmware do ESP32 (PlatformIO)](#62-firmware-do-esp32-platformio)
   - [6.3 Tópicos MQTT](#63-tópicos-mqtt)
   - [6.4 Fluxo do Node-RED](#64-fluxo-do-node-red)
   - [6.5 Regras e alertas](#65-regras-e-alertas)
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
| Histórico | Card **HISTÓRICO** com as últimas trocas de sinal e alertas, com horário |
| Controle dos atuadores | Automático: o Node-RED muda o tempo de verde do ESP32 conforme o fluxo. O dashboard não tem botões |

Na barra superior, o **pipeline** `SENSOR ▸ ESP32 ▸ MQTT ▸ NODE-RED ▸ DASHBOARD` acende conforme os dados chegam
(amarelo na simulação, verde com dados reais), e o selo à direita mostra a fonte:
`SIMULAÇÃO WOKWI`, `AO VIVO`, `CONECTANDO`, `SEM DADOS` (mais de 5 s sem mensagem) ou `NODE-RED OFFLINE`.

No cenário, o semáforo do pórtico acende a lâmpada recebida na telemetria, o visor mostra o tempo restante
e o botão de pedestre na calçada pisca quando há pedido de travessia. O único controle do usuário é mover o
personagem (`←` `→` ou `A` / `D`). O botão **OCULTAR/PAINEL** só esconde o painel.

---

## 2. Como executar

Pré-requisitos: Node.js 18+ e npm.

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

## 3. Fonte de dados: simulação × Node-RED

A fonte é escolhida em [`src/services/telemetry/config.ts`](src/services/telemetry/config.ts).

**Pelo `.env`** (crie `frontend/.env.local`):

```bash
# simulation (padrão) ou websocket
VITE_DATA_SOURCE=websocket
# endpoint do nó "websocket out" do Node-RED
VITE_NODE_RED_WS_URL=ws://localhost:1880/ws/semaforo
```

**Pela URL**, sem reiniciar (prático na apresentação):

| URL | Fonte |
|---|---|
| `http://localhost:5173/` | Simulação do Wokwi (padrão) |
| `http://localhost:5173/?fonte=ws` | Node-RED em `ws://localhost:1880/ws/semaforo` |
| `http://localhost:5173/?fonte=ws&ws=ws://192.168.0.10:1880/ws/semaforo` | Node-RED em outra máquina |

No modo WebSocket o front reconecta sozinho se o Node-RED cair (espera de 1 s, dobrando até 10 s).
Mensagens fora do contrato são ignoradas e aparecem como aviso no console do navegador.

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

[`nodeRedRules.ts`](src/services/telemetry/nodeRedRules.ts) é a mesma lógica do nó function da [seção 6.4](#64-fluxo-do-node-red).
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
| `flow.vehicleCount` | inteiro | Total de carros desde que o Node-RED iniciou |
| `flow.vehiclesPerMin` | número | Carros no último minuto |
| `actuators.led*` | booleano | Estado dos LEDs. Se faltar, o front deduz pelo `light.state` |
| `device.online` / `wifiRssi` / `uptimeS` | booleano / dBm / s | Status do ESP32 |
| `alerts[]` | `{ level: info\|warning\|critical, code, message }` | Alertas ativos agora |

A validação fica em [`parseTelemetry.ts`](src/services/telemetry/parseTelemetry.ts): números podem vir como string,
campos opcionais ausentes recebem padrão e uma mensagem sem `light.state` válido é descartada.

---

## 6. Guia do back-end

### 6.1 Circuito no Wokwi

Componentes: ESP32 DevKit C v4, HC-SR04, 3 LEDs (vermelho, amarelo, verde) com resistores de 220 Ω e um pushbutton.

| Componente | Pino do componente | ESP32 |
|---|---|---|
| LED vermelho | A (via 220 Ω) / C | GPIO 25 / GND |
| LED amarelo | A (via 220 Ω) / C | GPIO 26 / GND |
| LED verde | A (via 220 Ω) / C | GPIO 27 / GND |
| Botão de pedestre | 1.l / 2.l | GPIO 14 / GND (usa `INPUT_PULLUP`, pressionado = `LOW`) |
| HC-SR04 | VCC / GND / TRIG / ECHO | 5V / GND / GPIO 5 / GPIO 18 |

`diagram.json` sugerido (em `semaforo-inteligente/`). No ESP32 DevKit C v4 os pinos se chamam `esp:25`, `esp:GND.1`
etc. O `diagram.json` atual usa `esp:D5`/`esp:D18`, que são nomes da placa DevKit **V1**; confira ao montar.

```json
{
  "version": 1,
  "author": "Grupo Semáforo Inteligente",
  "editor": "wokwi",
  "parts": [
    { "type": "board-esp32-devkit-c-v4", "id": "esp", "top": 0, "left": 0, "attrs": {} },
    { "type": "wokwi-hc-sr04", "id": "sonar", "top": -120, "left": 220, "attrs": { "distance": "320" } },
    { "type": "wokwi-led", "id": "ledR", "top": -40, "left": -160, "attrs": { "color": "red" } },
    { "type": "wokwi-led", "id": "ledY", "top": -40, "left": -120, "attrs": { "color": "yellow" } },
    { "type": "wokwi-led", "id": "ledG", "top": -40, "left": -80, "attrs": { "color": "green" } },
    { "type": "wokwi-resistor", "id": "rR", "top": 60, "left": -170, "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "rY", "top": 60, "left": -130, "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-resistor", "id": "rG", "top": 60, "left": -90, "rotate": 90, "attrs": { "value": "220" } },
    { "type": "wokwi-pushbutton", "id": "btn", "top": 160, "left": -160, "attrs": { "color": "blue", "label": "PEDESTRE" } }
  ],
  "connections": [
    [ "esp:TX", "$serialMonitor:RX", "", [] ],
    [ "esp:RX", "$serialMonitor:TX", "", [] ],
    [ "ledR:A", "rR:1", "red", [] ],    [ "rR:2", "esp:25", "red", [] ],    [ "ledR:C", "esp:GND.1", "black", [] ],
    [ "ledY:A", "rY:1", "gold", [] ],   [ "rY:2", "esp:26", "gold", [] ],   [ "ledY:C", "esp:GND.1", "black", [] ],
    [ "ledG:A", "rG:1", "green", [] ],  [ "rG:2", "esp:27", "green", [] ],  [ "ledG:C", "esp:GND.1", "black", [] ],
    [ "btn:1.l", "esp:14", "blue", [] ], [ "btn:2.l", "esp:GND.2", "black", [] ],
    [ "sonar:VCC", "esp:5V", "red", [] ],
    [ "sonar:GND", "esp:GND.3", "black", [] ],
    [ "sonar:TRIG", "esp:5", "orange", [] ],
    [ "sonar:ECHO", "esp:18", "purple", [] ]
  ],
  "dependencies": {}
}
```

Para testar no Wokwi: clique no HC-SR04 e arraste a distância abaixo de 50 cm para "passar um carro".
Clique no botão durante o verde para pedir a travessia.

### 6.2 Firmware do ESP32 (PlatformIO)

`platformio.ini`: adicione o ArduinoJson.

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps =
    knolleary/PubSubClient
    bblanchon/ArduinoJson@^7
```

`src/main.cpp`. O ciclo do semáforo roda **no ESP32**, assim o sinal continua funcionando se a rede cair. O Node-RED só
ajusta o tempo de verde.

```cpp
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ---------- Rede ----------
const char* WIFI_SSID = "Wokwi-GUEST";      // rede do simulador Wokwi
const char* WIFI_PASS = "";
const char* MQTT_HOST = "broker.hivemq.com"; // broker público (ou o IP do seu Mosquitto)
const uint16_t MQTT_PORT = 1883;
const char* DEVICE_ID = "esp32-semaforo-01";

// ---------- Tópicos (iguais a src/services/telemetry/config.ts) ----------
#define TOPIC_BASE "fatec/semaforo/01"
const char* T_ULTRA  = TOPIC_BASE "/sensor/ultrassonico";
const char* T_BUTTON = TOPIC_BASE "/sensor/botao";
const char* T_STATE  = TOPIC_BASE "/estado";
const char* T_STATUS = TOPIC_BASE "/status";
const char* T_CMD_GREEN = TOPIC_BASE "/cmd/tempo_verde";

// ---------- Pinos (iguais ao diagram.json) ----------
const int PIN_RED = 25, PIN_YELLOW = 26, PIN_GREEN = 27;
const int PIN_BUTTON = 14;
const int PIN_TRIG = 5, PIN_ECHO = 18;

// ---------- Tempos ----------
const int YELLOW_S = 3, RED_S = 8, RED_WITH_PEDESTRIAN_S = 10, PEDESTRIAN_CUT_S = 3;

enum Light { GREEN, YELLOW, RED };
Light light = GREEN;
int greenDurationS = 12;
int durationS = 12;
int remainingS = 12;
bool pedestrianRequest = false;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
unsigned long lastSensorMs = 0, lastSecondMs = 0, lastStatusMs = 0, lastButtonMs = 0;
bool lastButtonLevel = HIGH;

const char* lightName(Light l) {
  return l == GREEN ? "GREEN" : l == YELLOW ? "YELLOW" : "RED";
}

void applyLeds() {
  digitalWrite(PIN_RED, light == RED);
  digitalWrite(PIN_YELLOW, light == YELLOW);
  digitalWrite(PIN_GREEN, light == GREEN);
}

void publishJson(const char* topic, JsonDocument& doc, bool retain = false) {
  char buf[256];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topic, (const uint8_t*)buf, n, retain);
}

float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000); // timeout ~5 m
  return us == 0 ? 400.0 : us * 0.0343 / 2.0;
}

void publishStatus() {
  JsonDocument doc;
  doc["online"] = true;
  doc["wifiRssi"] = WiFi.RSSI();
  doc["uptimeS"] = millis() / 1000;
  publishJson(T_STATUS, doc, true);
}

void publishState() {
  JsonDocument doc;
  doc["light"] = lightName(light);
  doc["remainingS"] = remainingS;
  doc["durationS"] = durationS;
  doc["pedestrianRequest"] = pedestrianRequest;
  publishJson(T_STATE, doc);
}

void nextLight() {
  if (light == GREEN) {
    light = YELLOW;
    durationS = YELLOW_S;
  } else if (light == YELLOW) {
    light = RED;
    durationS = pedestrianRequest ? RED_WITH_PEDESTRIAN_S : RED_S;
    pedestrianRequest = false; // a travessia acontece neste vermelho
  } else {
    light = GREEN;
    durationS = greenDurationS;
  }
  remainingS = durationS;
  applyLeds();
  Serial.printf("[SINAL] %s por %ds\n", lightName(light), durationS);
}

// Comando do Node-RED: {"durationS": 16}
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, T_CMD_GREEN) != 0) return;
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  int s = doc["durationS"] | 0;
  if (s >= 5 && s <= 60) {
    greenDurationS = s;
    Serial.printf("[CMD] tempo de verde = %ds\n", s);
  }
}

void connectWifi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WIFI] conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\n[WIFI] ok, IP %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] conectando... ");
    // Last Will: se o ESP32 cair, o broker publica {"online":false} no status
    if (mqtt.connect(DEVICE_ID, nullptr, nullptr, T_STATUS, 0, true, "{\"online\":false}")) {
      Serial.println("ok");
      mqtt.subscribe(T_CMD_GREEN);
      publishStatus();
    } else {
      Serial.printf("falhou (%d), nova tentativa em 2s\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  applyLeds(); // o semáforo funciona mesmo antes da rede

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();
  unsigned long now = millis();

  // Botão de pedestre (borda de descida, debounce de 50 ms)
  bool level = digitalRead(PIN_BUTTON);
  if (level == LOW && lastButtonLevel == HIGH && now - lastButtonMs > 50) {
    lastButtonMs = now;
    if (!pedestrianRequest && light != RED) {
      pedestrianRequest = true;
      if (light == GREEN && remainingS > PEDESTRIAN_CUT_S) remainingS = PEDESTRIAN_CUT_S;
      JsonDocument doc;
      doc["pressed"] = true;
      publishJson(T_BUTTON, doc);
      Serial.println("[BOTAO] pedestre pediu travessia");
    }
  }
  lastButtonLevel = level;

  // HC-SR04 a cada 500 ms
  if (now - lastSensorMs >= 500) {
    lastSensorMs = now;
    JsonDocument doc;
    doc["distanceCm"] = round(readDistanceCm() * 10) / 10.0;
    publishJson(T_ULTRA, doc);
  }

  // Relógio do semáforo a cada 1 s
  if (now - lastSecondMs >= 1000) {
    lastSecondMs = now;
    if (--remainingS <= 0) nextLight();
    publishState();
  }

  // Status a cada 10 s
  if (now - lastStatusMs >= 10000) {
    lastStatusMs = now;
    publishStatus();
  }
}
```

O que o Monitor Serial deve mostrar (evidência da Etapa 4): `[WIFI] ok`, `[MQTT] conectando... ok`,
`[SINAL] GREEN por 12s`, `[BOTAO] pedestre pediu travessia`, `[CMD] tempo de verde = 16s`.

> ⚠️ No broker público, qualquer pessoa pode publicar no mesmo tópico. Troque `fatec/semaforo/01` por algo único
> do grupo (ex.: `fatec/semaforo/grupo3`) **no firmware, no Node-RED e em `config.ts`**.

### 6.3 Tópicos MQTT

| Função | Tópico | Quem publica | Mensagem de exemplo | Frequência |
|---|---|---|---|---|
| Distância do HC-SR04 | `fatec/semaforo/01/sensor/ultrassonico` | ESP32 | `{"distanceCm": 27.4}` | 500 ms |
| Botão de pedestre | `fatec/semaforo/01/sensor/botao` | ESP32 | `{"pressed": true}` | ao apertar |
| Estado do semáforo | `fatec/semaforo/01/estado` | ESP32 | `{"light":"GREEN","remainingS":9,"durationS":12,"pedestrianRequest":false}` | 1 s |
| Status do ESP32 | `fatec/semaforo/01/status` | ESP32 (retido + Last Will) | `{"online":true,"wifiRssi":-58,"uptimeS":1234}` | 10 s e ao conectar |
| Tempo de verde | `fatec/semaforo/01/cmd/tempo_verde` | Node-RED | `{"durationS": 16}` | quando o modo muda |

Para conferir as mensagens: MQTT Explorer ou `mosquitto_sub -h broker.hivemq.com -t "fatec/semaforo/01/#" -v`.

### 6.4 Fluxo do Node-RED

```
[mqtt in: fatec/semaforo/01/#] ──► [function: Regras do semáforo] ──saída 1──► [websocket out: /ws/semaforo] ──► dashboard
                                                                  └─saída 2──► [mqtt out] ──► ESP32 (cmd/tempo_verde)
                                                                  └─(debug)
```

1. **mqtt in**: servidor `broker.hivemq.com:1883` (o mesmo do firmware), tópico `fatec/semaforo/01/#`, QoS 0,
   saída **"um objeto JSON analisado"**.
2. **function "Regras do semáforo"**: em *Configuração*, **Saídas = 2**. Cole o código abaixo na aba *Ao receber mensagem*.
3. **websocket out**: tipo **Listen on**, caminho `/ws/semaforo`. O dashboard conecta em `ws://<ip-do-node-red>:1880/ws/semaforo`.
4. **mqtt out**: mesmo servidor e tópico em branco (o tópico vem em `msg.topic`).
5. Um nó **debug** na saída 1 ajuda a tirar o print das mensagens (evidência da Etapa 6).

Código do nó function (mesma lógica de [`nodeRedRules.ts`](src/services/telemetry/nodeRedRules.ts)):

```js
// Regras do semáforo — saída 1: dashboard (websocket out) · saída 2: comando ao ESP32 (mqtt out)
const BASE = 'fatec/semaforo/01';
const T = {
  ultrasonic: `${BASE}/sensor/ultrassonico`,
  button: `${BASE}/sensor/botao`,
  state: `${BASE}/estado`,
  status: `${BASE}/status`,
  greenCmd: `${BASE}/cmd/tempo_verde`,
};
const DETECTION_CM = 50;       // abaixo disso há carro na faixa
const TOO_CLOSE_CM = 20;       // carro avançando sobre a faixa
const HEAVY_FLOW_PER_MIN = 8;  // fluxo intenso
const GREEN_NORMAL_S = 12;
const GREEN_EXTENDED_S = 16;
const WEAK_SIGNAL_DBM = -80;

const mem = context.get('mem') || {
  distanceCm: 400, vehicleDetected: false, vehicleCount: 0, detections: [],
  light: 'RED', remainingS: 0, durationS: 0, pedestrianRequest: false,
  online: false, wifiRssi: -100, uptimeS: 0, greenCmdS: GREEN_NORMAL_S, hasState: false,
};
const now = Date.now();
const p = (typeof msg.payload === 'object' && msg.payload) || {};

switch (msg.topic) {
  case T.ultrasonic: {
    mem.distanceCm = Number(p.distanceCm ?? mem.distanceCm);
    const detected = mem.distanceCm < DETECTION_CM;
    if (detected && !mem.vehicleDetected) {   // borda de subida = carro novo
      mem.vehicleCount += 1;
      mem.detections.push(now);
    }
    mem.vehicleDetected = detected;
    break;
  }
  case T.button:
    if (p.pressed) mem.pedestrianRequest = true;
    break;
  case T.state:
    mem.light = p.light ?? mem.light;
    mem.remainingS = Number(p.remainingS ?? mem.remainingS);
    mem.durationS = Number(p.durationS ?? mem.durationS);
    mem.pedestrianRequest = Boolean(p.pedestrianRequest);
    mem.online = true;
    mem.hasState = true;
    break;
  case T.status:
    mem.online = Boolean(p.online);
    if (p.wifiRssi !== undefined) mem.wifiRssi = Number(p.wifiRssi);
    if (p.uptimeS !== undefined) mem.uptimeS = Number(p.uptimeS);
    break;
  default:
    return null; // ignora o próprio comando e outros tópicos
}

mem.detections = mem.detections.filter(t => now - t < 60000);
const vehiclesPerMin = mem.detections.length;

let mode = 'AUTOMATICO';
if (!mem.online) mode = 'ATENCAO';
else if (mem.pedestrianRequest) mode = 'PEDESTRE';
else if (vehiclesPerMin >= HEAVY_FLOW_PER_MIN) mode = 'FLUXO_INTENSO';

const alerts = [];
if (!mem.online) alerts.push({ level: 'critical', code: 'DISPOSITIVO_OFFLINE', message: 'ESP32 sem comunicação com o broker MQTT' });
if (mem.distanceCm < TOO_CLOSE_CM) alerts.push({ level: 'warning', code: 'VEICULO_PROXIMO', message: `Veículo sobre a faixa (${mem.distanceCm.toFixed(0)} cm)` });
if (mode === 'FLUXO_INTENSO') alerts.push({ level: 'warning', code: 'FLUXO_INTENSO', message: `Fluxo intenso: verde estendido para ${GREEN_EXTENDED_S}s` });
if (mem.pedestrianRequest) alerts.push({ level: 'info', code: 'PEDESTRE_AGUARDANDO', message: 'Pedestre aguardando travessia' });
if (mem.online && mem.wifiRssi < WEAK_SIGNAL_DBM) alerts.push({ level: 'warning', code: 'SINAL_FRACO', message: `Wi-Fi fraco no ESP32 (${mem.wifiRssi} dBm)` });

// Automação: ajusta o tempo de verde conforme o fluxo
let command = null;
const wantedGreen = mode === 'FLUXO_INTENSO' ? GREEN_EXTENDED_S : GREEN_NORMAL_S;
if (mem.online && wantedGreen !== mem.greenCmdS) {
  mem.greenCmdS = wantedGreen;
  command = { topic: T.greenCmd, payload: { durationS: wantedGreen } };
}

context.set('mem', mem);
if (!mem.hasState) return [null, command]; // ainda não sabemos o estado do sinal

const telemetry = {
  type: 'telemetry',
  deviceId: 'esp32-semaforo-01',
  timestamp: new Date(now).toISOString(),
  light: { state: mem.light, remainingS: mem.remainingS, durationS: mem.durationS },
  mode,
  sensors: {
    ultrasonicCm: Math.round(mem.distanceCm * 10) / 10,
    vehicleDetected: mem.vehicleDetected,
    pedestrianRequest: mem.pedestrianRequest,
  },
  flow: { vehicleCount: mem.vehicleCount, vehiclesPerMin },
  actuators: { ledRed: mem.light === 'RED', ledYellow: mem.light === 'YELLOW', ledGreen: mem.light === 'GREEN' },
  device: { online: mem.online, wifiRssi: mem.wifiRssi, uptimeS: mem.uptimeS },
  alerts,
};
return [{ payload: telemetry }, command];
```

**Broker local (opcional):** com o Mosquitto instalado, use `mosquitto -v` e troque `MQTT_HOST` pelo IP da máquina.
O Wokwi online não alcança `localhost`; nesse caso use o broker público ou o Wokwi no VS Code com o gateway privado.

**Histórico em banco (opcional, Grafana/InfluxDB):** ligue um nó `influxdb out` na saída 1 gravando
`ultrasonicCm`, `vehiclesPerMin` e `light.state`.

### 6.5 Regras e alertas

| Regra | Condição | Efeito |
|---|---|---|
| Contagem de carros | Distância cruza para < 50 cm | `vehicleCount + 1` e entra na janela de 1 min |
| Fluxo intenso | ≥ 8 carros no último minuto | Modo `FLUXO_INTENSO`, alerta e comando `durationS: 16` ao ESP32 (volta a 12 quando normaliza) |
| Prioridade do pedestre | Botão apertado no verde ou no amarelo | ESP32 corta o verde para 3 s e o vermelho seguinte dura 10 s. Modo `PEDESTRE` e alerta informativo |
| Carro sobre a faixa | Distância < 20 cm | Alerta `VEICULO_PROXIMO` |
| ESP32 offline | Last Will `{"online":false}` | Modo `ATENCAO`, alerta crítico e status OFF no dashboard |
| Wi-Fi fraco | RSSI < −80 dBm | Alerta `SINAL_FRACO` |
| Node-RED fora do ar | WebSocket fechado | Dashboard mostra `NODE-RED OFFLINE` e reconecta sozinho |

---

## 7. Testes de integração (Etapa 8)

| # | Teste | Como provocar | Resultado esperado no dashboard |
|---|---|---|---|
| 1 | Fluxo completo | Wokwi rodando, Node-RED ativo, abrir `?fonte=ws` | Selo `AO VIVO`, pipeline verde, sinal do pórtico igual aos LEDs do Wokwi |
| 2 | Contagem | Arrastar o HC-SR04 abaixo de 50 cm e voltar | Total de carros +1 e "Carro na faixa" enquanto estiver perto |
| 3 | Fluxo intenso | Passar 8 carros em menos de 1 min | Modo `FLUXO INTENSO`, alerta, verde seguinte com 16 s |
| 4 | Pedestre | Apertar o botão no verde | Contagem cai para 3 s, botão da calçada pisca, vermelho com 10 s |
| 5 | Carro na faixa | Distância < 20 cm | Alerta "Veículo sobre a faixa" |
| 6 | ESP32 cai | Parar a simulação do Wokwi | Após 5 s: selo `SEM DADOS`. Após ~25 s (Last Will do broker): circuito `OFF`, alerta crítico, modo `ATENÇÃO` |
| 7 | Node-RED cai | Parar o Node-RED | `NODE-RED OFFLINE`; ao religar, volta sozinho |

---

## 8. Estrutura de arquivos

```
frontend/
├── index.html
├── package.json
├── src/
│   ├── main.tsx                      ← entrada React + fontes pixel art
│   ├── index.css                     ← tokens de cor e fontes (identidade visual)
│   ├── types/traffic.ts              ← contrato TrafficTelemetry
│   ├── services/telemetry/
│   │   ├── config.ts                 ← tópicos MQTT, pinos do Wokwi, fonte de dados e URL do WebSocket
│   │   ├── parseTelemetry.ts         ← validação das mensagens do Node-RED
│   │   ├── websocketSource.ts        ← cliente WebSocket com reconexão
│   │   ├── nodeRedRules.ts           ← regras do Node-RED (referência da seção 6.4)
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
│   │       └── TrafficLight.tsx      ← pórtico com LEDs em PNG sobre as lâmpadas
│   └── assets/game/                  ← sprites (personagem, rua, semáforo, LEDs)
└── README.md
```

---

## 9. Identidade visual

- **Fontes:** Silkscreen nos títulos, selos e números (estilo 8-bit, com acentos) e Pixelify Sans no texto corrido.
- **Painéis:** azul-asfalto `#161a32` com borda dura de 4 px `#0b0d1a`, realce interno `#333b72` e sombra deslocada sem blur.
  Nada de cantos arredondados nem desfoque.
- **Cores:** vermelho `#ff4d5e`, amarelo `#ffc23d` e verde `#3ee87a` são as cores do sinal e também de erro, atenção e ok.
  Ciano `#55d6ff` é para dados de sensor e violeta `#b48cff` para o modo pedestre. Texto creme `#f6f0d8` e apoio `#9ea6d6`.
- **Sprites:** sempre com `image-rendering: pixelated` (classe `.pixel-art`). Os LEDs acesos são os PNGs `red/yellow/green.png`
  sobre as lâmpadas apagadas do `semaforo.png`.

Os tokens ficam em [`src/index.css`](src/index.css). Para mudar a identidade, edite as variáveis `--px-*`.
