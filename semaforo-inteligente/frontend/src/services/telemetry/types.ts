import type { ConnectionStatus, LightState, PassageEvent, TrafficTelemetry } from '../../types/traffic';

export interface TelemetryHandlers {
  /** Sistema 1: estado do semáforo vindo do ESP32. */
  onTelemetry: (telemetry: TrafficTelemetry) => void;
  /** Sistema 2: uma passagem de carro acabou de ser gravada no banco. */
  onPassage: (event: PassageEvent) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/**
 * Comandos que o dashboard manda pelo WebSocket do Node-RED.
 *   - botao_virtual: clique no botão de pedestre do poste (vai ao ESP32 como o botão físico).
 *   - passagem: um carro do minigame passou pelo sensor; o Node-RED grava no banco
 *     com o sinal oficial do ESP32 naquele instante (`sinal` é o que o dashboard via).
 */
export type DeviceCommand =
  | { type: 'botao_virtual' }
  | { type: 'passagem'; placa: string; sinal: LightState | null };

export interface TelemetryConnection {
  stop: () => void;
  send: (command: DeviceCommand) => void;
}

/** Uma fonte de dados: começa a emitir ao ser chamada e devolve como parar e enviar comandos. */
export type TelemetrySource = (handlers: TelemetryHandlers) => TelemetryConnection;
