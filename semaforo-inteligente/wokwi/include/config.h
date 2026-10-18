#pragma once

// ---------- Rede ----------
// "Wokwi-GUEST" é a rede Wi-Fi do simulador Wokwi.
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASS ""

// Broker MQTT (Aedes, dentro do Node-RED, porta 1883).
// "host.wokwi.internal" é o seu computador visto de dentro do Wokwi para VS Code
// (gateway privado embutido na extensão). Se não conectar, use um broker público,
// por exemplo "broker.hivemq.com", e aponte o Node-RED para o mesmo broker.
#define MQTT_HOST "host.wokwi.internal"
#define MQTT_PORT 1883
#define DEVICE_ID "esp32-semaforo-01"

// ---------- Tópicos (iguais a frontend/src/services/telemetry/config.ts) ----------
#define TOPIC_BASE "fatec/semaforo/01"
#define TOPIC_ULTRASONIC TOPIC_BASE "/sensor/ultrassonico"
#define TOPIC_BUTTON TOPIC_BASE "/sensor/botao"
#define TOPIC_STATE TOPIC_BASE "/estado"
#define TOPIC_STATUS TOPIC_BASE "/status"
#define TOPIC_CMD_GREEN TOPIC_BASE "/cmd/tempo_verde"

// ---------- Pinos (iguais ao diagram.json) ----------
#define PIN_LED_RED 25
#define PIN_LED_YELLOW 26
#define PIN_LED_GREEN 27
#define PIN_BUTTON 14
#define PIN_TRIG 5
#define PIN_ECHO 18

// ---------- Tempos do semáforo (segundos) ----------
#define GREEN_DEFAULT_S 12
#define YELLOW_S 3
#define RED_S 8
#define RED_WITH_PEDESTRIAN_S 10
#define PEDESTRIAN_CUT_S 3

// ---------- Sensor ----------
// Abaixo desta distância há carro na faixa (só para o log serial; quem conta é o Node-RED).
#define DETECTION_CM 50

// ---------- Intervalos de publicação (ms) ----------
#define SENSOR_INTERVAL_MS 500
#define STATUS_INTERVAL_MS 10000
