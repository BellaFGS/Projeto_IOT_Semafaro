import React from 'react';
import type { LightState } from '../../types/traffic';

/** Barra de progresso em blocos. */
export const SegmentBar: React.FC<{ value: number; max: number; className: string; segments?: number }> = ({
  value,
  max,
  className,
  segments = 16,
}) => {
  const lit = max > 0 ? Math.round((value / max) * segments) : 0;
  return (
    <div className="px-segments" aria-hidden>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={i < lit ? className : undefined} />
      ))}
    </div>
  );
};

/** Estado dos três LEDs (atuadores) do ESP32. */
export const LedTrio: React.FC<{ red: boolean; yellow: boolean; green: boolean; compact?: boolean }> = ({
  red,
  yellow,
  green,
  compact = false,
}) => {
  const leds: [LightState, boolean, string][] = [
    ['RED', red, 'R'],
    ['YELLOW', yellow, 'Y'],
    ['GREEN', green, 'G'],
  ];
  return (
    <div className="px-leds">
      {leds.map(([color, on, label]) => (
        <span key={color} className={`px-led ${color}${on ? ' on' : ''}`} title={`LED ${label}`}>
          <i />{!compact && ` LED ${label}`}
        </span>
      ))}
    </div>
  );
};

const CHART_W = 120;
const CHART_H = 40;

/** Linha em degraus (estilo 8-bit) com linha de limiar opcional. */
export const StepChart: React.FC<{
  values: number[];
  max: number;
  color: string;
  threshold?: number;
  label: string;
}> = ({ values, max, color, threshold, label }) => {
  const step = CHART_W / Math.max(values.length - 1, 1);
  const y = (v: number) => Math.round(CHART_H - 2 - (Math.min(v, max) / max) * (CHART_H - 4));
  let d = '';
  values.forEach((v, i) => {
    const x = Math.round(i * step);
    d += i === 0 ? `M${x} ${y(v)}` : `H${x} V${y(v)}`;
  });

  return (
    <svg className="px-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {threshold !== undefined && (
        <line x1={0} x2={CHART_W} y1={y(threshold)} y2={y(threshold)} stroke="var(--px-red)" strokeDasharray="3 3" strokeWidth={1} />
      )}
      {values.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
};

/** Colunas por amostra, destacando as que passam do limiar. */
export const BarChart: React.FC<{ values: number[]; max: number; threshold: number; label: string }> = ({
  values,
  max,
  threshold,
  label,
}) => {
  const n = Math.max(values.length, 1);
  const w = CHART_W / n;
  const top = Math.max(max, ...values);
  return (
    <svg className="px-chart" viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" role="img" aria-label={label}>
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / top) * (CHART_H - 2)));
        return (
          <rect
            key={i}
            x={i * w}
            y={CHART_H - h}
            width={Math.max(w - 1, 1)}
            height={h}
            fill={v >= threshold ? 'var(--px-yellow)' : 'var(--px-cyan)'}
          />
        );
      })}
      <line x1={0} x2={CHART_W} y1={CHART_H - (threshold / top) * (CHART_H - 2)} y2={CHART_H - (threshold / top) * (CHART_H - 2)} stroke="var(--px-red)" strokeDasharray="3 3" strokeWidth={1} />
    </svg>
  );
};

/** Intensidade do Wi-Fi em quatro barras. */
export const RssiBars: React.FC<{ dbm: number }> = ({ dbm }) => {
  const bars = dbm >= -55 ? 4 : dbm >= -65 ? 3 : dbm >= -75 ? 2 : dbm >= -85 ? 1 : 0;
  return (
    <div className={`px-rssi${bars <= 1 ? ' weak' : ''}`} aria-label={`${dbm} dBm`}>
      {[4, 7, 10, 14].map((h, i) => (
        <span key={h} className={i < bars ? 'on' : undefined} style={{ height: h }} />
      ))}
    </div>
  );
};
