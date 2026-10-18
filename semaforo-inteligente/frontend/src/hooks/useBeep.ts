import { useCallback, useEffect, useRef } from 'react';

/**
 * Apito do sensor gerado com Web Audio, sem arquivo de som.
 * `beep(false)`: dois bipes agudos (passagem normal).
 * `beep(true)`: três bipes graves (passou no vermelho, infração).
 * O navegador só libera áudio depois de um clique ou tecla; o primeiro gesto destrava o som.
 */
export function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      ctxRef.current ??= new AudioContext();
      if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);

  return useCallback((violation = false) => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime;
    const offsets = violation ? [0, 0.18, 0.36] : [0, 0.16];
    const freq = violation ? 880 : 1760;
    offsets.forEach(offset => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, start + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start + offset);
      osc.stop(start + offset + 0.13);
    });
  }, []);
}
