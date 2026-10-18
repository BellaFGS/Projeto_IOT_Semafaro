import type { DataSourceKind } from '../../types/traffic';

/** Tópicos MQTT usados pelo ESP32 e pelo Node-RED (prefixo por dispositivo). */
export const MQTT_BASE = 'fatec/semaforo/01';

export const MQTT_TOPICS = {
  // Semáforo (ESP32 → Node-RED)
  state: `${MQTT_BASE}/estado`,
  status: `${MQTT_BASE}/status`,
  button: `${MQTT_BASE}/sensor/botao`,
  /** Carro detectado pelo HC-SR04 do próprio Wokwi (slider do sensor). */
  vehicle: `${MQTT_BASE}/sensor/veiculo`,
  // Comandos (dashboard → Node-RED → ESP32)
  /** Clique no botão de pedestre do poste. */
  virtualButtonCmd: `${MQTT_BASE}/cmd/botao_virtual`,
  /** Passagem gravada no banco: o ESP32 apita o buzzer. */
  passageCmd: `${MQTT_BASE}/cmd/passagem`,
} as const;

/** Ligações do circuito no Wokwi (diagram.json). */
export const WOKWI_PINS = {
  ledRed: 25,
  ledYellow: 26,
  ledGreen: 27,
  button: 14,
  ultrasonicTrig: 5,
  ultrasonicEcho: 18,
  buzzer: 13,
} as const;

export const DEFAULT_WS_URL = 'ws://localhost:1880/ws/semaforo';
/** API HTTP do Node-RED (histórico gravado no SQLite). */
export const DEFAULT_HTTP_URL = 'http://localhost:1880';

/** Sem mensagem por mais tempo que isso, o dashboard marca os dados como atrasados. */
export const STALE_AFTER_MS = 8000;

export interface TelemetryConfig {
  source: DataSourceKind;
  wsUrl: string;
  httpUrl: string;
}

/**
 * Lê a fonte de dados do `.env` (VITE_DATA_SOURCE / VITE_NODE_RED_WS_URL / VITE_NODE_RED_HTTP_URL).
 * Na apresentação dá para trocar sem rebuild pela URL: `?fonte=ws` ou `?fonte=simulacao`,
 * `?ws=ws://host:1880/ws/semaforo` e `?api=http://host:1880`.
 */
export function readTelemetryConfig(): TelemetryConfig {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('fonte');
  const raw = (fromQuery ?? import.meta.env.VITE_DATA_SOURCE ?? 'simulation').toLowerCase();
  const source: DataSourceKind = raw === 'ws' || raw === 'websocket' ? 'websocket' : 'simulation';

  return {
    source,
    wsUrl: params.get('ws') ?? import.meta.env.VITE_NODE_RED_WS_URL ?? DEFAULT_WS_URL,
    httpUrl: (params.get('api') ?? import.meta.env.VITE_NODE_RED_HTTP_URL ?? DEFAULT_HTTP_URL).replace(/\/$/, ''),
  };
}
