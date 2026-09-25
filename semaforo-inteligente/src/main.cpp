#include <Arduino.h>

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("================================");
    Serial.println("ESP32 INICIADO!");
    Serial.println("================================");
}

void loop() {
    Serial.println("Sistema funcionando...");
    delay(1000);
}