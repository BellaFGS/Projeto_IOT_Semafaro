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
// Semáforo (ESP32 → Node-RED → dashboard)
#define TOPIC_STATE TOPIC_BASE "/estado"
#define TOPIC_STATUS TOPIC_BASE "/status"
#define TOPIC_BUTTON TOPIC_BASE "/sensor/botao"
// Carro detectado pelo HC-SR04 do Wokwi (slider do sensor)
#define TOPIC_VEHICLE TOPIC_BASE "/sensor/veiculo"
// Comandos (dashboard → Node-RED → ESP32)
#define TOPIC_CMD_BUTTON TOPIC_BASE "/cmd/botao_virtual"
#define TOPIC_CMD_PASSAGE TOPIC_BASE "/cmd/passagem"

// ---------- Pinos (iguais ao diagram.json) ----------
#define PIN_LED_RED 25
#define PIN_LED_YELLOW 26
#define PIN_LED_GREEN 27
// Semáforo de pedestre: inverso dos carros, só local (não vai ao MQTT)
#define PIN_PED_RED 32
#define PIN_PED_GREEN 33
#define PIN_BUTTON 14
#define PIN_TRIG 5
#define PIN_ECHO 18
#define PIN_BUZZER 13

// ---------- Tempo de cada LED (segundos) ----------
#define GREEN_S 12
#define YELLOW_S 3
#define RED_S 8
// Vermelho mais longo quando um pedestre pediu travessia
#define RED_WITH_PEDESTRIAN_S 10
// Ao apertar o botão no verde, o verde termina em no máximo 3 s
#define PEDESTRIAN_CUT_S 3

// ---------- Sensor ----------
// Abaixo desta distância o HC-SR04 do Wokwi considera que há um carro.
#define DETECTION_CM 50

// ---------- Buzzer ----------
#define BUZZER_FREQ_HZ 1760
#define BUZZER_BEEP_MS 90

// ---------- Intervalos (ms) ----------
#define SENSOR_INTERVAL_MS 300
#define STATUS_INTERVAL_MS 10000
