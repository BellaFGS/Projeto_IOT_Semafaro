import { useEffect, useRef, useState } from 'react';
import type { LightState } from '../../../types/traffic';
import {
  B_TURN_X,
  B_WAIT_X,
  carWidthAt,
  D_HORIZON,
  D_TURN,
  laneX,
  MAIN_ROAD_Y,
  SENSOR_ZONE,
  SIDE_CAR_LENGTH,
  SPRITE_RATIO,
  TURN_Y,
  yAtDepth,
} from './roadGeometry';

/**
 * Sistema dos carros (independente do semáforo: só lê a cor que o ESP32 publica).
 *
 * Rota A (desce): nasce pequena no fundo da rua do meio, na faixa da esquerda,
 *   vem crescendo (sprite de frente), para na linha de parada no vermelho/amarelo,
 *   cruza a faixa de pedestres no verde e vira à direita dela (esquerda da tela)
 *   entrando na rua principal com o sprite lateral.
 * Rota B (sobe): vem pela rua principal pela direita (sprite lateral), espera o verde,
 *   vira à direita dela para a rua do meio e vai embora pela faixa da direita
 *   (sprite de costas), diminuindo até sumir no fundo.
 *
 * Cada carro tem placa 1, 2 ou 3. De tempos em tempos um carro fura o vermelho.
 * Quando um carro cruza a linha do HC-SR04 (faixa de pedestres), `onPassage` é
 * chamado uma vez com a placa e a cor do sinal naquele instante.
 */

type Route = 'A' | 'B';
type Phase = 'approach' | 'cross' | 'merge' | 'exit' | 'enter' | 'turn' | 'away';
export type CarSprite = 'front' | 'back' | 'side';

const PLATES = ['1', '2', '3'] as const;

interface SimCar {
  id: number;
  plate: string;
  route: Route;
  phase: Phase;
  /** Fura o sinal vermelho (gera infração). */
  runner: boolean;
  /** Já passou pelo sensor (passagem avisada). */
  counted: boolean;
  /** Profundidade na rua do meio (1 = linha de parada). */
  d: number;
  /** Posição na imagem (centro do carro, base dos pneus). */
  x: number;
  y: number;
  /** Fator de velocidade 0..1 (acelera e freia suave). */
  v: number;
  /** Tempo na fase atual (s). */
  t: number;
  /**
   * Decisão tomada uma vez quando o sinal fecha: true = já estava perto e segue,
   * false = para. Volta a undefined no verde.
   */
  go?: boolean;
}

export interface RenderCar {
  id: number;
  plate: string;
  sprite: CarSprite;
  /** Centro e base do carro, em px da imagem. */
  x: number;
  y: number;
  width: number;
  opacity: number;
}

/** Velocidades "devagar": profundidade por segundo e px da imagem por segundo. */
const V_DEPTH = 0.3;
const V_ROAD = 240;
const ACCEL = 1.6;
/** Distância mínima entre carros na mesma rota. */
const GAP_DEPTH = 0.55;
const GAP_ROAD = SIDE_CAR_LENGTH + 80;
/** Quanto tempo dura a curva (troca de sprite com deslize). */
const MERGE_S = 0.7;
const TURN_S = 0.6;
const SPAWN_MIN_S = 5;
const SPAWN_MAX_S = 9;
/** Um a cada N carros fura o vermelho. */
const RUNNER_EVERY = 4;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => k * k * (3 - 2 * k);

/**
 * Se o carro tem que parar antes da faixa. A decisão é tomada uma vez, quando o sinal
 * deixa de ser verde: quem já está perto demais para frear segue, os outros param.
 * Quem fura o vermelho nunca para pelo sinal. Sem dados do ESP32, o trânsito segue.
 */
function mustStop(car: SimCar, light: LightState | null, nearStop: boolean) {
  if (light === null || light === 'GREEN') {
    car.go = undefined;
    return false;
  }
  if (car.runner) return false;
  car.go ??= light === 'YELLOW' && nearStop;
  return !car.go;
}

