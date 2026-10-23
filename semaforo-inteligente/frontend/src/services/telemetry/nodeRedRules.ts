import type {
  LightState,
  LightTimes,
  Passage,
  PassageEvent,
  PassageStats,
  TrafficAlert,
  TrafficMode,
  TrafficTelemetry,
} from '../../types/traffic';
import { MQTT_TOPICS } from './config';

/**
 * O fluxo do Node-RED em TypeScript, para a simulação no navegador (`?fonte=simulacao`).
 * Espelha as funções de node-red/flows.json:
 *   - ingest(): "Estado do semáforo" — MQTT do ESP32 → telemetria do dashboard.
 *   - registerPassage(): "Validar passagem" + "Registrar passagem" + "Avisar dashboard e
 *     ESP32" — valida e grava a passagem (aqui, em memória no lugar do SQLite) com o sinal
 *     oficial do ESP32.
 */

export const DEVICE_ID = 'esp32-semaforo-01';
export const WEAK_SIGNAL_DBM = -80;
/** Placas aceitas pelo nó "Validar passagem". */
const PLACAS = ['1', '2', '3', 'WOKWI'];
/** Mesma placa em menos que isso = leitura duplicada do sensor. */
const DUPLICATE_WINDOW_MS = 3000;

export interface MqttMessage {
  topic: string;
  payload: unknown;
}

interface SemaphoreState {
  light: LightState;
  remainingS: number;
  durationS: number;
  pedestrianRequest: boolean;
  times: LightTimes | null;
  online: boolean;
  wifiRssi: number;
  uptimeS: number;
  hasState: boolean;
}

export interface IngestOutput {
  /** null até chegar o primeiro estado do semáforo (no Node-RED: função retorna null). */
  telemetry: TrafficTelemetry | null;
  /** O HC-SR04 do Wokwi detectou um carro (slider): registrar como passagem. */
  passage?: { placa: string; sinal: LightState };
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

export function createNodeRedRules() {
  const s: SemaphoreState = {
    light: 'RED',
    remainingS: 0,
    durationS: 0,
    pedestrianRequest: false,
    times: null,
    online: false,
    wifiRssi: -100,
    uptimeS: 0,
    hasState: false,
  };
  // No Node-RED real isto vem do SQLite (tabela passagens).
  const passages: Passage[] = [];
  let nextId = 1;
  const lastByPlate: Record<string, number> = {};

  const stats = (now: number): PassageStats => ({
    total: passages.length,
    green: passages.filter(p => p.light === 'GREEN').length,
    yellow: passages.filter(p => p.light === 'YELLOW').length,
    red: passages.filter(p => p.light === 'RED').length,
    perMin: passages.filter(p => now - Date.parse(p.at) < 60_000).length,
  });

  /** "Estado do semáforo" */
  function ingest({ topic, payload }: MqttMessage, now = Date.now()): IngestOutput {
    const p = obj(payload);
    let passage: IngestOutput['passage'];

    switch (topic) {
      case MQTT_TOPICS.state:
        s.light = (p.light as LightState) ?? s.light;
        s.remainingS = Number(p.remainingS ?? s.remainingS);
        s.durationS = Number(p.durationS ?? s.durationS);
        s.pedestrianRequest = Boolean(p.pedestrianRequest);
        if (p.tempos) s.times = p.tempos as LightTimes;
        s.online = true;
        s.hasState = true;
        break;
      case MQTT_TOPICS.status:
        s.online = Boolean(p.online);
        if (p.wifiRssi !== undefined) s.wifiRssi = Number(p.wifiRssi);
        if (p.uptimeS !== undefined) s.uptimeS = Number(p.uptimeS);
        break;
      case MQTT_TOPICS.button:
        if (p.pressed) s.pedestrianRequest = true;
        break;
      case MQTT_TOPICS.vehicle:
        passage = { placa: 'WOKWI', sinal: s.light };
        break;
      default:
        return { telemetry: null };
    }

    let mode: TrafficMode = 'AUTOMATICO';
    if (!s.online) mode = 'ATENCAO';
    else if (s.pedestrianRequest) mode = 'PEDESTRE';

    const alerts: TrafficAlert[] = [];
    if (!s.online) alerts.push({ level: 'critical', code: 'DISPOSITIVO_OFFLINE', message: 'ESP32 sem comunicação com o broker MQTT' });
    if (s.pedestrianRequest) alerts.push({ level: 'info', code: 'PEDESTRE_AGUARDANDO', message: 'Pedestre aguardando travessia' });
    if (s.online && s.wifiRssi < WEAK_SIGNAL_DBM) {
      alerts.push({ level: 'warning', code: 'SINAL_FRACO', message: `Wi-Fi fraco no ESP32 (${s.wifiRssi} dBm)` });
    }

    if (!s.hasState) return { telemetry: null, passage };
    return {
      passage,
      telemetry: {
        type: 'telemetry',
        deviceId: DEVICE_ID,
        timestamp: new Date(now).toISOString(),
        light: { state: s.light, remainingS: s.remainingS, durationS: s.durationS },
        times: s.times,
        mode,
        pedestrianRequest: s.pedestrianRequest,
        actuators: { ledRed: s.light === 'RED', ledYellow: s.light === 'YELLOW', ledGreen: s.light === 'GREEN' },
        device: { online: s.online, wifiRssi: s.wifiRssi, uptimeS: s.uptimeS },
        alerts,
        passages: stats(now),
        lastPassage: passages.at(-1) ?? null,
      },
    };
  }

  /** "Validar passagem" + "Registrar passagem" + "Avisar dashboard e ESP32" */
  function registerPassage(rawPlaca: string, _sinalDashboard: LightState | null, now = Date.now()) {
    // Validação (igual ao nó "Validar passagem" do Node-RED)
    const placa = String(rawPlaca).trim().toUpperCase();
    if (!PLACAS.includes(placa)) return null;
    if (!s.hasState || !s.online) return null; // sem semáforo não dá para verificar o sinal
    if (lastByPlate[placa] && now - lastByPlate[placa] < DUPLICATE_WINDOW_MS) return null;
    lastByPlate[placa] = now;
    // O sinal oficial é o último estado do ESP32, não o que o dashboard mandou.
    const light = s.light;
    const passage: Passage = {
      id: nextId++,
      at: new Date(now).toISOString(),
      plate: placa,
      light,
      violation: light === 'RED',
    };
    passages.push(passage);
    const event: PassageEvent = { type: 'passagem', passage, stats: stats(now) };
    const command: MqttMessage = {
      topic: MQTT_TOPICS.passageCmd,
      payload: { placa, sinal: light, infracao: passage.violation },
    };
    return { event, command };
  }

  return { ingest, registerPassage };
}
