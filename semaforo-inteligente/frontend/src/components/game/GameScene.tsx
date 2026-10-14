import React, { useState, useEffect, useCallback } from 'react';
import { useCharacterControl } from '../../hooks';
import type { TrafficData, LightState } from '../../types/traffic';
import { IoTMetricsHUD } from '../dashboard/IoTMetricsHUD';
import { TrafficLight } from './TrafficLight';
import { ServoBarrier } from './ServoBarrier';

// Importar sprites do player
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

const INITIAL_TRAFFIC: TrafficData = {
  lightState: 'GREEN',
  remainingTime: 12,
  vehicleDetected: false,
  vehicleCount: 14,
  ultrasonicDistanceCm: 145.2,
  pedestrianRequested: false,
  servoAngle: 90, // Aberta quando verde
  mode: 'AUTOMATICO',
  alert: null,
};

export const GameScene: React.FC = () => {
  const { position, currentFrame, facing } = useCharacterControl();
  const [traffic, setTraffic] = useState<TrafficData>(INITIAL_TRAFFIC);

  // Ciclo automatico do semaforo inteligente
  useEffect(() => {
    const timer = setInterval(() => {
      setTraffic(prev => {
        if (prev.remainingTime > 1) {
          return { ...prev, remainingTime: prev.remainingTime - 1 };
        }

        // Transicao de estados
        let nextState: LightState = 'GREEN';
        let nextDuration = 12;
        let nextServo = 90;
        let nextMode: 'AUTOMATICO' | 'PEDESTRE' | 'ATENCAO' = 'AUTOMATICO';
        let alert: string | null = null;

        if (prev.lightState === 'GREEN') {
          nextState = 'YELLOW';
          nextDuration = 3;
          nextServo = 90;
          alert = 'Sinal mudando para Amarelo. Reduza a velocidade!';
        } else if (prev.lightState === 'YELLOW') {
          nextState = 'RED';
          nextDuration = prev.pedestrianRequested ? 10 : 8;
          nextServo = 0; // Fecha cancela
          alert = prev.pedestrianRequested ? 'Travessia de pedestres liberada!' : 'Sinal vermelho. Veículos parados.';
        } else {
          // RED -> GREEN
          nextState = 'GREEN';
          // Se tiver veículo acumulado detectado no sensor, estende o tempo verde!
          nextDuration = prev.vehicleDetected ? 16 : 12;
          nextServo = 90; // Abre cancela
          nextMode = 'AUTOMATICO';
          alert = prev.vehicleDetected ? 'Fluxo intenso detectado: tempo verde estendido.' : null;
        }

        return {
          ...prev,
          lightState: nextState,
          remainingTime: nextDuration,
          servoAngle: nextServo,
          pedestrianRequested: nextState === 'RED' ? false : prev.pedestrianRequested,
          mode: nextMode,
          alert,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Simular deteccao de veiculo (sensor ultrassonico HC-SR04)
  const handleSimulateVehicle = useCallback(() => {
    setTraffic(prev => {
      const isDetected = !prev.vehicleDetected;
      const dist = isDetected ? 18.4 : 160.0;
      return {
        ...prev,
        vehicleDetected: isDetected,
        vehicleCount: isDetected ? prev.vehicleCount + 1 : prev.vehicleCount,
        ultrasonicDistanceCm: dist,
        alert: isDetected ? 'HC-SR04: Veículo detectado a 18.4 cm!' : null,
      };
    });
  }, []);

  // Pressionar botao de pedestre
  const handleRequestPedestrian = useCallback(() => {
    setTraffic(prev => ({
      ...prev,
      pedestrianRequested: true,
      alert: 'Botão de pedestre pressionado! O sinal fechará em breve.',
    }));
  }, []);

  // Alternar sinal manualmente
  const handleToggleLight = useCallback(() => {
    setTraffic(prev => {
      const order: LightState[] = ['GREEN', 'YELLOW', 'RED'];
      const nextIdx = (order.indexOf(prev.lightState) + 1) % order.length;
      const nextState = order[nextIdx];
      return {
        ...prev,
        lightState: nextState,
        remainingTime: nextState === 'YELLOW' ? 3 : nextState === 'RED' ? 10 : 15,
        servoAngle: nextState === 'RED' ? 0 : 90,
        mode: 'ATENCAO',
        alert: `Sinal alterado manualmente para ${nextState}`,
      };
    });
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(to bottom, #090d16 0%, #172554 45%, #1e293b 80%)',
    }}>
      {/* HUD IoT Superior com metricas e controles */}
      <IoTMetricsHUD
        data={traffic}
        onSimulateVehicle={handleSimulateVehicle}
        onRequestPedestrian={handleRequestPedestrian}
        onToggleLightState={handleToggleLight}
      />

      {/* Silhueta da Cidade / Prédios no Fundo */}
      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: 0,
        width: '100%',
        height: '180px',
        opacity: 0.35,
        pointerEvents: 'none',
        background: `
          linear-gradient(to top, rgba(15,23,42,1), transparent 90%),
          repeating-linear-gradient(90deg, #1e293b 0px, #1e293b 45px, transparent 45px, transparent 60px, #0f172a 60px, #0f172a 120px)
        `,
      }} />

      {/* Meio-Fio / Calçada onde o pedestre caminha */}
      <div style={{
        position: 'absolute',
        bottom: '30%',
        left: 0,
        width: '100%',
        height: '24px',
        backgroundColor: '#64748b',
        borderTop: '3px solid #94a3b8',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        zIndex: 2,
      }} />

      {/* Pista / Asfalto em Pixel Art */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '30%',
        backgroundColor: '#1f242d',
        borderTop: '4px solid #334155',
        zIndex: 1,
      }}>
        {/* Linhas pontilhadas do asfalto */}
        <div style={{
          position: 'absolute',
          top: '45%',
          left: 0,
          width: '100%',
          height: '6px',
          background: 'repeating-linear-gradient(90deg, #facc15 0px, #facc15 35px, transparent 35px, transparent 70px)',
          opacity: 0.8,
        }} />

        {/* Faixa de Pedestres Zebrada */}
        <div style={{
          position: 'absolute',
          left: '320px',
          top: 0,
          width: '140px',
          height: '100%',
          background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.85) 0px, rgba(255,255,255,0.85) 18px, transparent 18px, transparent 36px)',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Semáforo Inteligente (posicionado ao lado da faixa) */}
      <div style={{
        position: 'absolute',
        left: '240px',
        bottom: '30%',
        zIndex: 4,
      }}>
        <TrafficLight
          state={traffic.lightState}
          remainingTime={traffic.remainingTime}
        />
      </div>

      {/* Cancela / Servo Motor (posicionado no bordo da via) */}
      <div style={{
        position: 'absolute',
        left: '490px',
        bottom: '30%',
        zIndex: 4,
      }}>
        <ServoBarrier isOpen={traffic.servoAngle > 30} />
      </div>

      {/* Botão de Pedestre Físico Simulado na Calçada */}
      <div
        onClick={handleRequestPedestrian}
        title="Clique para acionar o botão de pedestre"
        style={{
          position: 'absolute',
          left: '200px',
          bottom: '31%',
          zIndex: 4,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div style={{
          width: '20px',
          height: '24px',
          backgroundColor: traffic.pedestrianRequested ? '#f97316' : '#e2e8f0',
          border: '2px solid #0f172a',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: traffic.pedestrianRequested ? '0 0 10px #f97316' : '0 2px 5px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: traffic.pedestrianRequested ? '#fff' : '#ef4444',
          }} />
        </div>
        <div style={{ width: '4px', height: '35px', backgroundColor: '#475569' }} />
      </div>

      {/* Personagem Pixel Art (Player) */}
      <div
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          bottom: '29.5%',
          zIndex: 5,
          transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          transition: 'transform 0.1s ease',
          pointerEvents: 'none',
        }}
      >
        <img
          src={playerSprites[currentFrame - 1]}
          alt={`Player Frame ${currentFrame}`}
          className="pixel-art"
          style={{
            width: '64px',
            height: '96px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.5))',
          }}
        />
      </div>

      {/* Dica de Controle do Personagem na Parte Inferior */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '6px 16px',
        fontSize: '12px',
        color: '#cbd5e1',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>🕹️</span>
        <span>Controles: <b>← →</b> ou <b>A / D</b> para mover o personagem</span>
      </div>
    </div>
  );
};
