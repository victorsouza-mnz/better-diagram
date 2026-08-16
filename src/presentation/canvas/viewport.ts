import type { Point } from "../../domain/shared/geometry.js";

/**
 * A câmera: posição e zoom com que se olha o plano do diagrama.
 *
 * É ESTADO DE SESSÃO — não entra no documento. Dois usuários abrindo o mesmo
 * arquivo herdariam o scroll um do outro, e todo diff de documento viraria ruído.
 *
 * A conversão tela↔mundo mora aqui, em funções puras e testáveis, e não espalhada
 * pelos handlers de ponteiro: é a conta que, errada por um sinal, faz o editor
 * inteiro parecer quebrado.
 */
export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;

export const initialViewport: Viewport = { x: 0, y: 0, scale: 1 };

export const screenToWorld = (v: Viewport, p: Point): Point => ({
  x: (p.x - v.x) / v.scale,
  y: (p.y - v.y) / v.scale,
});

export const worldToScreen = (v: Viewport, p: Point): Point => ({
  x: p.x * v.scale + v.x,
  y: p.y * v.scale + v.y,
});

export const pan = (v: Viewport, dx: number, dy: number): Viewport => ({
  ...v,
  x: v.x + dx,
  y: v.y + dy,
});

const clampScale = (scale: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/**
 * Zoom mantendo sob o cursor o mesmo ponto do mundo. É o detalhe que separa um
 * zoom que parece natural de um que "foge" da mão.
 */
export const zoomAt = (v: Viewport, screenPoint: Point, factor: number): Viewport => {
  const scale = clampScale(v.scale * factor);
  const world = screenToWorld(v, screenPoint);
  return {
    scale,
    x: screenPoint.x - world.x * scale,
    y: screenPoint.y - world.y * scale,
  };
};
