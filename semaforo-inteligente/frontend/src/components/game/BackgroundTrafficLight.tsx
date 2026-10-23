import React from 'react';
import type { LightState } from '../../types/traffic';
import redOnImg from '../../assets/game/traffic-light/on/red.png';
import yellowOnImg from '../../assets/game/traffic-light/on/yellow.png';
import greenOnImg from '../../assets/game/traffic-light/on/green.png';
import redOffImg from '../../assets/game/traffic-light/off/red.png';
import yellowOffImg from '../../assets/game/traffic-light/off/yellow.png';
import greenOffImg from '../../assets/game/traffic-light/off/green.png';
import pedestrianLightImg from '../../assets/game/traffic-light/pedestrian/semaforo-pedestre.png';
import { LAMP, PED_LIGHT, TIMER } from './sceneLayout';

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

/** Lâmpadas do semáforo de pedestre, em % da imagem dele (160×284). */
const PED_LAMPS: { lamp: 'RED' | 'GREEN'; top: string }[] = [
  { lamp: 'RED', top: '14.5%' },
  { lamp: 'GREEN', top: '56%' },
];
const PED_LAMP = { left: '23%', size: '54%' } as const;

const fill: React.CSSProperties = { width: '100%', height: '100%', display: 'block' };

/**
 * Uma lâmpada: acesa ganha o brilho; apagada recebe por cima a luz apagada
 * (traffic-light/off). `onImg` é o LED aceso; sem ele, aparece a cor pintada embaixo.
 */
const Lamp: React.FC<{ lamp: LightState; on: boolean; onImg?: string; style: React.CSSProperties }> = ({
  lamp,
  on,
  onImg,
  style,
}) => (
  <div
    aria-hidden
    data-lamp={lamp}
    data-on={on}
    style={{
      position: 'absolute',
      aspectRatio: '1 / 1',
      borderRadius: '50%',
      boxShadow: on ? `0 0 1.2vw 0.35vw ${GLOW[lamp]}` : 'none',
      pointerEvents: 'none',
      ...style,
    }}
  >
    {on ? onImg && <img src={onImg} alt="" className="pixel-art" style={fill} />
      : <img src={OFF_IMG[lamp]} alt="" className="pixel-art" style={fill} />}
  </div>
);

/**
 * Acende os semáforos do poste conforme a cor do ESP32. Sem dados, tudo apagado.
 * - Carros: no desenho as três lâmpadas aparecem coloridas; cada uma recebe por cima
 *   a luz apagada ou, se for a cor atual, o LED aceso (traffic-light/on) com brilho.
 * - Pedestre (logo abaixo): é o inverso dos carros, calculado aqui como no firmware;
 *   boneco verde só com os carros no vermelho. Não passa pelo MQTT nem pelo Node-RED.
 * Coordenadas em % da imagem de fundo (o pai é o palco do cenário).
 */
export const BackgroundTrafficLight: React.FC<{ state: LightState | null; remainingS: number | null }> = ({
  state,
  remainingS,
}) => {
  const pedestrian = state && (state === 'RED' ? 'GREEN' : 'RED');
  return (
    <>
      {LAMPS.map(lamp => (
        <Lamp
          key={lamp}
          lamp={lamp}
          on={lamp === state}
          onImg={ON_IMG[lamp]}
          style={{ left: LAMP.left, top: LAMP.top[lamp], width: LAMP.size, zIndex: 2 }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: PED_LIGHT.left,
          top: PED_LIGHT.top,
          width: PED_LIGHT.width,
          aspectRatio: '160 / 284',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <img src={pedestrianLightImg} alt="Semáforo de pedestre" className="pixel-art" style={fill} />
        {PED_LAMPS.map(({ lamp, top }) => (
          <Lamp
            key={lamp}
            lamp={lamp}
            on={lamp === pedestrian}
            style={{ left: PED_LAMP.left, top, width: PED_LAMP.size }}
          />
        ))}
      </div>

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
};
