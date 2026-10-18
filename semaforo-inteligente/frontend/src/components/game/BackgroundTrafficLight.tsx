import React from 'react';
import type { LightState } from '../../types/traffic';
import redOnImg from '../../assets/game/traffic-light/on/red.png';
import yellowOnImg from '../../assets/game/traffic-light/on/yellow.png';
import greenOnImg from '../../assets/game/traffic-light/on/green.png';
import redOffImg from '../../assets/game/traffic-light/off/red.png';
import yellowOffImg from '../../assets/game/traffic-light/off/yellow.png';
import greenOffImg from '../../assets/game/traffic-light/off/green.png';
import { LAMP, TIMER } from './sceneLayout';

const ON_IMG: Record<LightState, string> = {
  RED: redOnImg,
  YELLOW: yellowOnImg,
  GREEN: greenOnImg,
};

const OFF_IMG: Record<LightState, string> = {
  RED: redOffImg,
  YELLOW: yellowOffImg,
  GREEN: greenOffImg,
};

const GLOW: Record<LightState, string> = {
  RED: 'rgba(255, 77, 94, 0.75)',
  YELLOW: 'rgba(255, 194, 61, 0.75)',
  GREEN: 'rgba(62, 232, 122, 0.75)',
};

const TIMER_COLOR: Record<LightState, string> = {
  RED: 'var(--px-red)',
  YELLOW: 'var(--px-yellow)',
  GREEN: 'var(--px-green)',
};

const LAMPS: LightState[] = ['RED', 'YELLOW', 'GREEN'];

/**
 * Acende o semáforo desenhado no fundo. No desenho as três lâmpadas aparecem
 * coloridas; aqui cada lâmpada recebe por cima a imagem da luz apagada
 * (traffic-light/off) ou, se for a cor atual, o LED aceso (traffic-light/on)
 * com brilho, conforme a telemetria do ESP32. Sem dados, as três ficam apagadas.
 * Coordenadas em % da imagem de fundo (o pai é o palco do cenário).
 */
export const BackgroundTrafficLight: React.FC<{ state: LightState | null; remainingS: number | null }> = ({
  state,
  remainingS,
}) => (
  <>
    {LAMPS.map(lamp => {
      const on = lamp === state;
      return (
        <div
          key={lamp}
          aria-hidden
          data-lamp={lamp}
          data-on={on}
          style={{
            position: 'absolute',
            left: LAMP.left,
            top: LAMP.top[lamp],
            width: LAMP.size,
            aspectRatio: '1 / 1',
            borderRadius: '50%',
            zIndex: 2,
            boxShadow: on ? `0 0 1.2vw 0.35vw ${GLOW[lamp]}` : 'none',
            pointerEvents: 'none',
          }}
        >
          <img
            src={on ? ON_IMG[lamp] : OFF_IMG[lamp]}
            alt={on ? `Luz ${lamp} acesa` : `Luz ${lamp} apagada`}
            className="pixel-art"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      );
    })}

    <div
      style={{
        position: 'absolute',
        left: TIMER.left,
        top: TIMER.top,
        zIndex: 2,
        background: 'var(--px-ink)',
        border: '2px solid #30363d',
        padding: '0.15vw 0.45vw',
        color: state ? TIMER_COLOR[state] : 'var(--px-dim)',
        fontFamily: 'var(--font-title)',
        fontSize: 'max(11px, 0.85vw)',
        lineHeight: 1.3,
        pointerEvents: 'none',
      }}
    >
      {remainingS === null ? '--' : String(remainingS).padStart(2, '0')}s
    </div>
  </>
);
