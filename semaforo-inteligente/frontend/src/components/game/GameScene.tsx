import React from 'react';
import { useCharacterControl, useTrafficTelemetry } from '../../hooks';
import { TrafficDashboard } from '../dashboard/TrafficDashboard';
import { BackgroundTrafficLight } from './BackgroundTrafficLight';
import { Car, SensorBeam, useCarsFromSensor } from './Car';
import { CAR, CHARACTER_HEIGHT, PED_BUTTON, SENSOR, SIDEWALK_FEET_BOTTOM } from './sceneLayout';

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

/**
 * Cenário 2D sobre a ilustração `rua-melhorada.webp`.
 *
 * A imagem fica num "palco" 3:2 que cobre a tela, alinhado por baixo para a
 * calçada e a rua principal aparecerem sempre (corta o céu se precisar). Tudo o
 * que fica por cima é posicionado em % da imagem (ver sceneLayout.ts):
 * o semáforo da esquina acende conforme a telemetria, o botão de pedestre do
 * poste pisca no pedido de travessia, o HC-SR04 e os carros refletem o sensor.
 * O personagem é o único elemento controlado pelo usuário.
 */
export const GameScene: React.FC = () => {
  const { position, currentFrame, facing } = useCharacterControl();
  const feed = useTrafficTelemetry();
  const t = feed.telemetry;
  const pedestrianWaiting = t?.sensors.pedestrianRequest ?? false;
  const vehicleDetected = t?.sensors.vehicleDetected ?? false;
  const { cars, onArrivedOrGone } = useCarsFromSensor(vehicleDetected);

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
        <BackgroundTrafficLight state={t?.light.state ?? null} remainingS={feed.remainingS} />

        {/* Botão de pedestre do poste: pisca quando há pedido de travessia */}
        <div
          title={pedestrianWaiting ? 'Pedestre aguardando travessia' : 'Botão de pedestre'}
          className={pedestrianWaiting ? 'px-blink' : undefined}
          style={{
            position: 'absolute',
            left: PED_BUTTON.left,
            top: PED_BUTTON.top,
            width: PED_BUTTON.width,
            height: PED_BUTTON.height,
            zIndex: 2,
            outline: pedestrianWaiting ? '3px solid var(--px-yellow)' : 'none',
            background: pedestrianWaiting ? 'rgba(255, 194, 61, 0.55)' : 'transparent',
            boxShadow: pedestrianWaiting ? '0 0 14px 4px rgba(255, 194, 61, 0.7)' : 'none',
          }}
        />

        <SensorBeam left={SENSOR.left} top={SENSOR.top} carTop={CAR.top} detected={vehicleDetected} />

        {cars.map(car => (
          <Car
            key={car.id}
            car={car}
            width={CAR.width}
            stopLeft={CAR.stopLeft}
            bottom={CAR.bottom}
            onArrivedOrGone={onArrivedOrGone}
          />
        ))}

        {/* Personagem andando na calçada da frente */}
        <div
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            bottom: SIDEWALK_FEET_BOTTOM,
            height: `${CHARACTER_HEIGHT * 100}%`,
            aspectRatio: '1 / 1',
            zIndex: 5,
            transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
            transformOrigin: 'bottom center',
            transition: 'transform 0.1s ease',
            pointerEvents: 'none',
          }}
        >
          <img
            src={playerSprites[currentFrame - 1]}
            alt={`Player Frame ${currentFrame}`}
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
        zIndex: 10,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        Mover personagem: <b style={{ color: 'var(--px-text)' }}>← →</b> ou <b style={{ color: 'var(--px-text)' }}>A / D</b>
      </div>
    </div>
  );
};
