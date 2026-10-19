import React from 'react';

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
