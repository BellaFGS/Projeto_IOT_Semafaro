import React from 'react';
import type { TrafficData } from '../../types/traffic';

interface IoTMetricsHUDProps {
  data: TrafficData;
  onSimulateVehicle: () => void;
  onRequestPedestrian: () => void;
  onToggleLightState: () => void;
}

export const IoTMetricsHUD: React.FC<IoTMetricsHUDProps> = ({
  data,
  onSimulateVehicle,
  onRequestPedestrian,
  onToggleLightState,
}) => {
  const lightColors = {
    RED: '#ff3344',
    YELLOW: '#ffbb00',
    GREEN: '#00e676',
  };

  const lightLabels = {
    RED: 'PARE (Vermelho)',
    YELLOW: 'ATENÇÃO (Amarelo)',
    GREEN: 'SIGA (Verde)',
  };

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      right: '16px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
    }}>
      {/* Top Header Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🚦</span>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
              Semáforo Inteligente IoT
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
              Dashboard de Mobilidade Urbana • FATEC Sorocaba
            </p>
          </div>
        </div>

        {/* Status de Conexão e Modo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }} />
            <span style={{ fontSize: '12px', color: '#a7f3d0', fontWeight: 'bold' }}>
              MQTT CONECTADO
            </span>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            color: '#93c5fd',
            fontWeight: '600',
          }}>
            MODO: {data.mode}
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais (Conforme o README.md) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        pointerEvents: 'auto',
      }}>
        {/* 1. Estado Atual dos Semáforos */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Estado do Semáforo
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginTop: '4px',
            color: lightColors[data.lightState],
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: lightColors[data.lightState],
              boxShadow: `0 0 10px ${lightColors[data.lightState]}`,
            }} />
            {lightLabels[data.lightState]}
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
            Tempo restante: <b>{data.remainingTime}s</b>
          </div>
        </div>

        {/* 2. Fluxo e Contagem de Veículos */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Fluxo de Veículos
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
            {data.vehicleCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#94a3b8' }}>veículos</span>
          </div>
          <div style={{ fontSize: '12px', color: data.vehicleDetected ? '#f97316' : '#64748b', marginTop: '4px' }}>
            {data.vehicleDetected ? '🚗 Veículo na faixa de espera' : '🛣️ Via desimpedida'}
          </div>
        </div>

        {/* 3. Sensor Ultrassônico (HC-SR04) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sensor Ultrassônico (HC-SR04)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#facc15', marginTop: '2px' }}>
            {data.ultrasonicDistanceCm.toFixed(1)} <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#94a3b8' }}>cm</span>
          </div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
            {data.ultrasonicDistanceCm < 30 ? '⚠️ Veículo muito próximo' : 'Normal'}
          </div>
        </div>

        {/* 4. Atuador Servo Motor (Cancela) */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Servo Motor (Cancela)
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginTop: '4px',
            color: data.servoAngle > 30 ? '#4ade80' : '#f87171',
          }}>
            {data.servoAngle > 30 ? 'ABERTA (90°)' : 'FECHADA (0°)'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Ângulo do servo: {data.servoAngle}°
          </div>
        </div>
      </div>

      {/* Barra de Alertas e Controles Interativos de Teste */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        pointerEvents: 'auto',
      }}>
        {/* Alerta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
          <span style={{ fontSize: '16px' }}>{data.alert ? '⚠️' : '✅'}</span>
          <span style={{ fontSize: '13px', color: data.alert ? '#fef08a' : '#94a3b8' }}>
            {data.alert || 'Sistema operacional. Fluxo de tráfego regular.'}
          </span>
        </div>

        {/* Botoes de Acao / Simulacao para Apresentacao */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={onSimulateVehicle}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            🚗 Simular Veículo (HC-SR04)
          </button>

          <button
            onClick={onRequestPedestrian}
            style={{
              background: data.pedestrianRequested ? '#ea580c' : '#475569',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            🔘 {data.pedestrianRequested ? 'Pedestre Aguardando!' : 'Pressionar Botão Pedestre'}
          </button>

          <button
            onClick={onToggleLightState}
            style={{
              background: '#334155',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🔄 Alternar Sinal
          </button>
        </div>
      </div>
    </div>
  );
};
