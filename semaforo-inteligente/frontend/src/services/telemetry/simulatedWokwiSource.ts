import type { LightState } from '../../types/traffic';
import { MQTT_TOPICS } from './config';
import { createNodeRedRules, type MqttMessage } from './nodeRedRules';
import { parsePassageEvent, parseTelemetry } from './parseTelemetry';
import type { DeviceCommand, TelemetrySource } from './types';

/**
 * Simulação do ESP32 + Node-RED no navegador (`?fonte=simulacao`), para usar sem back-end.
 * O ESP32 simulado faz o mesmo que o firmware (wokwi/src/main.cpp):
 *   - semáforo com os mesmos tempos de cada LED;
 *   - botão de pedestre (clique no poste → botao_virtual, ou sozinho de vez em quando);
 *   - recebe o aviso de passagem (cmd/passagem) que, no Wokwi, faz o buzzer apitar.
 * O caminho é o mesmo do sistema real:
 *   ESP32 simulado → MQTT → regras do Node-RED (nodeRedRules.ts) → JSON → dashboard;
 *   carros do dashboard → "passagem" → regras → evento de volta ao dashboard e ao ESP32.
 */

const TICK_MS = 1000;
// Mesmos tempos do wokwi/include/config.h
const GREEN_S = 12;
const YELLOW_S = 3;
const RED_S = 8;
const RED_WITH_PEDESTRIAN_S = 10;
const PEDESTRIAN_CUT_S = 3;

function createSimulatedEsp32() {
  let tick = 0;
  let light: LightState = 'GREEN';
  let durationS = GREEN_S;
  let remainingS = GREEN_S;
  let pedestrianRequest = false;
  let wifiRssi = -58;

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
      durationS = GREEN_S;
    }
    remainingS = durationS;
  };

  const stateMessage = (): MqttMessage => ({
    topic: MQTT_TOPICS.state,
    payload: {
      light,
      remainingS,
      durationS,
      pedestrianRequest,
      tempos: { verde: GREEN_S, amarelo: YELLOW_S, vermelho: RED_S, vermelhoPedestre: RED_WITH_PEDESTRIAN_S },
    },
  });

  /** Igual ao requestPedestrian() do firmware. */
  const pressButton = (): MqttMessage[] => {
    if (pedestrianRequest || light === 'RED') return [];
    pedestrianRequest = true;
    if (light === 'GREEN' && remainingS > PEDESTRIAN_CUT_S) remainingS = PEDESTRIAN_CUT_S;
    return [{ topic: MQTT_TOPICS.button, payload: { pressed: true } }, stateMessage()];
  };

  return {
    /** Mensagens MQTT recebidas pelo ESP32; devolve o que ele publica em resposta. */
    receive(cmd: MqttMessage): MqttMessage[] {
      if (cmd.topic === MQTT_TOPICS.virtualButtonCmd) return pressButton();
      // cmd/passagem: no Wokwi o buzzer apita; aqui não há o que publicar.
      return [];
    },

    boot(): MqttMessage[] {
      return [{ topic: MQTT_TOPICS.status, payload: { online: true, wifiRssi, uptimeS: 0 } }, stateMessage()];
    },

    /** Um segundo do loop() do firmware. */
    step(): MqttMessage[] {
      tick += 1;
      const out: MqttMessage[] = [];
      // Pedestre "de verdade" apertando o botão de vez em quando durante o verde.
      if (light === 'GREEN' && Math.random() < 0.02) out.push(...pressButton());
      remainingS -= 1;
      if (remainingS <= 0) nextLight();
      out.push(stateMessage());
      if (tick % 10 === 0) {
        wifiRssi = Math.round(Math.min(-48, Math.max(-86, wifiRssi + (Math.random() * 8 - 4))));
        out.push({ topic: MQTT_TOPICS.status, payload: { online: true, wifiRssi, uptimeS: tick } });
      }
      return out;
    },
  };
}

export function createSimulatedWokwiSource(): TelemetrySource {
  return ({ onTelemetry, onPassage, onStatus }) => {
    const device = createSimulatedEsp32();
    const rules = createNodeRedRules();

    const register = (placa: string, sinal: LightState | null) => {
      const result = rules.registerPassage(placa, sinal);
      if (!result) return;
      device.receive(result.command);
      const parsed = parsePassageEvent(JSON.stringify(result.event));
      if (parsed) onPassage(parsed);
    };

    const publish = (msg: MqttMessage) => {
      // Passagem pelo broker: o payload vira texto e volta, como no MQTT real.
      const wire: MqttMessage = { topic: msg.topic, payload: JSON.parse(JSON.stringify(msg.payload)) };
      const { telemetry, passage } = rules.ingest(wire);
      if (passage) register(passage.placa, passage.sinal);
      if (!telemetry) return;
      const parsed = parseTelemetry(JSON.stringify(telemetry));
      if (parsed) onTelemetry(parsed);
    };

    // Como no firmware: conecta, publica o status online e só então entra no loop().
    let loop: number | undefined;
    let booted = false;
    onStatus('connecting');
    const bootTimer = window.setTimeout(() => {
      device.boot().forEach(publish);
      booted = true;
      onStatus('online');
      loop = window.setInterval(() => device.step().forEach(publish), TICK_MS);
    }, 800);

    // Mesmo caminho do Node-RED: comandos do dashboard.
    const send = (command: DeviceCommand) => {
      if (!booted) return;
      if (command.type === 'botao_virtual') {
        device.receive({ topic: MQTT_TOPICS.virtualButtonCmd, payload: { pressed: true } }).forEach(publish);
      } else {
        register(command.placa, command.sinal);
      }
    };

    return {
      stop: () => {
        window.clearTimeout(bootTimer);
        window.clearInterval(loop);
      },
      send,
    };
  };
}
