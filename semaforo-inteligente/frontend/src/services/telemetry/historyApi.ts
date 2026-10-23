import type { LightState, Passage } from '../../types/traffic';

/**
 * Passagens gravadas no SQLite, lidas pela API HTTP do Node-RED.
 * Usado para o dashboard abrir já com as últimas passagens no histórico.
 */

interface PassageRow {
  id: number;
  registrado_em: string;
  placa: string;
  sinal: string;
}

const FROM_PT: Record<string, LightState> = { VERDE: 'GREEN', AMARELO: 'YELLOW', VERMELHO: 'RED' };

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json() as Promise<T>;
}

/** Últimas passagens, mais recente primeiro. */
export async function fetchStoredPassages(httpUrl: string, limit: number): Promise<Passage[]> {
  const rows = await getJson<PassageRow[]>(`${httpUrl}/api/passagens?limite=${limit}`);
  return rows
    .filter(r => FROM_PT[r.sinal])
    .map(r => ({
      id: Number(r.id),
      at: r.registrado_em,
      plate: String(r.placa),
      light: FROM_PT[r.sinal],
      violation: r.sinal === 'VERMELHO',
    }));
}
