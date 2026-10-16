import type { ConnectionStatus, TrafficTelemetry } from '../../types/traffic';

export interface TelemetryHandlers {
  onTelemetry: (telemetry: TrafficTelemetry) => void;
  onStatus: (status: ConnectionStatus) => void;
}

/** Uma fonte de telemetria: começa a emitir em `start` e para na função retornada. */
export type TelemetrySource = (handlers: TelemetryHandlers) => () => void;
