/**
 * Contrato de dados do Semáforo Inteligente.
 *
 * Dois sistemas que conversam pelo Node-RED:
 *   1. Semáforo: ESP32 (Wokwi) → MQTT → Node-RED → WebSocket → dashboard (`TrafficTelemetry`).
 *   2. Carros: dashboard → WebSocket → Node-RED → SQLite → dashboard (`PassageEvent`) e ESP32 (buzzer).
 */

export type LightState = 'RED' | 'YELLOW' | 'GREEN';

/** Modo de operação do semáforo. */
export type TrafficMode = 'AUTOMATICO' | 'PEDESTRE' | 'ATENCAO';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface TrafficAlert {
  level: AlertLevel;
  /** Identificador estável da regra (ex.: PEDESTRE_AGUARDANDO). */
  code: string;
  message: string;
}

/** Tempo programado de cada LED no firmware, em segundos. */
export interface LightTimes {
  verde: number;
  amarelo: number;
  vermelho: number;
  vermelhoPedestre: number;
}

/** Um carro que passou pelo sensor, como gravado no banco. */
export interface Passage {
  id: number;
  /** ISO 8601. */
  at: string;
  plate: string;
  /** Cor do semáforo no momento da passagem. */
  light: LightState;
  /** Passou no vermelho. */
  violation: boolean;
}

/** Totais do banco de passagens. */
export interface PassageStats {
  total: number;
  green: number;
  yellow: number;
  red: number;
  /** Passagens no último minuto. */
  perMin: number;
}

/** Telemetria do semáforo (sistema 1), um objeto por mensagem. */
export interface TrafficTelemetry {
  type: 'telemetry';
  deviceId: string;
  /** ISO 8601 gerado pelo Node-RED. */
  timestamp: string;
  light: {
    state: LightState;
    /** Segundos restantes no estado atual. */
    remainingS: number;
    /** Duração total programada para o estado atual. */
    durationS: number;
  };
  times: LightTimes | null;
  mode: TrafficMode;
  /** Pedido de travessia pendente (botão de pedestre). */
  pedestrianRequest: boolean;
  actuators: {
    ledRed: boolean;
    ledYellow: boolean;
    ledGreen: boolean;
  };
  device: {
    online: boolean;
    /** Sinal Wi-Fi do ESP32, em dBm. */
    wifiRssi: number;
    uptimeS: number;
  };
  alerts: TrafficAlert[];
  /** Totais do sistema de carros, para o dashboard abrir já preenchido. */
  passages: PassageStats;
  lastPassage: Passage | null;
}

/** Evento do sistema de carros: uma passagem acabou de ser gravada no banco. */
export interface PassageEvent {
  type: 'passagem';
  passage: Passage;
  stats: PassageStats;
}

/** De onde o dashboard está lendo os dados. */
export type DataSourceKind = 'simulation' | 'websocket';

export type ConnectionStatus = 'connecting' | 'online' | 'stale' | 'offline';
