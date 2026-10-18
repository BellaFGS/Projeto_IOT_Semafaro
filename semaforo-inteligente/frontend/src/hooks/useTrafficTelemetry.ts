import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTelemetrySource,
  fetchStoredPassages,
  readTelemetryConfig,
  STALE_AFTER_MS,
  type DeviceCommand,
  type TelemetryConnection,
} from '../services/telemetry';
import type {
  ConnectionStatus,
  DataSourceKind,
  Passage,
  PassageEvent,
  PassageStats,
  TrafficTelemetry,
} from '../types/traffic';

const RECENT_PASSAGES = 8;
const EMPTY_STATS: PassageStats = { total: 0, green: 0, yellow: 0, red: 0, perMin: 0 };

export interface TrafficTelemetryState {
  source: DataSourceKind;
  wsUrl: string;
  status: ConnectionStatus;
  /** Sistema 1: estado do semáforo vindo do ESP32. */
  telemetry: TrafficTelemetry | null;
  receivedAt: number | null;
  /** Tempo desde a última mensagem do semáforo. */
  ageMs: number | null;
  /** Segundos restantes do sinal, como publicados pelo ESP32. */
  remainingS: number | null;
  /** Sistema 2: totais do banco de passagens. */
  stats: PassageStats;
  /** Últimas passagens gravadas, mais recente primeiro. */
  passages: Passage[];
  /** Última passagem confirmada pelo Node-RED (muda a cada carro gravado). */
  lastPassageEvent: PassageEvent | null;
  /** Envia um comando ao Node-RED (clique no botão de pedestre, passagem de carro). */
  sendCommand: (command: DeviceCommand) => void;
}

const addPassage = (list: Passage[], p: Passage) =>
  [p, ...list.filter(x => x.id !== p.id)].slice(0, RECENT_PASSAGES);

/** Assina a fonte de dados configurada e mantém o estado do dashboard. */
export function useTrafficTelemetry(): TrafficTelemetryState {
  const config = useMemo(readTelemetryConfig, []);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [telemetry, setTelemetry] = useState<TrafficTelemetry | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [stats, setStats] = useState<PassageStats>(EMPTY_STATS);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [lastPassageEvent, setLastPassageEvent] = useState<PassageEvent | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const connectionRef = useRef<TelemetryConnection | null>(null);
  const sendCommand = useCallback((command: DeviceCommand) => connectionRef.current?.send(command), []);

  useEffect(() => {
    const connection = createTelemetrySource(config)({
      onStatus: setStatus,
      onTelemetry: next => {
        setTelemetry(next);
        setReceivedAt(Date.now());
        // A telemetria também traz os totais do banco (útil ao abrir a página).
        setStats(next.passages);
        if (next.lastPassage) {
          const last = next.lastPassage;
          setPassages(list => (list.some(p => p.id === last.id) ? list : addPassage(list, last)));
        }
      },
      onPassage: event => {
        setStats(event.stats);
        setPassages(list => addPassage(list, event.passage));
        setLastPassageEvent(event);
      },
    });
    connectionRef.current = connection;
    return () => {
      connectionRef.current = null;
      connection.stop();
    };
  }, [config]);

  // Com dados reais, abre já com as últimas passagens gravadas no banco.
  useEffect(() => {
    if (config.source !== 'websocket') return;
    let cancelled = false;
    fetchStoredPassages(config.httpUrl, RECENT_PASSAGES)
      .then(stored => {
        if (cancelled) return;
        setPassages(list => {
          const ids = new Set(list.map(p => p.id));
          return [...list, ...stored.filter(p => !ids.has(p.id))]
            .sort((a, b) => b.id - a.id)
            .slice(0, RECENT_PASSAGES);
        });
      })
      .catch(err => console.warn('[passagens] API do Node-RED indisponível:', err.message));
    return () => {
      cancelled = true;
    };
  }, [config]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  // `now` só anda a cada 250 ms, então pode ficar atrás de `receivedAt`.
  const ageMs = receivedAt === null ? null : Math.max(0, now - receivedAt);
  const isStale = status === 'online' && ageMs !== null && ageMs > STALE_AFTER_MS;
  // O contador mostra exatamente o que o ESP32 publicou. Sem adiantar localmente:
  // no Wokwi a simulação pode rodar abaixo do tempo real (ex.: 25%).
  const remainingS = telemetry ? telemetry.light.remainingS : null;

  return {
    source: config.source,
    wsUrl: config.wsUrl,
    status: isStale ? 'stale' : status,
    telemetry,
    receivedAt,
    ageMs,
    remainingS,
    stats,
    passages,
    lastPassageEvent,
    sendCommand,
  };
}
