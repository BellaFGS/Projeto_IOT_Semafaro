# 🔌 Wokwi + PlatformIO — ESP32 do semáforo

Firmware do ESP32 e circuito simulado no Wokwi (extensão do VS Code / Devin). É uma das duas
pontas do projeto: aqui roda o **semáforo**; a outra ponta é o dashboard, onde andam os carros.

## Componentes

| Componente | Função | Pino ESP32 |
|---|---|---|
| LED vermelho / amarelo / verde (+ 220 Ω) | Semáforo: verde 12 s → amarelo 3 s → vermelho 8 s | GPIO 25 / 26 / 27 |
| LED pedestre vermelho / verde (+ 220 Ω) | Semáforo de pedestre: verde só com os carros no vermelho. Calculado no próprio ESP32, não é publicado no MQTT | GPIO 32 / 33 |
| Botão de pedestre (azul) | Pede travessia: o verde termina em até 3 s e o vermelho seguinte dura 10 s | GPIO 14 (`INPUT_PULLUP`) e GND |
| HC-SR04 (ultrassônico) | Sensor dos carros: arrastar a distância abaixo de 50 cm registra um carro com placa `WOKWI` | TRIG 5 / ECHO 18, VCC 5V, GND |
| Buzzer | Apita a cada carro gravado no banco: 1 bip (verde/amarelo), 3 bips (vermelho = infração) | GPIO 13 e GND |

Os tempos de cada LED ficam em `include/config.h` (`GREEN_S`, `YELLOW_S`, `RED_S`,
`RED_WITH_PEDESTRIAN_S`) e vão junto no estado publicado, para o dashboard mostrar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `diagram.json` | Circuito do Wokwi (ESP32 DevKit C v4, 3 LEDs dos carros, 2 do pedestre, botão, HC-SR04, buzzer) |
| `wokwi.toml` | Aponta o Wokwi para o firmware compilado em `.pio/build/esp32dev/` |
| `platformio.ini` | Projeto PlatformIO (PubSubClient + ArduinoJson) |
| `include/config.h` | Wi-Fi, broker MQTT, tópicos, pinos e tempo de cada LED |
| `src/main.cpp` | Ciclo do semáforo, botão, sensor, buzzer e MQTT |

## Como rodar

1. Suba o Node-RED antes (`node-red`, `npm start`). É nele que está o broker MQTT.
2. Compile o firmware: tarefa **"Firmware: compilar (PlatformIO)"** ou o botão ✓ do PlatformIO.
   **Sempre que o firmware mudar, compile e reinicie a simulação.**
3. Abra `wokwi/diagram.json` e rode **`Wokwi: Start Simulator`** (F1).
4. No Monitor Serial do Wokwi deve aparecer:

```
 Verde 12s | Amarelo 3s | Vermelho 8s (10s com pedestre)
[WIFI] ok, IP 10.13.37.2
[MQTT] conectando em host.wokwi.internal:1883... ok
[SINAL] YELLOW por 3s
[PASSAGEM] carro 2 passou no VERMELHO - INFRACAO (multa)
```

### O que observar

| Ação | O que acontece |
|---|---|
| Nada (só deixar rodando) | Os LEDs do Wokwi e o semáforo do dashboard trocam juntos; os carros do dashboard param no vermelho |
| Carro do dashboard cruza o sensor | O Node-RED grava a passagem e manda `cmd/passagem`: buzzer apita e o Serial mostra a placa e o sinal |
| Carro fura o vermelho no dashboard | 3 bips e `INFRACAO (multa)` no Serial; no banco fica `sinal = VERMELHO` |
| Clique no botão do poste no dashboard | `cmd/botao_virtual`: igual a apertar o botão azul |
| Botão azul no Wokwi durante o verde | Verde termina em até 3 s, vermelho seguinte de 10 s, botão pisca no dashboard |
| HC-SR04 do Wokwi abaixo de 50 cm | Registra um carro com placa `WOKWI` e o sinal do momento |
| Parar a simulação | ~25 s depois o broker publica o Last Will e o dashboard mostra o ESP32 OFF |

## Tópicos MQTT

| Tópico | Direção | Exemplo |
|---|---|---|
| `fatec/semaforo/01/estado` | ESP32 → Node-RED (1 s) | `{"light":"GREEN","remainingS":9,"durationS":12,"pedestrianRequest":false,"tempos":{...}}` |
| `fatec/semaforo/01/status` | ESP32 → Node-RED (10 s, retido + Last Will) | `{"online":true,"wifiRssi":-58,"uptimeS":1234}` |
| `fatec/semaforo/01/sensor/botao` | ESP32 → Node-RED (ao apertar) | `{"pressed": true}` |
| `fatec/semaforo/01/sensor/veiculo` | ESP32 → Node-RED (HC-SR04 < 50 cm) | `{"distanceCm": 25}` |
| `fatec/semaforo/01/cmd/botao_virtual` | Node-RED → ESP32 (clique no dashboard) | `{"pressed": true}` |
| `fatec/semaforo/01/cmd/passagem` | Node-RED → ESP32 (passagem gravada) | `{"placa":"2","sinal":"RED","infracao":true}` |

## Se o MQTT não conectar

`host.wokwi.internal` é o seu computador visto de dentro do simulador, pelo gateway privado que vem
na extensão. Se aparecer `falhou (estado -2)`:

1. Confira se o Node-RED está rodando (log mostra `Binding aedes mqtt server on port: 1883`).
2. Libere o Node.js no Firewall do Windows (rede privada) quando ele perguntar.
3. Alternativa: use um broker público. Em `include/config.h` troque `MQTT_HOST` para
   `"broker.hivemq.com"` e, no Node-RED, edite o broker "Aedes local" para o mesmo endereço.
   Nesse caso troque também `TOPIC_BASE` por algo único do grupo.
