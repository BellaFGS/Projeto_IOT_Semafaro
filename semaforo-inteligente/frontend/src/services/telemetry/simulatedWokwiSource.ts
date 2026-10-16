import type { LightState } from '../../types/traffic';
import { MQTT_TOPICS } from './config';
import { createNodeRedRules, GREEN_NORMAL_S, type MqttMessage } from './nodeRedRules';
import { parseTelemetry } from './parseTelemetry';
import type { TelemetrySource } from './types';

/**
 * Simulação fictícia do circuito do Wokwi, usada enquanto o ESP32 real não existe.
 * Simula os 3 componentes do projeto (pinos em WOKWI_PINS):
 *   1. LEDs vermelho/amarelo/verde — ciclo do semáforo (verde estendido pelo Node-RED
 *      quando o fluxo é intenso).
 *   2. Botão de pedestre — encurta o verde para 3s e dá vermelho mais longo para a travessia.
 *   3. HC-SR04 — mede a distância do carro na faixa; cada carro que entra abaixo de 50 cm
 *      é contado pelo Node-RED.
 *
 * Cada passo percorre o mesmo caminho do sistema real:
 *   ESP32 simulado → mensagens MQTT (mesmos tópicos/JSON do firmware)
 *   → regras do Node-RED (nodeRedRules.ts) → JSON → parseTelemetry → dashboard.
 * Trocar para os dados reais é só mudar a fonte para `websocket` (ver config.ts).
 */

const TICK_MS = 500;
const YELLOW_S = 3;
const RED_S = 8;
const RED_WITH_PEDESTRIAN_S = 10;
const PEDESTRIAN_CUT_S = 3;
const SENSOR_BACKGROUND_CM = 320;

interface Car {
  distanceCm: number;
  speedCmPerTick: number;
  /** Onde o carro para no vermelho; alguns param em cima da faixa. */
  stopAtCm: number;
}

const jitter = (amplitude: number) => (Math.random() * 2 - 1) * amplitude;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Comportamento esperado do firmware do ESP32 (main.cpp). */
function createSimulatedEsp32() {
  let tick = 0;
  let light: LightState = 'GREEN';
  let greenDurationS = GREEN_NORMAL_S;
  let durationS = greenDurationS;
  let remainingS = greenDurationS;
  let pedestrianRequest = false;
  let wifiRssi = -58;
  let car: Car | null = null;

  const nextLight = () => {
    if (light === 'GREEN') {
      light = 'YELLOW';
      durationS = YELLOW_S;
    } else if (light === 'YELLOW') {
      light = 'RED';
      durationS = pedestrianRequest ? RED_WITH_PEDESTRIAN_S : RED_S;
      pedestrianRequest = false; // travessia acontece durante este vermelho
    } else {
      light = 'GREEN';
      durationS = greenDurationS;
    }
    remainingS = durationS;
  };

  const updateCar = (now: number) => {
    // A cada ~45s em três, o trânsito fica intenso (para exercitar a regra de fluxo).
    const heavy = Math.floor(now / 45_000) % 3 === 2;
    if (!car && Math.random() < (heavy ? 0.4 : 0.07)) {
      car = {
        distanceCm: 230,
        speedCmPerTick: 18 + Math.random() * 14,
        stopAtCm: Math.random() < 0.12 ? 14 : 28,
      };
    }
    if (!car) return;

    if (light !== 'GREEN' && car.distanceCm >= car.stopAtCm) {
      car.distanceCm = Math.max(car.stopAtCm, car.distanceCm - car.speedCmPerTick);
    } else {
      car.distanceCm -= car.speedCmPerTick;
      if (car.distanceCm < 5) car = null;
    }
  };

  return {
    receive(cmd: MqttMessage) {
      if (cmd.topic === MQTT_TOPICS.greenTimeCmd) {
        const payload = cmd.payload as { durationS?: number };
        if (payload.durationS) greenDurationS = payload.durationS;
      }
    },

    boot(): MqttMessage {
      return { topic: MQTT_TOPICS.status, payload: { online: true, wifiRssi, uptimeS: 0 } };
    },

    /** Um ciclo do loop() do firmware; devolve o que ele publicaria no MQTT. */
    step(now: number): MqttMessage[] {
      tick += 1;
      const out: MqttMessage[] = [];

      // Botão de pedestre: pressionado de vez em quando durante o verde.
      if (light === 'GREEN' && !pedestrianRequest && Math.random() < 0.012) {
        pedestrianRequest = true;
        remainingS = Math.min(remainingS, PEDESTRIAN_CUT_S);
        out.push({ topic: MQTT_TOPICS.button, payload: { pressed: true } });
      }

      updateCar(now);
      const reading = car ? car.distanceCm + jitter(1.5) : SENSOR_BACKGROUND_CM + jitter(15);
      out.push({
        topic: MQTT_TOPICS.ultrasonic,
        payload: { distanceCm: Math.round(clamp(reading, 2, 400) * 10) / 10 },
      });

      if (tick % 2 === 0) {
        remainingS -= 1;
        if (remainingS <= 0) nextLight();
        out.push({
          topic: MQTT_TOPICS.state,
          payload: { light, remainingS, durationS, pedestrianRequest },
        });
      }

      if (tick % 10 === 0) {
        wifiRssi = Math.round(clamp(wifiRssi + jitter(4), -86, -48));
        out.push({
          topic: MQTT_TOPICS.status,
          payload: { online: true, wifiRssi, uptimeS: Math.floor((tick * TICK_MS) / 1000) },
        });
      }
      return out;
    },
  };
}

export function createSimulatedWokwiSource(): TelemetrySource {
  return ({ onTelemetry, onStatus }) => {
    const device = createSimulatedEsp32();
    const rules = createNodeRedRules();

    const publish = (msg: MqttMessage) => {
      // Passagem pelo broker: o payload vira texto e volta, como no MQTT real.
      const wire: MqttMessage = { topic: msg.topic, payload: JSON.parse(JSON.stringify(msg.payload)) };
      const { telemetry, command } = rules(wire);
      if (command) device.receive(command);
      // Passagem pelo WebSocket do Node-RED até o navegador.
      if (!telemetry) return;
      const parsed = parseTelemetry(JSON.stringify(telemetry));
      if (parsed) onTelemetry(parsed);
    };

    // Como no firmware: conecta, publica o status online e só então entra no loop().
    let loop: number | undefined;
    onStatus('connecting');
    const bootTimer = window.setTimeout(() => {
      publish(device.boot());
      onStatus('online');
      loop = window.setInterval(() => device.step(Date.now()).forEach(publish), TICK_MS);
    }, 800);

    return () => {
      window.clearTimeout(bootTimer);
      window.clearInterval(loop);
    };
  };
}
