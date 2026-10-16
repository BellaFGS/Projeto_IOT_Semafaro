/**
 * Contrato de dados do Semáforo Inteligente.
 *
 * Fluxo: HC-SR04 / botão → ESP32 (Wokwi) → MQTT → Node-RED → WebSocket → Dashboard.
 * O Node-RED junta as mensagens MQTT do ESP32, aplica as regras e envia ao
 * dashboard um único objeto `TrafficTelemetry` em JSON (ver README.md).
 */

export type LightState = 'RED' | 'YELLOW' | 'GREEN';

/** Modo de operação decidido pelas regras do Node-RED. */
export type TrafficMode = 'AUTOMATICO' | 'PEDESTRE' | 'FLUXO_INTENSO' | 'ATENCAO';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface TrafficAlert {
  level: AlertLevel;
  /** Identificador estável da regra (ex.: VEICULO_PROXIMO). */
  code: string;
  message: string;
}

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
  mode: TrafficMode;
  sensors: {
    /** Distância medida pelo HC-SR04, em cm. */
    ultrasonicCm: number;
    /** true quando a distância está abaixo do limiar de detecção. */
    vehicleDetected: boolean;
    /** Pedido de travessia pendente (botão de pedestre). */
    pedestrianRequest: boolean;
  };
  flow: {
    /** Total acumulado de veículos detectados. */
    vehicleCount: number;
    /** Veículos no último minuto. */
    vehiclesPerMin: number;
  };
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
}

/** De onde o dashboard está lendo os dados. */
export type DataSourceKind = 'simulation' | 'websocket';

export type ConnectionStatus = 'connecting' | 'online' | 'stale' | 'offline';
