import type { AlertLevel } from '../../types/traffic';

/**
 * Histórico gravado no SQLite, lido pela API HTTP do Node-RED.
 * Usado para o dashboard abrir já com os últimos eventos e o gráfico preenchidos.
 */

export interface StoredEvent {
  at: number;
  level: AlertLevel;
  message: string;
}

export interface StoredReading {
  at: number;
  distanceCm: number;
  vehiclesPerMin: number;
}

interface EventRow {
  registrado_em: string;
  nivel: string;
  mensagem: string;
}

interface ReadingRow {
  registrado_em: string;
  distancia_cm: number;
  carros_por_min: number;
}

const LEVELS: readonly AlertLevel[] = ['info', 'warning', 'critical'];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchStoredEvents(httpUrl: string, limit: number): Promise<StoredEvent[]> {
  const rows = await getJson<EventRow[]>(`${httpUrl}/api/eventos?limite=${limit}`);
  return rows.map(r => ({
    at: Date.parse(r.registrado_em),
    level: LEVELS.includes(r.nivel as AlertLevel) ? (r.nivel as AlertLevel) : 'info',
    message: r.mensagem,
  }));
}

export async function fetchStoredReadings(httpUrl: string, limit: number): Promise<StoredReading[]> {
  const rows = await getJson<ReadingRow[]>(`${httpUrl}/api/leituras?limite=${limit}`);
  return rows.map(r => ({
    at: Date.parse(r.registrado_em),
    distanceCm: Number(r.distancia_cm),
    vehiclesPerMin: Number(r.carros_por_min),
  }));
}
