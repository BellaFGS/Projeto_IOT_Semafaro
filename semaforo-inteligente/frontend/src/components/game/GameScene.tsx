import React, { useCallback, useEffect, useState } from 'react';
import { useBeep, usePedestrianControl, useTrafficTelemetry } from '../../hooks';
import type { LightState } from '../../types/traffic';
import { TrafficDashboard } from '../dashboard/TrafficDashboard';
import { BackgroundTrafficLight } from './BackgroundTrafficLight';
import { CHARACTER_HEIGHT, PED_BUTTON, SIDEWALK_FEET_BOTTOM, SIDEWALK_FEET_Y } from './sceneLayout';
import { pctX } from './traffic/roadGeometry';
import { TrafficCars, UltrasonicSensor } from './traffic/TrafficCars';
import { useTrafficSystem } from './traffic/useTrafficSystem';

import fundoImg from '../../assets/game/backgrounds/rua-melhorada.webp';

import player1 from '../../assets/game/character/player1.png';
import player2 from '../../assets/game/character/player2.png';
import player3 from '../../assets/game/character/player3.png';
import player4 from '../../assets/game/character/player4.png';
import player5 from '../../assets/game/character/player5.png';
import player6 from '../../assets/game/character/player6.png';
import player7 from '../../assets/game/character/player7.png';
import player8 from '../../assets/game/character/player8.png';
import player9 from '../../assets/game/character/player9.png';
import player10 from '../../assets/game/character/player10.png';

const playerSprites = [
  player1, player2, player3, player4, player5,
  player6, player7, player8, player9, player10
];

/** Ordem de desenho pela base (px da imagem): quem está mais perto da câmera fica na frente. */
const zFor = (y: number) => Math.round(y / 10);
/** Largura do quadro do pedestre em px da imagem (quadro quadrado, CHARACTER_HEIGHT da altura). */
const PEDESTRIAN_FRAME = CHARACTER_HEIGHT * 2048;
const BUBBLE_MS = 1600;

/**
 * Cena do dashboard sobre a ilustração `rua-melhorada.webp`.
 *
 * Sistema 1 — semáforo: as luzes da imagem seguem o ESP32 (Wokwi → MQTT → Node-RED →
 *   WebSocket). O botão de pedestre do poste é clicado com o mouse e vai ao ESP32.
 * Sistema 2 — carros: useTrafficSystem obedece a cor recebida; quando um carro cruza
 *   o sensor, o dashboard avisa o Node-RED, que grava a passagem (placa + sinal) no
 *   banco e devolve a confirmação — aí o sensor apita e mostra o balão (multa no vermelho).
 * O pedestre da calçada é controlado pelo usuário no teclado (← → ou A/D).
 */
export const GameScene: React.FC = () => {
  const feed = useTrafficTelemetry();
  const { sendCommand, lastPassageEvent } = feed;
  const t = feed.telemetry;
  const light: LightState | null = t?.light.state ?? null;
  const pedestrianWaiting = t?.pedestrianRequest ?? false;

  const beep = useBeep();
  const pedestrian = usePedestrianControl();
  const [bubble, setBubble] = useState<{ text: string; violation: boolean } | null>(null);
  const [buttonFlash, setButtonFlash] = useState(false);

  // Carro cruzou a linha do sensor → Node-RED grava no banco.
  const onPassage = useCallback((plate: string, lightNow: LightState | null) => {
    sendCommand({ type: 'passagem', placa: plate, sinal: lightNow });
  }, [sendCommand]);
  const { cars, sensorBusy } = useTrafficSystem(light, onPassage);

  // Confirmação da passagem gravada: apito + balão no sensor.
  useEffect(() => {
    if (!lastPassageEvent) return;
    const { plate, violation } = lastPassageEvent.passage;
    beep(violation);
    setBubble({ text: violation ? `MULTA! CARRO ${plate}` : `CARRO ${plate}`, violation });
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [lastPassageEvent, beep]);

  const pressPedestrianButton = useCallback(() => {
    sendCommand({ type: 'botao_virtual' });
    setButtonFlash(true);
    window.setTimeout(() => setButtonFlash(false), 350);
  }, [sendCommand]);

  const buttonLit = pedestrianWaiting || buttonFlash;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: '#4a8fd1',
    }}>
      {/* Palco: a imagem de fundo e tudo que se alinha a ela */}
      <div style={{
        position: 'absolute',
        left: '50%',
        bottom: 0,
        width: 'max(100vw, 150vh)',
        aspectRatio: '3 / 2',
        transform: 'translateX(-50%)',
        backgroundImage: `url(${fundoImg})`,
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
      }}>
        <BackgroundTrafficLight state={light} remainingS={feed.remainingS} />

        {/* Botão de pedestre do poste: clique pede a travessia; pisca enquanto o pedido está ativo */}
        <button
          type="button"
          onClick={pressPedestrianButton}
          title={pedestrianWaiting ? 'Pedestre aguardando travessia' : 'Clique para pedir a travessia'}
          aria-label="Botão de pedestre"
          className={pedestrianWaiting ? 'px-blink' : undefined}
          style={{
            position: 'absolute',
            left: PED_BUTTON.left,
            top: PED_BUTTON.top,
            width: PED_BUTTON.width,
            height: PED_BUTTON.height,
            zIndex: 400,
            padding: 0,
            border: 'none',
            cursor: 'pointer',
            outline: buttonLit ? '3px solid var(--px-yellow)' : '2px dashed rgba(246, 240, 216, 0.55)',
            outlineOffset: 2,
            background: buttonLit ? 'rgba(255, 194, 61, 0.55)' : 'transparent',
            boxShadow: buttonLit ? '0 0 14px 4px rgba(255, 194, 61, 0.7)' : 'none',
          }}
        />

        <UltrasonicSensor detected={sensorBusy} bubble={bubble?.text ?? null} violation={bubble?.violation ?? false} />
        <TrafficCars cars={cars} zFor={zFor} />

        {/* Pedestre da calçada, controlado no teclado */}
        <div
          style={{
            position: 'absolute',
            left: pctX(pedestrian.x - PEDESTRIAN_FRAME / 2),
            bottom: SIDEWALK_FEET_BOTTOM,
            height: `${CHARACTER_HEIGHT * 100}%`,
            aspectRatio: '1 / 1',
            zIndex: zFor(SIDEWALK_FEET_Y),
            transform: pedestrian.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
            transformOrigin: 'bottom center',
            pointerEvents: 'none',
          }}
        >
          <img
            src={playerSprites[pedestrian.frame - 1]}
            alt=""
            className="pixel-art"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom',
              display: 'block',
              filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.35))',
            }}
          />
        </div>
      </div>

      <TrafficDashboard feed={feed} />

      <div className="px-panel" style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        padding: '6px 14px',
        fontSize: '15px',
        color: 'var(--px-muted)',
        zIndex: 1000,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        <b style={{ color: 'var(--px-text)' }}>← →</b> movem o pedestre · clique no <b style={{ color: 'var(--px-text)' }}>botão do poste</b> para pedir a travessia
      </div>
    </div>
  );
};
