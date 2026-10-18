/**
 * Geometria das ruas de `rua-melhorada.webp`, em pixels da imagem (3072×2048),
 * medida nos pixels do fundo.
 *
 * Rua do meio (vai para o fundo da paisagem):
 *   - faixa central em x ≈ 1588; meio-fio em y 1500 → 1437/1741, y 1640 → 1302/1871;
 *   - a meia-largura cresce 0,95 px por px de y e zera em y ≈ 1340, então o ponto
 *     de fuga é (1589, 1340). Tudo que fica nessa rua escala com (y − 1340).
 * Rua principal (horizontal): y 1782 até o fim; faixa central em y ≈ 1918.
 * Faixa de pedestres da rua do meio: y 1667–1766.
 */

export const VANISH_X = 1589;
export const VANISH_Y = 1340;
/** Meia-largura da rua do meio por px de distância ao ponto de fuga. */
const HALF_WIDTH_PER_Y = 0.95;

/** Linha de parada, logo antes da faixa de pedestres. */
export const STOP_Y = 1655;
/** Onde os carros aparecem/somem no fundo (logo abaixo dos prédios). */
export const HORIZON_Y = 1405;

/**
 * Profundidade "d": 1 na linha de parada, maior quanto mais longe.
 * Andar com d em velocidade constante = velocidade constante no mundo,
 * o que dá a sensação certa de perspectiva (devagar no fundo, mais rápido perto).
 */
export const depthAt = (y: number) => (STOP_Y - VANISH_Y) / (y - VANISH_Y);
export const yAtDepth = (d: number) => VANISH_Y + (STOP_Y - VANISH_Y) / d;

export const D_HORIZON = depthAt(HORIZON_Y);
/** Rota A troca o sprite de frente pelo lateral aqui (já na rua principal). */
export const TURN_Y = 1880;
export const D_TURN = depthAt(TURN_Y);

/** Centro da faixa da esquerda (quem desce, vindo do fundo) e da direita (quem sobe). */
export function laneX(lane: 'left' | 'right', y: number) {
  const half = HALF_WIDTH_PER_Y * (y - VANISH_Y);
  return lane === 'left' ? VANISH_X - half / 2 : VANISH_X + half / 2;
}

/** Largura do carro visto de frente/costas: 80% da faixa naquela profundidade. */
export const carWidthAt = (y: number) => 0.8 * HALF_WIDTH_PER_Y * (y - VANISH_Y);

/** Rua principal: base (pneus) dos carros na faixa de baixo e tamanho do carro de lado. */
export const MAIN_ROAD_Y = 2030;
export const SIDE_CAR_LENGTH = 640;

/** Rota B espera o verde aqui (x do centro do carro) antes de virar para a rua do meio. */
export const B_WAIT_X = 2330;
/** E vira quando o centro chega aqui. */
export const B_TURN_X = 1950;

/** Proporção largura/altura dos sprites recortados (vehicles/*.png). */
export const SPRITE_RATIO = {
  front: 378 / 314,
  back: 374 / 298,
  side: 866 / 304,
} as const;

/** HC-SR04 no poste da esquina: aponta atravessando a rua do meio na altura da faixa de pedestres. */
export const SENSOR_POS = { x: 1150, y: 1560 };
export const SENSOR_BEAM_END = { x: 1900, y: 1715 };
/** Faixa de y (base do carro) em que o sensor "vê" um carro na rua do meio. */
export const SENSOR_ZONE = { minY: 1610, maxY: 1830 };

/** Conversão de pixels da imagem para % do palco. */
export const pctX = (x: number) => `${(x / 3072) * 100}%`;
export const pctFromBottom = (y: number) => `${((2048 - y) / 2048) * 100}%`;
