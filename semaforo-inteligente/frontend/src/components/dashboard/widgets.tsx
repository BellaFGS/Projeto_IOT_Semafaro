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

/** Barra única dividida pela quantidade de passagens em cada cor do sinal. */
export const LightSplitBar: React.FC<{ green: number; yellow: number; red: number }> = ({ green, yellow, red }) => {
  const total = green + yellow + red;
  const parts: [string, number][] = [['bg-GREEN', green], ['bg-YELLOW', yellow], ['bg-RED', red]];
  return (
    <div className="px-split" role="img" aria-label={`Verde ${green}, amarelo ${yellow}, vermelho ${red}`}>
      {total === 0
        ? <span className="px-split-empty" />
        : parts.filter(([, n]) => n > 0).map(([cls, n]) => <span key={cls} className={cls} style={{ flexGrow: n }} />)}
    </div>
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
