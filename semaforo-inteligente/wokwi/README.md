# 🔌 Wokwi + PlatformIO — ESP32 do semáforo

Firmware do ESP32 e circuito simulado no Wokwi (extensão do VS Code).

## Componentes

| Componente | Função | Pino ESP32 |
|---|---|---|
| LED vermelho / amarelo / verde (+ 220 Ω) | Semáforo | GPIO 25 / 26 / 27 |
| Botão de pedestre (azul) | Pede travessia: corta o verde para 3 s e dá 10 s de vermelho | GPIO 14 (`INPUT_PULLUP`) e GND |
| HC-SR04 (ultrassônico) | Conta os carros: distância < 50 cm = carro na faixa | TRIG 5 / ECHO 18, VCC 5V, GND |

**Por que HC-SR04 para contar carros?** O Wokwi não tem sensor de pressão/peso de pista. Ele tem
balança (HX711) e PIR, mas a balança não representa um carro passando e o PIR só diz "tem movimento".
O HC-SR04 mede **quanto** o carro está perto, então serve para contar (cruzou 50 cm) e para alertar
carro em cima da faixa (< 20 cm). No Wokwi você controla a distância com um slider, que vira o
"carro" da simulação.

## Arquivos

| Arquivo | O que é |
|---|---|
| `diagram.json` | Circuito do Wokwi (placa ESP32 DevKit C v4, 3 LEDs, botão, HC-SR04) |
| `wokwi.toml` | Aponta o Wokwi para o firmware compilado em `.pio/build/esp32dev/` |
| `platformio.ini` | Projeto PlatformIO (PubSubClient + ArduinoJson) |
| `include/config.h` | Wi-Fi, broker MQTT, tópicos, pinos e tempos |
| `src/main.cpp` | Ciclo do semáforo, leitura do botão e do sensor, MQTT |

## Como rodar no VS Code

1. Abra `semaforo-inteligente/semaforo.code-workspace` no VS Code.
2. Suba o Node-RED antes: tarefa **"1. Node-RED"** (`Terminal → Run Task`). É nele que está o broker MQTT.
3. Compile o firmware: tarefa **"Firmware: compilar (PlatformIO)"** ou o botão ✓ do PlatformIO.
4. Abra `wokwi/diagram.json` e rode **`Wokwi: Start Simulator`** (F1). Na primeira vez a extensão pede
   para ativar a licença gratuita.
5. No Monitor Serial do Wokwi deve aparecer:

```
[WIFI] ok, IP 10.13.37.2
[MQTT] conectando em host.wokwi.internal:1883... ok
[SINAL] YELLOW por 3s
```

### Testando no simulador

| Ação no Wokwi | O que acontece |
|---|---|
| Clicar no HC-SR04 e arrastar a distância para **< 50 cm** | Um carro é contado; no dashboard um carro entra e para na faixa |
| Voltar a distância para **> 50 cm** | O carro do dashboard segue viagem |
| Distância **< 20 cm** | Alerta "Veículo sobre a faixa" |
| Passar 8 carros em 1 min | Node-RED manda `cmd/tempo_verde` = 16 s (fluxo intenso) |
| Clicar no botão azul durante o verde | Verde cai para 3 s, vermelho seguinte de 10 s, botão pisca no dashboard |
| Parar a simulação | ~25 s depois o broker publica o Last Will e o dashboard mostra o ESP32 OFF |

## Tópicos MQTT

| Tópico | Direção | Exemplo |
|---|---|---|
| `fatec/semaforo/01/sensor/ultrassonico` | ESP32 → broker (500 ms) | `{"distanceCm": 27.4}` |
| `fatec/semaforo/01/sensor/botao` | ESP32 → broker (ao apertar) | `{"pressed": true}` |
| `fatec/semaforo/01/estado` | ESP32 → broker (1 s) | `{"light":"GREEN","remainingS":9,"durationS":12,"pedestrianRequest":false}` |
| `fatec/semaforo/01/status` | ESP32 → broker (10 s, retido + Last Will) | `{"online":true,"wifiRssi":-58,"uptimeS":1234}` |
| `fatec/semaforo/01/cmd/tempo_verde` | Node-RED → ESP32 | `{"durationS": 16}` |

## Se o MQTT não conectar

`host.wokwi.internal` é o seu computador visto de dentro do simulador, pelo gateway privado que vem
na extensão do VS Code. Se aparecer `falhou (estado -2)`:

1. Confira se o Node-RED está rodando (log mostra `Binding aedes mqtt server on port: 1883`).
2. Libere o Node.js no Firewall do Windows (rede privada) quando ele perguntar.
3. Alternativa: use um broker público. Em `include/config.h` troque `MQTT_HOST` para
   `"broker.hivemq.com"` e, no Node-RED, edite o broker "Aedes local" para o mesmo endereço.
   Nesse caso troque também `TOPIC_BASE` por algo único do grupo.
