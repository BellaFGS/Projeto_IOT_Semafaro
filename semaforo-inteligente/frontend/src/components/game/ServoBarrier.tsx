import React from 'react';

interface ServoBarrierProps {
  isOpen: boolean;
}

export const ServoBarrier: React.FC<ServoBarrierProps> = ({ isOpen }) => {
  return (
    <div style={{
      position: 'relative',
      width: '160px',
      height: '110px',
      display: 'flex',
      alignItems: 'flex-end',
    }}>
      {/* Base da Cancela / Motor Servo */}
      <div style={{
        width: '32px',
        height: '60px',
        backgroundColor: '#ff9800',
        borderRadius: '6px 6px 0 0',
        border: '3px solid #b26a00',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#333',
          border: '2px solid #fff',
        }} />
        <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>SERVO</span>
      </div>

      {/* Haste da Cancela (Barra listrada branca e vermelha) */}
      <div style={{
        position: 'absolute',
        bottom: '38px',
        left: '20px',
        width: '130px',
        height: '10px',
        borderRadius: '3px',
        background: 'repeating-linear-gradient(45deg, #ffffff, #ffffff 12px, #ff1744 12px, #ff1744 24px)',
        border: '1.5px solid #b71c1c',
        transformOrigin: '5px 5px',
        transform: isOpen ? 'rotate(-75deg)' : 'rotate(0deg)',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 3,
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      }} />
    </div>
  );
};
