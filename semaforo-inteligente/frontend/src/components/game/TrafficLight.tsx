import React from 'react';
import type { LightState } from '../../types/traffic';
import semaforoImg from '../../assets/game/trafficlight/semaforo.png';
import redLedImg from '../../assets/game/trafficlight/red.png';
import yellowLedImg from '../../assets/game/trafficlight/yellow.png';
import greenLedImg from '../../assets/game/trafficlight/green.png';

interface TrafficLightProps {
  state: LightState;
  remainingTime: number;
}

export const TrafficLight: React.FC<TrafficLightProps> = ({ state, remainingTime }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Placa do Contador Regressivo no Topo */}
      <div style={{
        background: '#0d1117',
        border: '2px solid #30363d',
        borderRadius: '6px',
        padding: '3px 10px',
        marginBottom: '6px',
        color: state === 'RED' ? '#ff4d4d' : state === 'YELLOW' ? '#ffcc00' : '#00e676',
        fontFamily: 'monospace',
        fontSize: '18px',
        fontWeight: 'bold',
        textShadow: '0 0 8px currentColor',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      }}>
        {remainingTime < 10 ? `0${remainingTime}` : remainingTime}s
      </div>

      {/* Semáforo com imagem PNG de base */}
      <div style={{
        position: 'relative',
        width: '64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Imagem base do semáforo (LEDs desligados) */}
        <img
          src={semaforoImg}
          alt="Semáforo"
          style={{
            width: '64px',
            height: 'auto',
            display: 'block',
          }}
        />

        {/* LED Vermelho - posicionado sobre a luz vermelha da imagem */}
        {state === 'RED' && (
          <img
            src={redLedImg}
            alt="LED Vermelho"
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '42px',
              height: '42px',
              display: 'block',
            }}
          />
        )}

        {/* LED Amarelo - posicionado sobre a luz amarela da imagem */}
        {state === 'YELLOW' && (
          <img
            src={yellowLedImg}
            alt="LED Amarelo"
            style={{
              position: 'absolute',
              top: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '42px',
              height: '42px',
              display: 'block',
            }}
          />
        )}

        {/* LED Verde - posicionado sobre a luz verde da imagem */}
        {state === 'GREEN' && (
          <img
            src={greenLedImg}
            alt="LED Verde"
            style={{
              position: 'absolute',
              top: '72px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '42px',
              height: '42px',
              display: 'block',
            }}
          />
        )}
      </div>

      {/* Poste de sustentação */}
      <div style={{
        width: '12px',
        height: '95px',
        backgroundColor: '#30363d',
        boxShadow: 'inset 2px 0 0 #484f58, 2px 0 6px rgba(0,0,0,0.4)',
      }} />

      {/* Base do poste */}
      <div style={{
        width: '32px',
        height: '8px',
        backgroundColor: '#21262d',
        borderRadius: '3px 3px 0 0',
      }} />
    </div>
  );
};
