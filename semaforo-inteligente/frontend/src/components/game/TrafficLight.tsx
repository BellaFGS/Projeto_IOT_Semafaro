import React from 'react';
import type { LightState } from '../../types/traffic';
import semaforoImg from '../../assets/game/trafficlight/semaforo.png';
import redLedImg from '../../assets/game/trafficlight/red.png';
import yellowLedImg from '../../assets/game/trafficlight/yellow.png';
import greenLedImg from '../../assets/game/trafficlight/green.png';

interface TrafficLightProps {
  /** null enquanto não chegou nenhuma telemetria: todas as lâmpadas apagadas. */
  state: LightState | null;
  remainingTime: number | null;
}

const TIMER_COLOR: Record<LightState, string> = {
  RED: '#ff4d4d',
  YELLOW: '#ffcc00',
  GREEN: '#00e676',
};

const LED_IMG: Record<LightState, string> = {
  RED: redLedImg,
  YELLOW: yellowLedImg,
  GREEN: greenLedImg,
};

/*
 * Lâmpadas apagadas no sprite (940x727): x 842–884, y 76 / 128 / 180, 43px.
 * Valores em % do sprite para o LED aceso acompanhar o tamanho renderizado.
 */
const LED_LEFT = `${(842 / 940) * 100}%`;
const LED_SIZE = `${(43 / 940) * 100}%`;
const LED_TOP: Record<LightState, string> = {
  RED: `${(76 / 727) * 100}%`,
  YELLOW: `${(128 / 727) * 100}%`,
  GREEN: `${(180 / 727) * 100}%`,
};

export const TrafficLight: React.FC<TrafficLightProps> = ({ state, remainingTime }) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      lineHeight: 0,
    }}>
      <img
        src={semaforoImg}
        alt="Semáforo e placa Cuidado Pedestres"
        className="pixel-art"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      />

      {/* LED aceso sobre a lâmpada apagada correspondente */}
      {state && <img
        src={LED_IMG[state]}
        alt={`Luz ${state}`}
        className="pixel-art"
        style={{
          position: 'absolute',
          left: LED_LEFT,
          top: LED_TOP[state],
          width: LED_SIZE,
          height: 'auto',
          display: 'block',
          pointerEvents: 'none',
        }}
      />}

      <div style={{
        position: 'absolute',
        left: '72%',
        top: '3%',
        background: '#0d1117',
        border: '2px solid #30363d',
        borderRadius: '4px',
        padding: '1px 6px',
        color: state ? TIMER_COLOR[state] : '#5d6496',
        fontFamily: 'var(--font-title)',
        fontSize: '13px',
        lineHeight: 1.3,
        pointerEvents: 'none',
      }}>
        {remainingTime === null ? '--' : String(remainingTime).padStart(2, '0')}s
      </div>
    </div>
  );
};
