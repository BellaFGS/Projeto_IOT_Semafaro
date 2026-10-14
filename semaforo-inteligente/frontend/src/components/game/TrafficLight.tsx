import React from 'react';
import type { LightState } from '../../types/traffic';

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

      {/* Caixa do Semáforo */}
      <div style={{
        width: '64px',
        background: '#1a1d24',
        border: '3px solid #2d333b',
        borderRadius: '16px',
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      }}>
        {/* Luz Vermelha */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: state === 'RED' ? '#ff2a2a' : '#3a1212',
          border: '2px solid ' + (state === 'RED' ? '#ff6b6b' : '#220000'),
          boxShadow: state === 'RED' ? '0 0 20px #ff2a2a, inset 0 0 10px #ffffff' : 'none',
          transition: 'all 0.25s ease',
        }} />

        {/* Luz Amarela */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: state === 'YELLOW' ? '#ffd000' : '#3d3200',
          border: '2px solid ' + (state === 'YELLOW' ? '#ffe666' : '#261f00'),
          boxShadow: state === 'YELLOW' ? '0 0 20px #ffd000, inset 0 0 10px #ffffff' : 'none',
          transition: 'all 0.25s ease',
        }} />

        {/* Luz Verde */}
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: state === 'GREEN' ? '#00e676' : '#043015',
          border: '2px solid ' + (state === 'GREEN' ? '#69f0ae' : '#011c0c'),
          boxShadow: state === 'GREEN' ? '0 0 20px #00e676, inset 0 0 10px #ffffff' : 'none',
          transition: 'all 0.25s ease',
        }} />
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
