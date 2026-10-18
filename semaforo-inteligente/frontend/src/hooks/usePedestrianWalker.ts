import { useEffect, useRef, useState } from 'react';
import type { LightState } from '../types/traffic';

/**
 * Pedestre automático da calçada (só ambientação, sem controle do usuário).
 *
 * Anda de um lado para o outro na calçada da frente. Ao chegar na beira da rua do
 * meio, espera o sinal dos carros ficar vermelho para atravessar a faixa — por isso
 * o clique no botão de pedestre do poste faz ele atravessar mais cedo.
 * Posições em px da imagem de fundo (3072×2048).
 */

const SPEED = 150;
const FRAME_MS = 115;
const TOTAL_FRAMES = 10;
const MIN_X = 260;
const MAX_X = 2850;
/** Beiras da rua do meio na altura da calçada (meio-fio em y ≈ 1700: x 1247–1931). */
const CURB_LEFT = 1205;
const CURB_RIGHT = 1975;
const TURN_PAUSE_S = 1.5;

export interface PedestrianState {
  x: number;
  facing: 'left' | 'right';
  frame: number;
}

export function usePedestrianWalker(light: LightState | null): PedestrianState {
  const [state, setState] = useState<PedestrianState>({ x: 420, facing: 'right', frame: 1 });
  const lightRef = useRef(light);
  lightRef.current = light;

  useEffect(() => {
    let x = 420;
    let dir: 1 | -1 = 1;
    let frame = 1;
    let frameClock = 0;
    let pause = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      let walking = true;
      if (pause > 0) {
        pause -= dt;
        walking = false;
      } else {
        const next = x + dir * SPEED * dt;
        // Parado na beira da faixa até o sinal dos carros fechar.
        const reachesCrossing = dir === 1
          ? x <= CURB_LEFT && next > CURB_LEFT
          : x >= CURB_RIGHT && next < CURB_RIGHT;
        if (reachesCrossing && lightRef.current !== 'RED') {
          x = dir === 1 ? CURB_LEFT : CURB_RIGHT;
          walking = false;
        } else {
          x = next;
        }
        if (x >= MAX_X || x <= MIN_X) {
          x = Math.min(MAX_X, Math.max(MIN_X, x));
          dir = dir === 1 ? -1 : 1;
          pause = TURN_PAUSE_S;
        }
      }

      if (walking) {
        frameClock += dt * 1000;
        if (frameClock >= FRAME_MS) {
          frameClock = 0;
          frame = frame >= TOTAL_FRAMES ? 1 : frame + 1;
        }
      } else {
        frame = 1;
      }

      setState(prev =>
        prev.x === x && prev.frame === frame && prev.facing === (dir === 1 ? 'right' : 'left')
          ? prev
          : { x, frame, facing: dir === 1 ? 'right' : 'left' },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return state;
}
