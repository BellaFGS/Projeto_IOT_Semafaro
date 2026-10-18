import React, { useState } from 'react';
import type { TrafficTelemetryState } from '../../hooks';
import { WOKWI_PINS } from '../../services/telemetry/config';
import { HEAVY_FLOW_PER_MIN, DETECTION_CM } from '../../services/telemetry/nodeRedRules';
import type { LightState, TrafficMode } from '../../types/traffic';
import { BarChart, LedTrio, RssiBars, SegmentBar, StepChart } from './widgets';
import './dashboard.css';

const LIGHT_LABEL: Record<LightState, string> = { RED: 'PARE', YELLOW: 'ATENÇÃO', GREEN: 'SIGA' };
const MODE_LABEL: Record<TrafficMode, string> = {
  AUTOMATICO: 'AUTOMÁTICO',
  PEDESTRE: 'PEDESTRE',
  FLUXO_INTENSO: 'FLUXO INTENSO',
  ATENCAO: 'ATENÇÃO',
};
const MODE_COLOR: Record<TrafficMode, string> = {
  AUTOMATICO: 'c-cyan',
  PEDESTRE: 'c-violet',
  FLUXO_INTENSO: 'c-YELLOW',
  ATENCAO: 'c-RED',
};
const MODE_HINT: Record<TrafficMode, string> = {
  AUTOMATICO: 'Ciclo padrão',
  PEDESTRE: 'Verde encurtado p/ travessia',
  FLUXO_INTENSO: 'Verde estendido pelo Node-RED',
  ATENCAO: 'Sem comunicação com o ESP32',
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const uptime = (s: number) => `${Math.floor(s / 3600)}h${pad2(Math.floor((s % 3600) / 60))}m`;

/**
 * Mini dashboard somente leitura. Tudo o que aparece vem da telemetria
 * (simulada ou do Node-RED); nada aqui altera o semáforo.
 */
export const TrafficDashboard: React.FC<{ feed: TrafficTelemetryState }> = ({ feed }) => {
  const [open, setOpen] = useState(true);
  const { telemetry: t, status, history, events, remainingS, ageMs } = feed;

  const deviceUp = status === 'online' && t?.device.online !== false;

  const light = t?.light.state;
  const dash = '--';

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

        {/* Alertas ativos, calculados pelas regras do Node-RED */}
        <div className="dash-alerts" aria-live="polite">
          <span className="px-title" style={{ fontSize: 11, color: 'var(--px-muted)' }}>ALERTAS</span>
          {!t || t.alerts.length === 0 ? (
            <span className="dash-alert"><i className="bg-GREEN" /> {t ? 'Operação normal' : 'Sem dados ainda'}</span>
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
        <>
          <section className="dash-grid">
            {/* Semáforo: estado, tempo restante e modo decidido pelo Node-RED */}
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
              <div className="dash-sub">{t ? MODE_HINT[t.mode] : 'Aguardando dados'}</div>
            </article>

            {/* Sensor ultrassônico */}
            <article className="px-panel dash-card">
              <h2>DISTÂNCIA <span>{'<'}{DETECTION_CM}cm = carro</span></h2>
              <div className="dash-big c-cyan">
                {t ? t.sensors.ultrasonicCm.toFixed(1) : dash}
                <small>cm</small>
              </div>
              <div className={`dash-sub ${t?.sensors.vehicleDetected ? 'c-YELLOW' : ''}`}>
                {t ? (t.sensors.vehicleDetected ? 'Carro na faixa' : 'Via livre') : 'Aguardando leitura'}
              </div>
              <StepChart
                values={history.map(h => h.distanceCm)}
                max={400}
                threshold={DETECTION_CM}
                color="var(--px-cyan)"
                label="Histórico da distância"
              />
            </article>

            {/* Fluxo de veículos */}
            <article className="px-panel dash-card">
              <h2>FLUXO <span>intenso ≥{HEAVY_FLOW_PER_MIN}/min</span></h2>
              <div className="dash-big">
                {t ? t.flow.vehicleCount : dash}
                <small>carros</small>
              </div>
              <div className={`dash-sub ${t && t.flow.vehiclesPerMin >= HEAVY_FLOW_PER_MIN ? 'c-YELLOW' : ''}`}>
                {t ? `${t.flow.vehiclesPerMin} carros/min` : 'Aguardando leitura'}
              </div>
              <BarChart
                values={history.slice(-30).map(h => h.vehiclesPerMin)}
                max={HEAVY_FLOW_PER_MIN + 4}
                threshold={HEAVY_FLOW_PER_MIN}
                label="Carros por minuto"
              />
            </article>

            {/* Os 3 componentes do circuito no Wokwi, com os pinos do ESP32 */}
            <article className="px-panel dash-card">
              <h2>
                CIRCUITO WOKWI
                <span className={`dash-tag ${deviceUp ? 'bg-GREEN' : 'bg-RED'}`}>{deviceUp ? 'ON' : 'OFF'}</span>
              </h2>
              <div className="dash-pin">
                <span>LEDs <em>{WOKWI_PINS.ledRed}/{WOKWI_PINS.ledYellow}/{WOKWI_PINS.ledGreen}</em></span>
                <LedTrio
                  compact
                  red={t?.actuators.ledRed ?? false}
                  yellow={t?.actuators.ledYellow ?? false}
                  green={t?.actuators.ledGreen ?? false}
                />
              </div>
              <div className="dash-pin">
                <span>Botão <em>{WOKWI_PINS.button}</em></span>
                <span className={`dash-tag ${t?.sensors.pedestrianRequest ? 'bg-info px-blink' : ''}`}>
                  {t?.sensors.pedestrianRequest ? 'PEDIDO' : 'SOLTO'}
                </span>
              </div>
              <div className="dash-pin">
                <span>HC-SR04 <em>{WOKWI_PINS.ultrasonicTrig}/{WOKWI_PINS.ultrasonicEcho}</em></span>
                <span className="c-cyan">{t ? `${t.sensors.ultrasonicCm.toFixed(0)} cm` : dash}</span>
              </div>
              <div className="dash-pin">
                <span>Wi-Fi <em>{t ? `${t.device.wifiRssi}dBm · ${uptime(t.device.uptimeS)}` : dash}</em></span>
                {t && <RssiBars dbm={t.device.wifiRssi} />}
              </div>
            </article>

            {/* Histórico de eventos */}
            <article className="px-panel dash-card">
              <h2>HISTÓRICO <span>{ageMs === null ? '' : `msg ${(ageMs / 1000).toFixed(1)}s`}</span></h2>
              <ul className="dash-events">
                {events.length === 0 && <li className="dash-sub px-blink">Aguardando eventos…</li>}
                {events.slice(0, 5).map(e => (
                  <li key={e.id} className="dash-event">
                    <i className={`bg-${e.level}`} />
                    <time>{clock(e.at)}</time>
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      )}
    </div>
  );
};
