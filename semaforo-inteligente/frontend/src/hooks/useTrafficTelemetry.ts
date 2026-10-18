import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createTelemetrySource,
  fetchStoredEvents,
  fetchStoredReadings,
  readTelemetryConfig,
  STALE_AFTER_MS,
} from '../services/telemetry';
import type {
  AlertLevel,
  ConnectionStatus,
  DataSourceKind,
  TrafficTelemetry,
} from '../types/traffic';

const HISTORY_SIZE = 60;
const HISTORY_SAMPLE_MS = 1000;
const EVENTS_SIZE = 8;

export interface HistoryPoint {
  at: number;
  distanceCm: number;
  vehiclesPerMin: number;
}

export interface TrafficEvent {
  id: number;
  at: number;
  level: AlertLevel;
  message: string;
}

export interface TrafficTelemetryState {
  source: DataSourceKind;
  wsUrl: string;
  status: ConnectionStatus;
  telemetry: TrafficTelemetry | null;
  receivedAt: number | null;
  /** Tempo desde a última mensagem recebida. */
  ageMs: number | null;
  /** Contagem regressiva do sinal, corrigida pelo tempo desde a última mensagem. */
  remainingS: number | null;
  history: HistoryPoint[];
  events: TrafficEvent[];
}

const LIGHT_NAMES = { RED: 'vermelho', YELLOW: 'amarelo', GREEN: 'verde' } as const;

/** Assina a fonte de telemetria configurada e mantém o estado do dashboard. */
export function useTrafficTelemetry(): TrafficTelemetryState {
  const config = useMemo(readTelemetryConfig, []);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [telemetry, setTelemetry] = useState<TrafficTelemetry | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const previousRef = useRef<TrafficTelemetry | null>(null);
  const lastSampleRef = useRef(0);
  const eventIdRef = useRef(0);

  useEffect(() => {
    const stop = createTelemetrySource(config)({
      onStatus: setStatus,
      onTelemetry: next => {
        const at = Date.now();
        const prev = previousRef.current;
        previousRef.current = next;
        setTelemetry(next);
        setReceivedAt(at);

        if (at - lastSampleRef.current >= HISTORY_SAMPLE_MS) {
          lastSampleRef.current = at;
          setHistory(h => [
            ...h.slice(-(HISTORY_SIZE - 1)),
            { at, distanceCm: next.sensors.ultrasonicCm, vehiclesPerMin: next.flow.vehiclesPerMin },
          ]);
        }

        const fresh: Omit<TrafficEvent, 'id'>[] = [];
        if (prev && prev.light.state !== next.light.state) {
          fresh.push({ at, level: 'info', message: `Sinal ${LIGHT_NAMES[next.light.state]} (${next.light.durationS}s)` });
        }
        if (prev && next.flow.vehicleCount > prev.flow.vehicleCount) {
          fresh.push({ at, level: 'info', message: `Carro contado (${next.sensors.ultrasonicCm.toFixed(0)} cm)` });
        }
        const prevCodes = new Set(prev?.alerts.map(a => a.code));
        next.alerts
          .filter(a => !prevCodes.has(a.code))
          .forEach(a => fresh.push({ at, level: a.level, message: a.message }));

        if (fresh.length) {
          setEvents(list => [
            ...fresh.map(e => ({ ...e, id: ++eventIdRef.current })).reverse(),
            ...list,
          ].slice(0, EVENTS_SIZE));
        }
      },
    });
    return stop;
  }, [config]);

  // Com dados reais, abre já com o histórico gravado no banco pelo Node-RED.
  useEffect(() => {
    if (config.source !== 'websocket') return;
    let cancelled = false;
    Promise.all([
      fetchStoredEvents(config.httpUrl, EVENTS_SIZE),
      fetchStoredReadings(config.httpUrl, HISTORY_SIZE),
    ])
      .then(([stored, readings]) => {
        if (cancelled) return;
        // ids negativos para não colidir com os eventos ao vivo
        const seeded = stored.map((e, i) => ({ ...e, id: -(i + 1) }));
        setEvents(list => [...list, ...seeded].slice(0, EVENTS_SIZE));
        setHistory(h => [...readings, ...h].slice(-HISTORY_SIZE));
      })
      .catch(err => console.warn('[histórico] API do Node-RED indisponível:', err.message));
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  // `now` só anda a cada 250 ms, então pode ficar atrás de `receivedAt`; sem o
  // Math.max o floor de um valor negativo dá -1 e o contador pula um segundo para cima.
  const ageMs = receivedAt === null ? null : Math.max(0, now - receivedAt);
  const isStale = status === 'online' && ageMs !== null && ageMs > STALE_AFTER_MS;
  const remainingS = telemetry && ageMs !== null
    ? Math.max(0, telemetry.light.remainingS - Math.floor(ageMs / 1000))
    : null;

  return {
    source: config.source,
    wsUrl: config.wsUrl,
    status: isStale ? 'stale' : status,
    telemetry,
    receivedAt,
    ageMs,
    remainingS,
    history,
    events,
  };
}
