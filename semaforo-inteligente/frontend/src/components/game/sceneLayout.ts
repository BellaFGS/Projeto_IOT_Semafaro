/**
 * Posições dos elementos do cenário sobre `rua-melhorada.webp` (3072×2048).
 * Medidas em pixels da imagem original e convertidas para % da imagem, para que
 * as sobreposições acompanhem o fundo em qualquer tamanho de tela.
 */

export const BG_WIDTH = 3072;
export const BG_HEIGHT = 2048;

const px = (x: number) => `${(x / BG_WIDTH) * 100}%`;
const py = (y: number) => `${(y / BG_HEIGHT) * 100}%`;

/**
 * Lâmpadas do semáforo no poste da esquina (x 1158–1196, 40 px de diâmetro).
 * A caixa é 3 px maior em cada lado para a luz apagada cobrir toda a cor pintada.
 */
export const LAMP = {
  left: px(1155),
  size: px(46),
  top: {
    RED: py(865),
    YELLOW: py(931),
    GREEN: py(997),
  },
} as const;

/** Visor com os segundos, ao lado da caixa do semáforo (caixa termina em x 1236). */
export const TIMER = { left: px(1252), top: py(858) } as const;

/** Caixa do botão de pedestre no mesmo poste (x 1153–1173, y 1390–1444). */
export const PED_BUTTON = { left: px(1149), top: py(1386), width: px(28), height: py(62) } as const;

/** Calçada da frente: y 1614–1734. Os pés do personagem ficam no meio dela. */
export const SIDEWALK_FEET_Y = 1700;
export const SIDEWALK_FEET_BOTTOM = `${100 - (SIDEWALK_FEET_Y / BG_HEIGHT) * 100}%`;
/**
 * Altura do quadro do personagem em fração da imagem. O sprite ocupa ~60% do
 * quadro, então 0.3 dá um personagem da altura aproximada das portas das casas.
 */
export const CHARACTER_HEIGHT = 0.3;

// Geometria das ruas e dos carros: components/game/traffic/roadGeometry.ts
