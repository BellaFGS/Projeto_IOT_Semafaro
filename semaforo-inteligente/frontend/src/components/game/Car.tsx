import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carros do cenário, sincronizados com o HC-SR04.
 *
 * O Wokwi não tem um "carro"; quem representa o carro é a distância do sensor.
 * Quando a leitura cai abaixo de 50 cm (vehicleDetected = true) um carro entra
 * pela esquerda e para na faixa, embaixo do sensor. Quando a leitura volta a
 * subir, ele segue viagem. Cada carro que aparece é um carro contado pelo Node-RED.
 */

type Phase = 'spawn' | 'arriving' | 'waiting' | 'leaving';

export interface CarState {
  id: number;
  color: string;
  phase: Phase;
}

const CAR_COLORS = ['#ff4d5e', '#55d6ff', '#ffc23d', '#b48cff', '#3ee87a', '#f6f0d8'];

export function useCarsFromSensor(vehicleDetected: boolean) {
  const [cars, setCars] = useState<CarState[]>([]);
  const wasDetected = useRef(false);
  const nextId = useRef(1);

  useEffect(() => {
    if (vehicleDetected && !wasDetected.current) {
      const id = nextId.current++;
      const color = CAR_COLORS[id % CAR_COLORS.length];
      // Um carro que ainda estivesse parado segue viagem para dar lugar ao novo.
      setCars(list => [
        ...list.map(c => (c.phase === 'leaving' ? c : { ...c, phase: 'leaving' as const })),
        { id, color, phase: 'spawn' },
      ]);
      // Dois frames: o carro nasce fora da tela e só depois anima até a faixa.
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setCars(list => list.map(c => (c.id === id && c.phase === 'spawn' ? { ...c, phase: 'arriving' } : c))),
        ),
      );
    }
    if (!vehicleDetected && wasDetected.current) {
      setCars(list => list.map(c => (c.phase === 'leaving' ? c : { ...c, phase: 'leaving' })));
    }
    wasDetected.current = vehicleDetected;
  }, [vehicleDetected]);

  const onArrivedOrGone = useCallback((id: number) => {
    setCars(list =>
      list.flatMap(c => {
        if (c.id !== id) return [c];
        if (c.phase === 'leaving') return [];
        if (c.phase === 'arriving') return [{ ...c, phase: 'waiting' as const }];
        return [c];
      }),
    );
  }, []);

  return { cars, onArrivedOrGone };
}

/** Carro em pixel art (grade 32×14), farol à direita; ocupa a largura do contêiner. */
const CarSprite: React.FC<{ color: string }> = ({ color }) => (
  <svg width="100%" viewBox="0 0 32 14" shapeRendering="crispEdges" style={{ display: 'block' }} aria-hidden>
    {/* cabine */}
    <rect x="9" y="1" width="14" height="5" fill={color} />
    <rect x="10" y="2" width="5" height="4" fill="#bfefff" />
    <rect x="17" y="2" width="5" height="4" fill="#bfefff" />
    <rect x="16" y="2" width="1" height="4" fill="#0b0d1a" opacity="0.35" />
    {/* carroceria */}
    <rect x="2" y="6" width="28" height="5" fill={color} />
    <rect x="2" y="10" width="28" height="1" fill="#0b0d1a" opacity="0.35" />
    <rect x="1" y="7" width="1" height="1" fill="#ff4d5e" />
    <rect x="1" y="8" width="1" height="3" fill="#2a2f55" />
    <rect x="30" y="7" width="1" height="1" fill="#ffe08a" />
    <rect x="30" y="8" width="1" height="3" fill="#2a2f55" />
    <rect x="16" y="7" width="2" height="1" fill="#0b0d1a" opacity="0.4" />
    {/* rodas */}
    <rect x="6" y="9" width="5" height="5" fill="#0b0d1a" />
    <rect x="7" y="10" width="3" height="3" fill="#7d84b8" />
    <rect x="21" y="9" width="5" height="5" fill="#0b0d1a" />
    <rect x="22" y="10" width="3" height="3" fill="#7d84b8" />
  </svg>
);

const TRANSITION: Record<Phase, string> = {
  spawn: 'none',
  arriving: 'left 1.4s cubic-bezier(0.2, 0.7, 0.3, 1)',
  waiting: 'none',
  leaving: 'left 2.2s cubic-bezier(0.6, 0, 0.9, 0.6)',
};

export const Car: React.FC<{
  car: CarState;
  /** Largura do carro (CSS, em % do cenário). */
  width: string;
  /** `left` (CSS) onde o carro para, com a frente antes do cruzamento. */
  stopLeft: string;
  bottom: string;
  onArrivedOrGone: (id: number) => void;
}> = ({ car, width, stopLeft, bottom, onArrivedOrGone }) => {
  const left =
    car.phase === 'spawn' ? `calc(-1 * ${width} - 2%)`
      : car.phase === 'leaving' ? '104%'
        : stopLeft;
  const moving = car.phase === 'arriving' || car.phase === 'leaving';

  return (
    <div
      onTransitionEnd={e => {
        if (e.propertyName === 'left') onArrivedOrGone(car.id);
      }}
      style={{
        position: 'absolute',
        left,
        bottom,
        width,
        zIndex: 3,
        transition: TRANSITION[car.phase],
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.45))',
      }}
    >
      <div className={moving ? 'px-bounce' : undefined}>
        <CarSprite color={car.color} />
      </div>
    </div>
  );
};

/**
 * HC-SR04 preso no poste do semáforo, com o feixe até a pista.
 * O feixe acende quando o sensor detecta um carro.
 * Posições medidas do topo do cenário (em %).
 */
export const SensorBeam: React.FC<{
  left: string;
  /** Topo da caixa do sensor. */
  top: string;
  /** Teto do carro parado, onde o feixe termina. */
  carTop: string;
  detected: boolean;
}> = ({ left, top, carTop, detected }) => (
  <>
    <div
      title="HC-SR04 — sensor ultrassônico que conta os carros"
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}
    >
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
    <div
      aria-hidden
      className={detected ? 'px-blink' : undefined}
      style={{
        position: 'absolute',
        left,
        top: `calc(${top} + 40px)`,
        height: `calc(${carTop} - ${top} - 40px)`,
        width: 4,
        transform: 'translateX(-50%)',
        zIndex: 2,
        background: detected
          ? 'repeating-linear-gradient(to bottom, var(--px-yellow) 0 6px, transparent 6px 10px)'
          : 'repeating-linear-gradient(to bottom, rgba(85,214,255,0.55) 0 4px, transparent 4px 10px)',
        pointerEvents: 'none',
      }}
    />
  </>
);
