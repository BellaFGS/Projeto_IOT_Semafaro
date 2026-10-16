import type { LightState, TrafficAlert, TrafficMode, TrafficTelemetry } from '../../types/traffic';
import { MQTT_TOPICS } from './config';

/**
 * Regras do Node-RED, em TypeScript.
 *
 * É a mesma lógica do nó function "Regras do semáforo" descrito no README:
 * recebe cada mensagem MQTT do ESP32, guarda o último valor de cada tópico
 * e monta o objeto `TrafficTelemetry` que vai para o dashboard.
 * A simulação usa este módulo para que os dados fictícios passem pelas
 * mesmas regras que os reais vão passar.
 */

export const DEVICE_ID = 'esp32-semaforo-01';
/** Distância abaixo da qual o HC-SR04 considera que há veículo na faixa. */
export const DETECTION_CM = 50;
/** Distância de alerta: veículo avançando sobre a faixa. */
export const TOO_CLOSE_CM = 20;
/** Veículos/min a partir do qual o fluxo é considerado intenso. */
export const HEAVY_FLOW_PER_MIN = 8;
export const GREEN_NORMAL_S = 12;
export const GREEN_EXTENDED_S = 16;
export const WEAK_SIGNAL_DBM = -80;

export interface MqttMessage {
  topic: string;
  payload: unknown;
}

interface RulesMemory {
  distanceCm: number;
  vehicleDetected: boolean;
  vehicleCount: number;
  detections: number[];
  light: LightState;
  remainingS: number;
  durationS: number;
  pedestrianRequest: boolean;
  online: boolean;
  wifiRssi: number;
  uptimeS: number;
  greenCmdS: number;
  hasState: boolean;
}

export interface RulesOutput {
  /** null até chegar o primeiro estado do semáforo (no Node-RED: função retorna null). */
  telemetry: TrafficTelemetry | null;
  /** Comando para publicar de volta ao ESP32, quando alguma regra pede. */
  command?: MqttMessage;
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

export function createNodeRedRules() {
  const mem: RulesMemory = {
    distanceCm: 400,
    vehicleDetected: false,
    vehicleCount: 0,
    detections: [],
    light: 'RED',
    remainingS: 0,
    durationS: 0,
    pedestrianRequest: false,
    online: false,
    wifiRssi: -100,
    uptimeS: 0,
    greenCmdS: GREEN_NORMAL_S,
    hasState: false,
  };

  return function ingest({ topic, payload }: MqttMessage, now = Date.now()): RulesOutput {
    const p = obj(payload);

    switch (topic) {
      case MQTT_TOPICS.ultrasonic: {
        mem.distanceCm = Number(p.distanceCm ?? mem.distanceCm);
        const detected = mem.distanceCm < DETECTION_CM;
        // Borda de subida: um veículo novo entrou na área do sensor.
        if (detected && !mem.vehicleDetected) {
          mem.vehicleCount += 1;
          mem.detections.push(now);
        }
        mem.vehicleDetected = detected;
        break;
      }
      case MQTT_TOPICS.button:
        if (p.pressed) mem.pedestrianRequest = true;
        break;
      case MQTT_TOPICS.state:
        mem.light = (p.light as LightState) ?? mem.light;
        mem.remainingS = Number(p.remainingS ?? mem.remainingS);
        mem.durationS = Number(p.durationS ?? mem.durationS);
        mem.pedestrianRequest = Boolean(p.pedestrianRequest);
        mem.online = true;
        mem.hasState = true;
        break;
      case MQTT_TOPICS.status:
        mem.online = Boolean(p.online);
        if (p.wifiRssi !== undefined) mem.wifiRssi = Number(p.wifiRssi);
        if (p.uptimeS !== undefined) mem.uptimeS = Number(p.uptimeS);
        break;
    }

    mem.detections = mem.detections.filter(t => now - t < 60_000);
    const vehiclesPerMin = mem.detections.length;

    let mode: TrafficMode = 'AUTOMATICO';
    if (!mem.online) mode = 'ATENCAO';
    else if (mem.pedestrianRequest) mode = 'PEDESTRE';
    else if (vehiclesPerMin >= HEAVY_FLOW_PER_MIN) mode = 'FLUXO_INTENSO';

    const alerts: TrafficAlert[] = [];
    if (!mem.online) {
      alerts.push({ level: 'critical', code: 'DISPOSITIVO_OFFLINE', message: 'ESP32 sem comunicação com o broker MQTT' });
    }
    if (mem.distanceCm < TOO_CLOSE_CM) {
      alerts.push({ level: 'warning', code: 'VEICULO_PROXIMO', message: `Veículo sobre a faixa (${mem.distanceCm.toFixed(0)} cm)` });
    }
    if (mode === 'FLUXO_INTENSO') {
      alerts.push({ level: 'warning', code: 'FLUXO_INTENSO', message: `Fluxo intenso: verde estendido para ${GREEN_EXTENDED_S}s` });
    }
    if (mem.pedestrianRequest) {
      alerts.push({ level: 'info', code: 'PEDESTRE_AGUARDANDO', message: 'Pedestre aguardando travessia' });
    }
    if (mem.online && mem.wifiRssi < WEAK_SIGNAL_DBM) {
      alerts.push({ level: 'warning', code: 'SINAL_FRACO', message: `Wi-Fi fraco no ESP32 (${mem.wifiRssi} dBm)` });
    }

    // Automação: ajusta o tempo de verde do ESP32 conforme o fluxo.
    let command: MqttMessage | undefined;
    const wantedGreen = mode === 'FLUXO_INTENSO' ? GREEN_EXTENDED_S : GREEN_NORMAL_S;
    if (mem.online && wantedGreen !== mem.greenCmdS) {
      mem.greenCmdS = wantedGreen;
      command = { topic: MQTT_TOPICS.greenTimeCmd, payload: { durationS: wantedGreen } };
    }

    if (!mem.hasState) return { command, telemetry: null };

    return {
      command,
      telemetry: {
        type: 'telemetry',
        deviceId: DEVICE_ID,
        timestamp: new Date(now).toISOString(),
        light: { state: mem.light, remainingS: mem.remainingS, durationS: mem.durationS },
        mode,
        sensors: {
          ultrasonicCm: Math.round(mem.distanceCm * 10) / 10,
          vehicleDetected: mem.vehicleDetected,
          pedestrianRequest: mem.pedestrianRequest,
        },
        flow: { vehicleCount: mem.vehicleCount, vehiclesPerMin },
        actuators: {
          ledRed: mem.light === 'RED',
          ledYellow: mem.light === 'YELLOW',
          ledGreen: mem.light === 'GREEN',
        },
        device: { online: mem.online, wifiRssi: mem.wifiRssi, uptimeS: mem.uptimeS },
        alerts,
      },
    };
  };
}
