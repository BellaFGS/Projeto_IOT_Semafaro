/*
 * Semáforo Inteligente — firmware do ESP32 (Wokwi + PlatformIO)
 *
 * Componentes:
 *   - LEDs vermelho/amarelo/verde (GPIO 25/26/27): o ciclo do semáforo roda aqui,
 *     então o sinal continua funcionando mesmo sem rede.
 *   - Botão de pedestre (GPIO 14): durante o verde/amarelo, corta o verde para 3 s
 *     e o vermelho seguinte dura 10 s para a travessia.
 *   - HC-SR04 (TRIG 5 / ECHO 18): mede a distância do carro na faixa. No Wokwi,
 *     clique no sensor e arraste a distância abaixo de 50 cm para "passar um carro".
 *
 * Publica tudo em MQTT; o Node-RED conta os carros, aplica as regras e pode
 * mudar o tempo de verde pelo tópico cmd/tempo_verde.
 */
#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

enum Light { GREEN, YELLOW, RED };

Light light = GREEN;
int greenDurationS = GREEN_DEFAULT_S;
int durationS = GREEN_DEFAULT_S;
int remainingS = GREEN_DEFAULT_S;
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
    durationS = greenDurationS;
  }
  remainingS = durationS;
  applyLeds();
  Serial.printf("[SINAL] %s por %ds\n", lightName(light), durationS);
}

// Comando do Node-RED: {"durationS": 16}
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  if (strcmp(topic, TOPIC_CMD_GREEN) != 0) return;
  JsonDocument doc;
  if (deserializeJson(doc, payload, length)) return;
  int s = doc["durationS"] | 0;
  if (s >= 5 && s <= 60) {
    greenDurationS = s;
    Serial.printf("[CMD] tempo de verde = %ds (vale no próximo verde)\n", s);
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
    mqtt.subscribe(TOPIC_CMD_GREEN);
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
    if (!pedestrianRequest && light != RED) {
      pedestrianRequest = true;
      if (light == GREEN && remainingS > PEDESTRIAN_CUT_S) remainingS = PEDESTRIAN_CUT_S;
      JsonDocument doc;
      doc["pressed"] = true;
      publishJson(TOPIC_BUTTON, doc);
      publishState();
      Serial.println("[BOTAO] pedestre pediu travessia");
    }
  }
  lastButtonLevel = level;
}

void handleSensor() {
  float cm = readDistanceCm();
  bool near = cm < DETECTION_CM;
  if (near != carNearby) {
    carNearby = near;
    Serial.printf(near ? "[SENSOR] carro na faixa (%.1f cm)\n" : "[SENSOR] faixa livre (%.1f cm)\n", cm);
  }
  JsonDocument doc;
  doc["distanceCm"] = roundf(cm * 10) / 10.0f;
  publishJson(TOPIC_ULTRASONIC, doc);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  applyLeds();  // o semáforo funciona mesmo antes da rede

  Serial.println("================================");
  Serial.println(" SEMAFORO INTELIGENTE - ESP32");
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
