/**
 * Geometria: value objects imutáveis, igualdade por valor.
 *
 * Tudo aqui é função pura sobre números — nada de coordenada de tela, evento de
 * ponteiro ou matriz de zoom. A conversão tela↔mundo é da camada de apresentação;
 * o domínio só conhece o plano do diagrama.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly w: number;
  readonly h: number;
}

/** Retângulo em coordenadas de mundo. Largura e altura são sempre positivas. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const point = (x: number, y: number): Point => ({ x, y });

export const rect = (x: number, y: number, w: number, h: number): Rect => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError("Rect: posição precisa ser finita");
  }
  if (!(w > 0) || !(h > 0)) {
    throw new RangeError(`Rect: largura e altura precisam ser positivas (${w}x${h})`);
  }
  return { x, y, w, h };
};

export const translate = (r: Rect, dx: number, dy: number): Rect =>
  rect(r.x + dx, r.y + dy, r.w, r.h);

export const center = (r: Rect): Point => point(r.x + r.w / 2, r.y + r.h / 2);

export const contains = (r: Rect, p: Point): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export const intersects = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/**
 * `inner` está inteiramente dentro de `outer` — não só tocando.
 *
 * É a regra da seleção retangular: um elemento entra na seleção quando está
 * TODO dentro do retângulo arrastado, nunca só encostando. Com interseção, roçar
 * de raspão num elemento grande do lado de fora do que se queria já o traz junto,
 * e a pessoa não tem como prever isso olhando o retângulo que desenhou. Com
 * contenção inteira, o retângulo desenhado É a resposta.
 */
export const containsRect = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

/** Menor retângulo que contém todos. `undefined` para lista vazia. */
export const boundingBox = (rects: readonly Rect[]): Rect | undefined => {
  const [first, ...others] = rects;
  if (!first) return undefined;

  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.w;
  let maxY = first.y + first.h;

  for (const r of others) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return rect(minX, minY, maxX - minX, maxY - minY);
};

/**
 * Maior retângulo com a proporção `aspect` (w/h) que cabe em `target`, centrado
 * nele. É o que faz um logo redimensionar sem esticar.
 */
export const fitPreservingAspect = (target: Rect, aspect: number): Rect => {
  const targetAspect = target.w / target.h;
  const [w, h] =
    targetAspect > aspect
      ? [target.h * aspect, target.h] // sobra na largura
      : [target.w, target.w / aspect]; // sobra na altura
  return rect(target.x + (target.w - w) / 2, target.y + (target.h - h) / 2, w, h);
};
