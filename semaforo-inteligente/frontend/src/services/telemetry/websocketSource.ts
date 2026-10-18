import { parsePassageEvent, parseTelemetry } from './parseTelemetry';
import type { TelemetrySource } from './types';

const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 10000;

/**
 * Conecta no WebSocket do Node-RED (/ws/semaforo), repassa cada telemetria válida
 * e envia os comandos do minigame. Reconecta sozinho com espera crescente
 * (1s → 10s) se o Node-RED cair.
 */
export function createWebSocketSource(url: string): TelemetrySource {
  return ({ onTelemetry, onPassage, onStatus }) => {
    let socket: WebSocket | null = null;
    let retryMs = MIN_RETRY_MS;
    let retryTimer: number | undefined;
    let stopped = false;

    const connect = () => {
      onStatus('connecting');
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        retryMs = MIN_RETRY_MS;
        onStatus('online');
      };
      socket.onmessage = event => {
        const telemetry = parseTelemetry(event.data);
        if (telemetry) return onTelemetry(telemetry);
        const passage = parsePassageEvent(event.data);
        if (passage) return onPassage(passage);
        console.warn('[telemetria] mensagem ignorada, fora do contrato:', event.data);
      };
      socket.onclose = () => {
        if (!stopped) scheduleRetry();
      };
      socket.onerror = () => socket?.close();
    };

    const scheduleRetry = () => {
      onStatus('offline');
      retryTimer = window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    };

    connect();

    return {
      stop: () => {
        stopped = true;
        window.clearTimeout(retryTimer);
        socket?.close();
      },
      // Comandos vão pelo mesmo WebSocket; o nó "websocket in" do Node-RED repassa ao ESP32.
      send: command => {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(command));
      },
    };
  };
}
