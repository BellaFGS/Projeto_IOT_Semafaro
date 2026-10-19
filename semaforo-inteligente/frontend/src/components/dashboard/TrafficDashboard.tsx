import React, { useState } from 'react';
import type { TrafficTelemetryState } from '../../hooks';
import type { LightState, TrafficMode } from '../../types/traffic';
import { LightSplitBar, SegmentBar } from './widgets';
import './dashboard.css';

const LIGHT_LABEL: Record<LightState, string> = { RED: 'PARE', YELLOW: 'ATENÇÃO', GREEN: 'SIGA' };
/** Rótulo curto da cor na lista de passagens. */
const LIGHT_SHORT: Record<LightState, string> = { RED: 'VERM.', YELLOW: 'AMAR.', GREEN: 'VERDE' };
const MODE_LABEL: Record<TrafficMode, string> = {
  AUTOMATICO: 'AUTOMÁTICO',
  PEDESTRE: 'PEDESTRE',
  ATENCAO: 'SEM ESP32',
};
const MODE_COLOR: Record<TrafficMode, string> = {
  AUTOMATICO: 'c-cyan',
  PEDESTRE: 'c-violet',
  ATENCAO: 'c-RED',
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const clock = (iso: string | number) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

/**
 * Mini dashboard somente leitura.
 * Semáforo: telemetria do ESP32 (Wokwi → Node-RED). Carros: passagens gravadas no banco
 * (placa + sinal no momento em que passou pelo sensor; vermelho = infração).
 */
export const TrafficDashboard: React.FC<{ feed: TrafficTelemetryState }> = ({ feed }) => {
  const [open, setOpen] = useState(true);
  const { telemetry: t, status, remainingS, ageMs, stats, passages } = feed;

  const light = t?.light.state;
  const dash = '--';
  const lastViolation = passages.find(p => p.violation);
  /** Sem dados do Node-RED: avisa na barra de alertas (o card do semáforo continua com o último estado). */
  const linkAlert = status === 'offline' ? 'Sem conexão com o Node-RED'
    : status === 'stale' ? 'Dados atrasados (sem mensagens há mais de 8 s)'
    : null;
  const violationPct = stats.total ? Math.round((stats.red / stats.total) * 100) : 0;

  return (
    <div className="dash">
      <header className="px-panel dash-bar">
        <div className="dash-brand">
          <div className="dash-logo" aria-hidden>
            {(['RED', 'YELLOW', 'GREEN'] as const).map(c => (
              <span key={c} className={light === c ? `on-${c}` : undefined} />
            ))}
          </div>
          <div>
            <h1 className="px-title">SEMÁFORO<b>.IoT</b></h1>
            <p>Mobilidade urbana · FATEC Sorocaba</p>
          </div>
        </div>

        {/* Alertas ativos do semáforo */}
        <div className="dash-alerts" aria-live="polite">
          <span className="px-title" style={{ fontSize: 11, color: 'var(--px-muted)' }}>ALERTAS</span>
          {linkAlert ? (
            <span className="dash-alert"><i className="bg-RED" /> {linkAlert}</span>
          ) : !t || t.alerts.length === 0 ? (
            <span className="dash-alert"><i className="bg-GREEN" /> {t ? 'Operação normal' : 'Aguardando o ESP32 (Wokwi)'}</span>
          ) : (
            t.alerts.map(a => (
              <span key={a.code} className="dash-alert">
                <i className={`bg-${a.level}`} /> {a.message}
              </span>
            ))
          )}
        </div>

        <button className="dash-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {open ? 'OCULTAR' : 'PAINEL'}
        </button>
      </header>

      {open && (
        <section className="dash-grid">
          {/* Semáforo: estado atual e tempo de cada LED */}
          <article className="px-panel dash-card">
            <h2>
              SEMÁFORO
              {t && <span className={`dash-tag bg-${t.light.state}`}>{LIGHT_LABEL[t.light.state]}</span>}
            </h2>
            <div className={`dash-big ${light ? `c-${light}` : 'c-muted'}`}>
              {remainingS === null ? dash : `${pad2(remainingS)}s`}
              <small>de {t ? `${t.light.durationS}s` : dash}</small>
            </div>
            <SegmentBar value={remainingS ?? 0} max={t?.light.durationS ?? 1} className={`bg-${light ?? 'info'}`} />
            <div className={`px-title ${t ? MODE_COLOR[t.mode] : 'c-muted'}`} style={{ fontSize: 13 }}>
              {t ? MODE_LABEL[t.mode] : dash}
            </div>
            <div className="dash-sub">
              {t?.times
                ? <><span className="c-GREEN">{t.times.verde}s</span> · <span className="c-YELLOW">{t.times.amarelo}s</span> · <span className="c-RED">{t.times.vermelho}s</span> ({t.times.vermelhoPedestre}s c/ pedestre)</>
                : 'Tempos do ESP32: --'}
            </div>
          </article>

          {/* Passagens pelo sensor, por cor do sinal */}
          <article className="px-panel dash-card">
            <h2>PASSAGENS <span>{stats.perMin}/min</span></h2>
            <div className="dash-big">
              {stats.total}
              <small>carros</small>
            </div>
            <LightSplitBar green={stats.green} yellow={stats.yellow} red={stats.red} />
            <div className="dash-sub">
              <span className="c-GREEN">{stats.green} verde</span> · <span className="c-YELLOW">{stats.yellow} amarelo</span> · <span className="c-RED">{stats.red} vermelho</span>
            </div>
          </article>

          {/* Infrações: passaram no vermelho */}
          <article className="px-panel dash-card">
            <h2>INFRAÇÕES <span>no vermelho</span></h2>
            <div className="dash-big c-RED">
              {stats.red}
              <small>multas · {violationPct}%</small>
            </div>
            <div className="dash-sub">
              {lastViolation
                ? <>Última: <span className="c-RED">carro {lastViolation.plate}</span> às {clock(lastViolation.at)}</>
                : 'Nenhuma infração registrada'}
            </div>
          </article>

          {/* Últimas passagens gravadas no banco */}
          <article className="px-panel dash-card">
            <h2>PASSAGENS RECENTES <span>{ageMs === null ? '' : `msg ${(ageMs / 1000).toFixed(1)}s`}</span></h2>
            <ul className="dash-events">
              {passages.length === 0 && <li className="dash-sub px-blink">Aguardando carros…</li>}
              {passages.slice(0, 5).map(p => (
                <li key={p.id} className="dash-pass">
                  <time>{clock(p.at)}</time>
                  <span>Carro {p.plate}</span>
                  <span className={`dash-tag bg-${p.light}`}>{LIGHT_SHORT[p.light]}</span>
                  {p.violation ? <b>MULTA</b> : <span />}
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </div>
  );
};
