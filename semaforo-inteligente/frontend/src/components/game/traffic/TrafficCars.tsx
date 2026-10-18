import React from 'react';
import carFrontImg from '../../../assets/game/vehicles/car-front.png';
import carBackImg from '../../../assets/game/vehicles/car-back.png';
import carSideImg from '../../../assets/game/vehicles/car-side.png';
import { pctFromBottom, pctX, SENSOR_BEAM_END, SENSOR_POS } from './roadGeometry';
import { spriteHeight, type CarSprite, type RenderCar } from './useTrafficSystem';

const SPRITES: Record<CarSprite, string> = {
  front: carFrontImg,
  back: carBackImg,
  side: carSideImg,
};

/**
 * Onde fica a placa em cada sprite (fração da caixa do sprite). De frente e de costas
 * ela cobre a placa desenhada no para-choque; de lado vira uma etiqueta no teto.
 */
const PLATE_BOX: Record<CarSprite, { left: number; top: number; width: number }> = {
  front: { left: 0.4, top: 0.71, width: 0.21 },
  back: { left: 0.4, top: 0.585, width: 0.22 },
  side: { left: 0.46, top: -0.32, width: 0.1 },
};

/** Placa estilo Mercosul (faixa azul + número). SVG para escalar junto com o carro. */
const Plate: React.FC<{ plate: string; sprite: CarSprite }> = ({ plate, sprite }) => {
  const box = PLATE_BOX[sprite];
  return (
    <svg
      viewBox="0 0 30 15"
      shapeRendering="crispEdges"
      aria-label={`Placa ${plate}`}
      style={{
        position: 'absolute',
        left: `${box.left * 100}%`,
        top: `${box.top * 100}%`,
        width: `${box.width * 100}%`,
        overflow: 'visible',
      }}
    >
      <rect x="0" y="0" width="30" height="15" fill="#f6f0d8" stroke="#0b0d1a" strokeWidth="1.5" />
      <rect x="0.75" y="0.75" width="28.5" height="3.5" fill="#2f6fd6" />
      <text
        x="15"
        y="13.4"
        textAnchor="middle"
        fontFamily="Silkscreen, monospace"
        fontSize="10"
        fill="#0b0d1a"
      >
        {plate}
      </text>
    </svg>
  );
};

/**
 * Carros do minigame. Posições em px da imagem de fundo convertidas para % do palco;
 * a ordem de desenho segue a base do carro (mais perto da câmera fica na frente).
 * `zFor` permite intercalar com o personagem, que fica na calçada.
 */
export const TrafficCars: React.FC<{ cars: RenderCar[]; zFor: (y: number) => number }> = ({ cars, zFor }) => (
  <>
    {cars.map(car => (
      <div
        key={car.id}
        style={{
          position: 'absolute',
          left: pctX(car.x - car.width / 2),
          bottom: pctFromBottom(car.y),
          width: pctX(car.width),
          aspectRatio: `${car.width} / ${spriteHeight(car.sprite, car.width)}`,
          opacity: car.opacity,
          zIndex: zFor(car.y),
          pointerEvents: 'none',
        }}
      >
        <img
          src={SPRITES[car.sprite]}
          alt={`Carro ${car.plate}`}
          className="pixel-art"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            filter: 'drop-shadow(0 0.25vw 0.15vw rgba(0,0,0,0.45))',
          }}
        />
        <Plate plate={car.plate} sprite={car.sprite} />
      </div>
    ))}
  </>
);

/**
 * HC-SR04 preso no poste do semáforo, com o feixe atravessando a rua do meio
 * na altura da faixa de pedestres. O feixe acende enquanto um carro passa; o balão
 * aparece quando o Node-RED confirma a passagem gravada (com o apito).
 */
export const UltrasonicSensor: React.FC<{
  detected: boolean;
  /** Texto do balão da última passagem confirmada (null = sem balão). */
  bubble: string | null;
  violation: boolean;
}> = ({ detected, bubble, violation }) => (
  <>
    <svg
      viewBox="0 0 3072 2048"
      preserveAspectRatio="none"
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }}
    >
      <line
        x1={SENSOR_POS.x + 30}
        y1={SENSOR_POS.y + 18}
        x2={SENSOR_BEAM_END.x}
        y2={SENSOR_BEAM_END.y}
        stroke={detected ? '#ffc23d' : 'rgba(85, 214, 255, 0.55)'}
        strokeWidth={detected ? 9 : 6}
        strokeDasharray={detected ? '28 16' : '14 18'}
        className={detected ? 'px-beam-on' : undefined}
      />
    </svg>

    <div
      title="HC-SR04: sensor ultrassônico que conta os carros"
      style={{
        position: 'absolute',
        left: pctX(SENSOR_POS.x),
        top: `${(SENSOR_POS.y / 2048) * 100}%`,
        transform: 'translate(-50%, -100%)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {bubble && (
        <span key={bubble} className="px-bip" style={{
          fontFamily: 'var(--font-title)',
          fontSize: 'max(11px, 0.8vw)',
          lineHeight: 1,
          padding: '3px 5px',
          whiteSpace: 'nowrap',
          color: violation ? 'var(--px-text)' : 'var(--px-ink)',
          background: violation ? 'var(--px-red)' : 'var(--px-yellow)',
          border: '2px solid var(--px-ink)',
        }}>
          {bubble}
        </span>
      )}
      <span style={{
        fontFamily: 'var(--font-title)',
        fontSize: 9,
        lineHeight: 1,
        padding: '2px 3px',
        color: 'var(--px-ink)',
        background: 'var(--px-text)',
        border: '2px solid var(--px-ink)',
      }}>
        HC-SR04
      </span>
      <div style={{
        display: 'flex',
        gap: 3,
        padding: '3px 4px',
        background: '#2f6fd6',
        border: '2px solid var(--px-ink)',
      }}>
        {[0, 1].map(i => (
          <span key={i} style={{
            width: 10,
            height: 10,
            background: detected ? 'var(--px-yellow)' : '#c9cde6',
            border: '2px solid var(--px-ink)',
          }} />
        ))}
      </div>
    </div>
  </>
);
