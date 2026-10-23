import { useEffect, useState } from 'react';

/**
 * Pedestre da calçada, controlado pelo usuário no teclado.
 *
 * ← / → (ou A / D) andam pela calçada da frente; soltando a tecla ele para.
 * Atravessar a rua do meio é decisão do usuário: o certo é pedir a travessia no
 * botão do poste e esperar o sinal dos carros ficar vermelho.
 * Posições em px da imagem de fundo (3072×2048).
 */

const SPEED = 150;
const FRAME_MS = 115;
const TOTAL_FRAMES = 10;
const MIN_X = 260;
const MAX_X = 2850;

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

export interface PedestrianState {
  x: number;
  facing: 'left' | 'right';
  frame: number;
}

export function usePedestrianControl(): PedestrianState {
  const [state, setState] = useState<PedestrianState>({ x: 420, facing: 'right', frame: 1 });

  useEffect(() => {
    const held = { left: false, right: false };
    const setKey = (e: KeyboardEvent, down: boolean) => {
      if (LEFT_KEYS.has(e.key)) held.left = down;
      else if (RIGHT_KEYS.has(e.key)) held.right = down;
      else return;
      e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => setKey(e, true);
    const onUp = (e: KeyboardEvent) => setKey(e, false);
    // Janela perdeu o foco com a tecla apertada: sem isso ele andaria sozinho.
    const onBlur = () => { held.left = false; held.right = false; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);

    let x = 420;
    let facing: PedestrianState['facing'] = 'right';
    let frame = 1;
    let frameClock = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (dir !== 0) facing = dir === 1 ? 'right' : 'left';
      const next = Math.min(MAX_X, Math.max(MIN_X, x + dir * SPEED * dt));
      const walking = next !== x;
      x = next;

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
        prev.x === x && prev.frame === frame && prev.facing === facing ? prev : { x, frame, facing },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return state;
}
