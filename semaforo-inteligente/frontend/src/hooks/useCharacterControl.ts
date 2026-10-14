import { useState, useCallback, useEffect, useRef } from 'react';

export interface CharacterPosition {
  x: number;
}

export type FacingDirection = 'left' | 'right';

interface UseCharacterControlResult {
  position: CharacterPosition;
  currentFrame: number;
  isMoving: boolean;
  facing: FacingDirection;
  moveLeft: () => void;
  moveRight: () => void;
  resetPosition: () => void;
}

const INITIAL_POSITION: CharacterPosition = { x: 80 };
const MOVE_SPEED = 3;
const TOTAL_FRAMES = 10;
const FRAME_DURATION = 115; // ms por frame da caminhada (sincronizado com o passo mais calmo)

export function useCharacterControl(): UseCharacterControlResult {
  const [position, setPosition] = useState<CharacterPosition>(INITIAL_POSITION);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState<FacingDirection>('right');
  const [activeDirection, setActiveDirection] = useState<FacingDirection | null>(null);

  const animationIntervalRef = useRef<number | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());

  const moveLeft = useCallback(() => {
    setPosition(prev => ({
      x: Math.max(-50, prev.x - MOVE_SPEED),
    }));
  }, []);

  const moveRight = useCallback(() => {
    setPosition(prev => ({
      x: Math.min(window.innerWidth - 190, prev.x + MOVE_SPEED),
    }));
  }, []);

  const resetPosition = useCallback(() => {
    setPosition(INITIAL_POSITION);
    setCurrentFrame(1);
    setFacing('right');
    setActiveDirection(null);
  }, []);

  const startAnimation = useCallback(() => {
    if (animationIntervalRef.current) return;
    setIsMoving(true);

    animationIntervalRef.current = window.setInterval(() => {
      setCurrentFrame(prev => (prev >= TOTAL_FRAMES ? 1 : prev + 1));
    }, FRAME_DURATION);
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setIsMoving(false);
    setCurrentFrame(1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignora se estiver digitando em um input
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
        return;
      }

      keysPressedRef.current.add(event.key.toLowerCase());

      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        setActiveDirection('left');
        setFacing('left');
        startAnimation();
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        setActiveDirection('right');
        setFacing('right');
        startAnimation();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressedRef.current.delete(event.key.toLowerCase());

      const leftPressed = keysPressedRef.current.has('arrowleft') || keysPressedRef.current.has('a');
      const rightPressed = keysPressedRef.current.has('arrowright') || keysPressedRef.current.has('d');

      if (leftPressed && !rightPressed) {
        setActiveDirection('left');
        setFacing('left');
      } else if (rightPressed && !leftPressed) {
        setActiveDirection('right');
        setFacing('right');
      } else {
        setActiveDirection(null);
        stopAnimation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [startAnimation, stopAnimation]);

  // Loop de movimentacao suave (~60fps)
  useEffect(() => {
    if (!activeDirection) return;

    const interval = setInterval(() => {
      if (activeDirection === 'left') {
        moveLeft();
      } else if (activeDirection === 'right') {
        moveRight();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [activeDirection, moveLeft, moveRight]);

  return {
    position,
    currentFrame,
    isMoving,
    facing,
    moveLeft,
    moveRight,
    resetPosition,
  };
}
