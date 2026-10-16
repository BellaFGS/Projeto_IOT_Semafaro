import type {
  AlertLevel,
  LightState,
  TrafficAlert,
  TrafficMode,
  TrafficTelemetry,
} from '../../types/traffic';

const LIGHT_STATES: readonly LightState[] = ['RED', 'YELLOW', 'GREEN'];
const MODES: readonly TrafficMode[] = ['AUTOMATICO', 'PEDESTRE', 'FLUXO_INTENSO', 'ATENCAO'];
const ALERT_LEVELS: readonly AlertLevel[] = ['info', 'warning', 'critical'];

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};
const bool = (v: unknown): boolean => v === true || v === 1 || v === 'true';
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

function parseAlerts(v: unknown): TrafficAlert[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isObj).map(a => ({
    level: oneOf(a.level, ALERT_LEVELS, 'info'),
    code: String(a.code ?? 'ALERTA'),
    message: String(a.message ?? ''),
  }));
}

/**
 * Valida e normaliza a mensagem recebida do Node-RED.
 * Aceita string JSON ou objeto; retorna null se não for uma telemetria do semáforo.
 */
export function parseTelemetry(input: unknown): TrafficTelemetry | null {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return null;
    }
  }
  if (!isObj(data) || data.type !== 'telemetry') return null;

  const light = isObj(data.light) ? data.light : null;
  const sensors = isObj(data.sensors) ? data.sensors : {};
  const flow = isObj(data.flow) ? data.flow : {};
  const actuators = isObj(data.actuators) ? data.actuators : {};
  const device = isObj(data.device) ? data.device : {};
  if (!light || !LIGHT_STATES.includes(light.state as LightState)) return null;

  const state = light.state as LightState;
  return {
    type: 'telemetry',
    deviceId: String(data.deviceId ?? 'esp32'),
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : new Date().toISOString(),
    light: {
      state,
      remainingS: Math.max(0, Math.round(num(light.remainingS))),
      durationS: Math.max(0, Math.round(num(light.durationS))),
    },
    mode: oneOf(data.mode, MODES, 'AUTOMATICO'),
    sensors: {
      ultrasonicCm: num(sensors.ultrasonicCm),
      vehicleDetected: bool(sensors.vehicleDetected),
      pedestrianRequest: bool(sensors.pedestrianRequest),
    },
    flow: {
      vehicleCount: Math.max(0, Math.round(num(flow.vehicleCount))),
      vehiclesPerMin: Math.max(0, num(flow.vehiclesPerMin)),
    },
    actuators: {
      ledRed: 'ledRed' in actuators ? bool(actuators.ledRed) : state === 'RED',
      ledYellow: 'ledYellow' in actuators ? bool(actuators.ledYellow) : state === 'YELLOW',
      ledGreen: 'ledGreen' in actuators ? bool(actuators.ledGreen) : state === 'GREEN',
    },
    device: {
      online: 'online' in device ? bool(device.online) : true,
      wifiRssi: num(device.wifiRssi, -100),
      uptimeS: Math.max(0, num(device.uptimeS)),
    },
    alerts: parseAlerts(data.alerts),
  };
}