export function useTrafficSystem(
  light: LightState | null,
  onPassage: (plate: string, light: LightState | null) => void,
) {
  const [cars, setCars] = useState<RenderCar[]>([]);
  const [sensorBusy, setSensorBusy] = useState(false);
  const lightRef = useRef(light);
  const passageCbRef = useRef(onPassage);
  lightRef.current = light;
  passageCbRef.current = onPassage;

  useEffect(() => {
    let list: SimCar[] = [];
    let nextId = 1;
    let spawned = 0;
    let lastRoute: Route = 'B';
    let spawnIn = 1.5;
    let busy = false;
    let last = performance.now();
    let raf = 0;

    const spawn = () => {
      const plate = PLATES.find(p => !list.some(c => c.plate === p));
      if (!plate) return; // os 3 carros já estão na rua
      const blockedA = list.some(c => c.route === 'A' && c.phase === 'approach' && c.d > D_HORIZON - 0.9);
      const blockedB = list.some(c => c.route === 'B' && c.phase === 'enter' && c.x > 3072 - 150);
      let route: Route = lastRoute === 'A' ? 'B' : 'A';
      if (Math.random() < 0.3) route = lastRoute;
      if (route === 'A' && blockedA) route = 'B';
      if (route === 'B' && blockedB) route = 'A';
      if ((route === 'A' && blockedA) || (route === 'B' && blockedB)) return;
      lastRoute = route;
      spawned += 1;
      const base = { id: nextId++, plate, route, runner: spawned % RUNNER_EVERY === 0, counted: false, v: 1, t: 0 };
      if (route === 'A') {
        const d = D_HORIZON;
        const y = yAtDepth(d);
        list.push({ ...base, phase: 'approach', d, x: laneX('left', y), y });
      } else {
        list.push({ ...base, phase: 'enter', d: D_TURN, x: 3072 + SIDE_CAR_LENGTH / 2 + 40, y: MAIN_ROAD_Y });
      }
    };

    const inSensorZone = (c: SimCar) =>
      ((c.route === 'A' && (c.phase === 'approach' || c.phase === 'cross')) ||
        (c.route === 'B' && (c.phase === 'turn' || c.phase === 'away'))) &&
      c.y >= SENSOR_ZONE.minY && c.y <= SENSOR_ZONE.maxY;

    const step = (dt: number) => {
      const lightNow = lightRef.current;

      // Os mais à frente andam primeiro, para a fila usar a posição já atualizada.
      const order = [...list].sort((a, b) => (a.route === 'A' ? a.d - b.d : a.x - b.x));
      for (const car of order) {
        car.t += dt;
        if (car.route === 'A') stepA(car, dt, lightNow);
        else stepB(car, dt, lightNow);
      }
      list = list.filter(c =>
        !(c.route === 'A' && c.phase === 'exit' && c.x < -SIDE_CAR_LENGTH) &&
        !(c.route === 'B' && c.phase === 'away' && c.d >= D_HORIZON),
      );

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn = SPAWN_MIN_S + Math.random() * (SPAWN_MAX_S - SPAWN_MIN_S);
      }

      // HC-SR04: avisa uma vez por carro, no instante em que ele cruza a linha do sensor.
      let nowBusy = false;
      for (const car of list) {
        if (!inSensorZone(car)) continue;
        nowBusy = true;
        if (!car.counted) {
          car.counted = true;
          passageCbRef.current(car.plate, lightNow);
        }
      }
      if (nowBusy !== busy) {
        busy = nowBusy;
        setSensorBusy(nowBusy);
      }
    };

    const approachSpeed = (car: SimCar, target: number, dt: number) => {
      // Freia suave nos últimos 0,4 de profundidade antes do alvo; acelera suave ao sair.
      const desired = target === -Infinity ? 1 : clamp((car.d - target) / 0.4, 0, 1);
      car.v += (desired - car.v) * Math.min(1, dt * ACCEL);
      return car.v * V_DEPTH * dt;
    };

    const stepA = (car: SimCar, dt: number, lightNow: LightState | null) => {
      if (car.phase === 'approach' || car.phase === 'cross') {
        const ahead = list
          .filter(o => o.route === 'A' && o !== car && (o.phase === 'approach' || o.phase === 'cross') && o.d < car.d)
          .sort((a, b) => b.d - a.d)[0];
        let target = -Infinity;
        if (car.phase === 'approach' && mustStop(car, lightNow, car.d <= 1.15)) target = 1;
        if (ahead) target = Math.max(target, ahead.d + GAP_DEPTH);
        const moved = car.d - approachSpeed(car, target, dt);
        // Nunca anda para trás: se já passou do alvo (fila apertou), só para.
        car.d = target === -Infinity ? moved : Math.max(moved, Math.min(car.d, target));
        // Só está cruzando se passou da linha; parado exatamente nela ainda espera o sinal.
        if (car.phase === 'approach' && car.d < 0.995) car.phase = 'cross';
        car.y = yAtDepth(car.d);
        car.x = laneX('left', car.y);
        if (car.phase === 'cross' && car.d <= D_TURN) {
          car.phase = 'merge';
          car.t = 0;
        }
        return;
      }
      if (car.phase === 'merge') {
        const k = clamp(car.t / MERGE_S, 0, 1);
        car.y = lerp(TURN_Y, MAIN_ROAD_Y, ease(k));
        car.x -= V_ROAD * dt * k;
        if (k >= 1) {
          car.phase = 'exit';
          car.t = 0;
        }
        return;
      }
      // exit: segue pela rua principal até sair pela esquerda
      car.v += (1 - car.v) * Math.min(1, dt * ACCEL);
      car.x -= V_ROAD * car.v * dt;
    };

    const stepB = (car: SimCar, dt: number, lightNow: LightState | null) => {
      if (car.phase === 'enter') {
        const ahead = list
          .filter(o => o.route === 'B' && o !== car && o.phase === 'enter' && o.x < car.x)
          .sort((a, b) => b.x - a.x)[0];
        let target = -Infinity;
        if (mustStop(car, lightNow, car.x <= B_WAIT_X + 60)) target = B_WAIT_X;
        if (ahead) target = Math.max(target, ahead.x + GAP_ROAD);
        const desired = target === -Infinity ? 1 : clamp((car.x - target) / 220, 0, 1);
        car.v += (desired - car.v) * Math.min(1, dt * ACCEL);
        const moved = car.x - V_ROAD * car.v * dt;
        car.x = target === -Infinity ? moved : Math.max(moved, Math.min(car.x, target));
        if (car.x <= B_TURN_X) {
          car.phase = 'turn';
          car.t = 0;
        }
        return;
      }
      if (car.phase === 'turn') {
        const k = ease(clamp(car.t / TURN_S, 0, 1));
        car.x = lerp(B_TURN_X, laneX('right', TURN_Y), k);
        car.y = lerp(MAIN_ROAD_Y, TURN_Y, k);
        if (car.t >= TURN_S) {
          car.phase = 'away';
          car.d = D_TURN;
          car.t = 0;
        }
        return;
      }
      // away: sobe a rua do meio e some no fundo
      car.v += (1 - car.v) * Math.min(1, dt * ACCEL);
      car.d += car.v * V_DEPTH * dt;
      car.y = yAtDepth(car.d);
      car.x = laneX('right', car.y);
    };

    const toRender = (c: SimCar): RenderCar => {
      const base = { id: c.id, plate: c.plate, x: c.x, y: c.y };
      if (c.phase === 'merge' || c.phase === 'exit' || c.phase === 'enter') {
        return { ...base, sprite: 'side', width: SIDE_CAR_LENGTH, opacity: 1 };
      }
      if (c.phase === 'turn') {
        // Durante a curva o carro já aparece de costas, no tamanho da entrada da rua do meio.
        return { ...base, sprite: 'back', width: carWidthAt(TURN_Y), opacity: 1 };
      }
      // Aparece/some suavemente perto do fundo.
      const opacity = clamp((D_HORIZON - c.d) / 0.5, 0, 1);
      return { ...base, sprite: c.route === 'A' ? 'front' : 'back', width: carWidthAt(c.y), opacity };
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      step(dt);
      setCars(list.map(toRender).sort((a, b) => a.y - b.y));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(raf);
  }, []);

  return { cars, sensorBusy };
}

/** Altura do sprite para uma largura, mantendo a proporção do desenho. */
export const spriteHeight = (sprite: CarSprite, width: number) => width / SPRITE_RATIO[sprite];
