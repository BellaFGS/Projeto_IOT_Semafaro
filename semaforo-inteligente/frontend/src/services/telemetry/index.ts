import type { TelemetryConfig } from './config';
import { createSimulatedWokwiSource } from './simulatedWokwiSource';
import type { TelemetrySource } from './types';
import { createWebSocketSource } from './websocketSource';

export * from './config';
export * from './parseTelemetry';
export type * from './types';

export function createTelemetrySource(config: TelemetryConfig): TelemetrySource {
  return config.source === 'websocket'
    ? createWebSocketSource(config.wsUrl)
    : createSimulatedWokwiSource();
}
