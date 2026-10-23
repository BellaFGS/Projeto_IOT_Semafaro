import type {
  AlertLevel,
  LightState,
  LightTimes,
  Passage,
  PassageEvent,
  PassageStats,
  TrafficAlert,
  TrafficMode,
  TrafficTelemetry,
} from '../../types/traffic';

const LIGHT_STATES: readonly LightState[] = ['RED', 'YELLOW', 'GREEN'];
const MODES: readonly TrafficMode[] = ['AUTOMATICO', 'PEDESTRE', 'ATENCAO'];
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

function parseTimes(v: unknown): LightTimes | null {
  if (!isObj(v)) return null;
  return {
    verde: num(v.verde),
    amarelo: num(v.amarelo),
    vermelho: num(v.vermelho),
    vermelhoPedestre: num(v.vermelhoPedestre, num(v.vermelho)),
  };
}

function parseStats(v: unknown): PassageStats {
  const s = isObj(v) ? v : {};
  return {
    total: Math.max(0, Math.round(num(s.total))),
    green: Math.max(0, Math.round(num(s.green))),
    yellow: Math.max(0, Math.round(num(s.yellow))),
    red: Math.max(0, Math.round(num(s.red))),
    perMin: Math.max(0, num(s.perMin)),
  };
}

function parsePassage(v: unknown): Passage | null {
  if (!isObj(v) || !LIGHT_STATES.includes(v.light as LightState)) return null;
  const light = v.light as LightState;
  return {
    id: Math.round(num(v.id)),
    at: typeof v.at === 'string' ? v.at : new Date().toISOString(),
    plate: String(v.plate ?? '?'),
    light,
    violation: 'violation' in v ? bool(v.violation) : light === 'RED',
  };
}

const toObject = (input: unknown): unknown => {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

/**
 * Valida e normaliza a telemetria do semáforo vinda do Node-RED.
 * Aceita string JSON ou objeto; retorna null se não for uma telemetria.
 */
export function parseTelemetry(input: unknown): TrafficTelemetry | null {
  const data = toObject(input);
  if (!isObj(data) || data.type !== 'telemetry') return null;

  const light = isObj(data.light) ? data.light : null;
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
    times: parseTimes(data.times),
    mode: oneOf(data.mode, MODES, 'AUTOMATICO'),
    pedestrianRequest: bool(data.pedestrianRequest),
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
    passages: parseStats(data.passages),
    lastPassage: parsePassage(data.lastPassage),
  };
}

/** Valida o evento de passagem gravada (sistema de carros). */
export function parsePassageEvent(input: unknown): PassageEvent | null {
  const data = toObject(input);
  if (!isObj(data) || data.type !== 'passagem') return null;
  const passage = parsePassage(data.passage);
  if (!passage) return null;
  return { type: 'passagem', passage, stats: parseStats(data.stats) };
}
