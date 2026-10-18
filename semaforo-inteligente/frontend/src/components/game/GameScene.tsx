import React from 'react';
import { useCharacterControl, useTrafficTelemetry } from '../../hooks';
import { TrafficDashboard } from '../dashboard/TrafficDashboard';
import { TrafficLight } from './TrafficLight';
import { Car, CAR_WIDTH, SensorBeam, useCarsFromSensor } from './Car';

import ruaImg from '../../assets/game/cenario/rua.png';

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

const GROUND_HEIGHT = '22%';
/** Início da faixa de pedestres em rua.png (x 86 de 232), em % da largura da tela. */
const CROSSWALK_LEFT = '37.07%';
/** Faixa da pista onde os carros andam (bottom) e teto do carro parado. */
const LANE_BOTTOM = '5%';
const CAR_TOP = `calc(${LANE_BOTTOM} + 50px)`;
/** HC-SR04 no poste do pórtico; o carro para com a frente logo antes da faixa. */
const SENSOR_LEFT = `calc(${CROSSWALK_LEFT} - 30px)`;
const CAR_STOP_LEFT = `calc(${CROSSWALK_LEFT} - ${CAR_WIDTH + 10}px)`;

/**
 * Cenário 2D. O semáforo, o botão de pedestre, o HC-SR04 e os carros só refletem
 * a telemetria recebida (Wokwi via Node-RED, ou a simulação); o personagem é o
 * único elemento controlado pelo usuário.
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
      background: 'var(--px-sky)',
    }}>
      <TrafficDashboard feed={feed} />

      <SensorBeam left={SENSOR_LEFT} ground={GROUND_HEIGHT} carTop={CAR_TOP} detected={vehicleDetected} />

      {cars.map(car => (
        <Car key={car.id} car={car} stopLeft={CAR_STOP_LEFT} bottom={LANE_BOTTOM} onArrivedOrGone={onArrivedOrGone} />
      ))}

      {/* Pórtico: poste plantado na calçada, à esquerda da faixa; o semáforo fica sobre a faixa */}
      <div style={{
        position: 'absolute',
        left: `calc(${CROSSWALK_LEFT} - 40px)`,
        bottom: GROUND_HEIGHT,
        zIndex: 4,
        width: 'min(32vw, 380px)',
        pointerEvents: 'none',
      }}>
        <TrafficLight state={t?.light.state ?? null} remainingTime={feed.remainingS} />
      </div>

      {/* Botão de pedestre na calçada (indicador do botão físico do ESP32) */}
      <div
        title={pedestrianWaiting ? 'Pedestre aguardando travessia' : 'Botão de pedestre'}
        style={{
          position: 'absolute',
          left: `calc(${CROSSWALK_LEFT} - 110px)`,
          bottom: GROUND_HEIGHT,
          zIndex: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{
          width: '20px',
          height: '24px',
          backgroundColor: pedestrianWaiting ? 'var(--px-yellow)' : '#e2e8f0',
          border: '3px solid var(--px-ink)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div
            className={pedestrianWaiting ? 'px-blink' : undefined}
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: pedestrianWaiting ? '#fff' : 'var(--px-red)',
            }}
          />
        </div>
        <div style={{ width: '4px', height: '35px', backgroundColor: '#475569' }} />
      </div>

      {/* Personagem sobre a linha do chão, como no protótipo */}
      <div
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          bottom: GROUND_HEIGHT,
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
            width: '200px',
            height: '200px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.35))',
          }}
        />
      </div>

      {/* Asfalto preto + faixa de pedestres */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: GROUND_HEIGHT,
        backgroundColor: '#000000',
        zIndex: 1,
        overflow: 'hidden',
      }}>
        <img
          src={ruaImg}
          alt="Rua e Faixa de Pedestre"
          className="pixel-art"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            display: 'block',
          }}
        />
      </div>

      <div className="px-panel" style={{
        position: 'absolute',
        bottom: `calc(${GROUND_HEIGHT} + 12px)`,
        right: '16px',
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
