/*
 * Semáforo Inteligente — firmware do ESP32 (Wokwi + PlatformIO)
 *
 * Sistema 1 — SEMÁFORO (roda aqui, mesmo sem rede):
 *   - LEDs vermelho/amarelo/verde (GPIO 25/26/27) com o tempo de cada cor em config.h.
 *   - Botão de pedestre (GPIO 14) ou clique no botão do poste no dashboard
 *     (cmd/botao_virtual): no verde/amarelo, o verde termina em até 3 s e o
 *     vermelho seguinte dura 10 s para a travessia.
 *   - Publica o estado a cada segundo; o Node-RED repassa ao dashboard, e os
 *     carros do minigame obedecem a essa cor.
 *
 * Sistema 2 — CARROS (identificação):
 *   - Quando um carro do minigame passa pelo sensor, o Node-RED grava a passagem
 *     no banco e avisa aqui (cmd/passagem): o buzzer (GPIO 13) apita uma vez se o
 *     carro passou no verde/amarelo e três vezes se passou no vermelho (infração).
 *   - O HC-SR04 (TRIG 5 / ECHO 18) do Wokwi também registra um carro: arraste a
 *     distância abaixo de 50 cm no simulador.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

enum Light { GREEN, YELLOW, RED };

Light light = GREEN;
int durationS = GREEN_S;
int remainingS = GREEN_S;
bool pedestrianRequest = false;
bool carNearby = false;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

unsigned long lastSensorMs = 0;
unsigned long lastSecondMs = 0;
unsigned long lastStatusMs = 0;
unsigned long lastButtonMs = 0;
bool lastButtonLevel = HIGH;

const char* lightName(Light l) {
  return l == GREEN ? "GREEN" : l == YELLOW ? "YELLOW" : "RED";
}

const char* lightNamePt(const char* en) {
  if (strcmp(en, "GREEN") == 0) return "VERDE";
  if (strcmp(en, "YELLOW") == 0) return "AMARELO";
  return "VERMELHO";
}

void applyLeds() {
  digitalWrite(PIN_LED_RED, light == RED);
  digitalWrite(PIN_LED_YELLOW, light == YELLOW);
  digitalWrite(PIN_LED_GREEN, light == GREEN);
}

void publishJson(const char* topic, JsonDocument& doc, bool retain = false) {
  if (!mqtt.connected()) return;
  char buf[256];
  size_t n = serializeJson(doc, buf, sizeof(buf));
  mqtt.publish(topic, (const uint8_t*)buf, n, retain);
}

void beep(int times) {
  for (int i = 0; i < times; i++) {
    tone(PIN_BUZZER, BUZZER_FREQ_HZ, BUZZER_BEEP_MS);
    if (i < times - 1) delay(BUZZER_BEEP_MS + 70);
  }
}

float readDistanceCm() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 30000);  // timeout ~5 m
  return us == 0 ? 400.0f : us * 0.0343f / 2.0f;
}

void publishStatus() {
  JsonDocument doc;
  doc["online"] = true;
  doc["wifiRssi"] = WiFi.RSSI();
  doc["uptimeS"] = millis() / 1000;
  publishJson(TOPIC_STATUS, doc, true);
}

void publishState() {
  JsonDocument doc;
  doc["light"] = lightName(light);
  doc["remainingS"] = remainingS;
  doc["durationS"] = durationS;
  doc["pedestrianRequest"] = pedestrianRequest;
  JsonObject tempos = doc["tempos"].to<JsonObject>();
  tempos["verde"] = GREEN_S;
  tempos["amarelo"] = YELLOW_S;
  tempos["vermelho"] = RED_S;
  tempos["vermelhoPedestre"] = RED_WITH_PEDESTRIAN_S;
  publishJson(TOPIC_STATE, doc);
}

void nextLight() {
  if (light == GREEN) {
    light = YELLOW;
    durationS = YELLOW_S;
  } else if (light == YELLOW) {
    light = RED;
    durationS = pedestrianRequest ? RED_WITH_PEDESTRIAN_S : RED_S;
    pedestrianRequest = false;  // a travessia acontece neste vermelho
  } else {
    light = GREEN;
    durationS = GREEN_S;
  }
  remainingS = durationS;
  applyLeds();
  Serial.printf("[SINAL] %s por %ds\n", lightName(light), durationS);
}

// Pedido de travessia: botão físico ou clique no botão do poste no dashboard.
void requestPedestrian(const char* origem) {
  if (pedestrianRequest || light == RED) {
    Serial.printf("[BOTAO] %s: ignorado (%s)\n", origem, pedestrianRequest ? "já pedido" : "já está vermelho");
    return;
  }
  pedestrianRequest = true;
  if (light == GREEN && remainingS > PEDESTRIAN_CUT_S) remainingS = PEDESTRIAN_CUT_S;
  JsonDocument doc;
  doc["pressed"] = true;
  publishJson(TOPIC_BUTTON, doc);
  publishState();
  Serial.printf("[BOTAO] %s: pedestre pediu travessia\n", origem);
}

// Comandos do Node-RED.
//   cmd/botao_virtual  {"pressed": true}
//   cmd/passagem       {"placa": "2", "sinal": "RED", "infracao": true}
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;

  if (strcmp(topic, TOPIC_CMD_BUTTON) == 0) {
    requestPedestrian("dashboard");
  } else if (strcmp(topic, TOPIC_CMD_PASSAGE) == 0) {
    const char* placa = doc["placa"] | "?";
    const char* sinal = doc["sinal"] | "?";
    bool infracao = doc["infracao"] | false;
    Serial.printf("[PASSAGEM] carro %s passou no %s%s\n", placa, lightNamePt(sinal), infracao ? " - INFRACAO (multa)" : "");
    beep(infracao ? 3 : 1);
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("[WIFI] conectando");
  WiFi.begin(WIFI_SSID, WIFI_PASS, 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\n[WIFI] ok, IP %s\n", WiFi.localIP().toString().c_str());
}

// Tenta uma vez; o loop() tenta de novo sem travar o semáforo.
bool connectMqtt() {
  Serial.printf("[MQTT] conectando em %s:%d... ", MQTT_HOST, MQTT_PORT);
  // Last Will: se o ESP32 cair, o broker publica {"online":false} no status.
  if (mqtt.connect(DEVICE_ID, nullptr, nullptr, TOPIC_STATUS, 0, true, "{\"online\":false}")) {
    Serial.println("ok");
    mqtt.subscribe(TOPIC_CMD_BUTTON);
    mqtt.subscribe(TOPIC_CMD_PASSAGE);
    publishStatus();
    publishState();
    return true;
  }
  Serial.printf("falhou (estado %d)\n", mqtt.state());
  return false;
}

void handleButton(unsigned long now) {
  bool level = digitalRead(PIN_BUTTON);
  if (level == LOW && lastButtonLevel == HIGH && now - lastButtonMs > 50) {
    lastButtonMs = now;
    requestPedestrian("botão físico");
  }
  lastButtonLevel = level;
}

// HC-SR04 do Wokwi: cada vez que a distância cai abaixo de 50 cm, avisa um carro.
void handleSensor() {
  float cm = readDistanceCm();
  bool near = cm < DETECTION_CM;
  if (near && !carNearby) {
    JsonDocument doc;
    doc["distanceCm"] = roundf(cm * 10) / 10.0f;
    publishJson(TOPIC_VEHICLE, doc);
    Serial.printf("[SENSOR] carro detectado pelo HC-SR04 (%.1f cm)\n", cm);
  }
  carNearby = near;
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  applyLeds();  // o semáforo funciona mesmo antes da rede

  Serial.println("================================");
  Serial.println(" SEMAFORO INTELIGENTE - ESP32");
  Serial.printf(" Verde %ds | Amarelo %ds | Vermelho %ds (%ds com pedestre)\n", GREEN_S, YELLOW_S, RED_S, RED_WITH_PEDESTRIAN_S);
  Serial.println("================================");

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  connectMqtt();
}

void loop() {
  static unsigned long lastMqttTry = 0;
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED) connectWifi();
  if (!mqtt.connected() && now - lastMqttTry > 3000) {
    lastMqttTry = now;
    connectMqtt();
  }
  mqtt.loop();

  handleButton(now);

  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    handleSensor();
  }

  if (now - lastSecondMs >= 1000) {
    lastSecondMs = now;
    if (--remainingS <= 0) nextLight();
    publishState();
  }

  if (now - lastStatusMs >= STATUS_INTERVAL_MS) {
    lastStatusMs = now;
    publishStatus();
  }
}
