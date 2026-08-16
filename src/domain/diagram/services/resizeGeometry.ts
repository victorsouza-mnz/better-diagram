import { rect, type Rect } from "../../shared/geometry.js";

/**
 * Geometria do redimensionamento — aritmética pura de retângulo.
 *
 * Não conhece ponteiro, zoom nem SVG: entra retângulo e deslocamento, sai retângulo.
 * É o que permite testar cada alça linha a linha em Node.
 */

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export const RESIZE_HANDLES: readonly ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/**
 * Menor lado que um nó pode ter.
 *
 * Não é só para o agregado não recusar dimensão zero: um elemento de 2px deixa de
 * ser pegável, e a pessoa perde o que acabou de criar sem entender como.
 */
export const MIN_NODE_SIZE = 16;

/** Onde a alça fica, em fração do retângulo. Usado para desenhar e para o cursor. */
export const handlePosition = (handle: ResizeHandle): { fx: number; fy: number } => ({
  fx: handle.includes("w") ? 0 : handle.includes("e") ? 1 : 0.5,
  fy: handle.includes("n") ? 0 : handle.includes("s") ? 1 : 0.5,
});

/**
 * O retângulo resultante de arrastar uma alça.
 *
 * A borda oposta à alça fica PARADA — é o que faz o gesto parecer natural. E o
 * arrasto para além dela não espelha o elemento: encosta no mínimo e para. Espelhar
 * seria uma segunda operação escondida dentro desta, e a pessoa descobriria por
 * acidente.
 */
export const resizedRect = (
  original: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
): Rect => {
  const left = original.x;
  const top = original.y;
  const right = original.x + original.w;
  const bottom = original.y + original.h;

  let x1 = left;
  let y1 = top;
  let x2 = right;
  let y2 = bottom;

  if (handle.includes("w")) x1 = Math.min(left + dx, right - MIN_NODE_SIZE);
  if (handle.includes("e")) x2 = Math.max(right + dx, left + MIN_NODE_SIZE);
  if (handle.includes("n")) y1 = Math.min(top + dy, bottom - MIN_NODE_SIZE);
  if (handle.includes("s")) y2 = Math.max(bottom + dy, top + MIN_NODE_SIZE);

  return rect(x1, y1, x2 - x1, y2 - y1);
};

/**
 * Redimensiona preservando a proporção `aspect` (largura/altura) — a versão para nó
 * de ícone, chamada qualquer que seja a alça, inclusive as laterais.
 *
 * NÃO é "pegue o retângulo livre e encaixe a proporção dentro dele". Essa era a
 * implementação anterior (via `fitPreservingAspect`, ainda usada como salvaguarda em
 * `DiagramNode.resizedTo`), e ela CENTRALIZA o resultado dentro do retângulo livre —
 * o que faz o elemento "derivar" para longe do canto que a pessoa está segurando: a
 * caixa cresce livre e large, mas o desenho fica pequeno, deslocado para o meio.
 * Numa alça lateral o efeito é pior — como o arrasto livre só muda um eixo, encaixar
 * a proporção dentro dele sempre volta ao tamanho original, e a alça lateral parece
 * não fazer nada.
 *
 * Aqui o LADO OPOSTO À ALÇA fica sempre parado, do mesmo jeito que em `resizedRect`:
 *
 * - alça de canto (nw/ne/se/sw): os dois eixos foram arrastados; segue o que a
 *   pessoa moveu proporcionalmente mais, e deriva o outro da proporção.
 * - alça lateral (n/s/e/w): só um eixo foi arrastado; o outro é derivado da
 *   proporção e cresce CENTRADO nele — a pessoa não indicou de que lado.
 *
 * Chamar esta função durante o arrasto (para a prévia) e no commit, com a mesma
 * conta, é o que faz a prévia mostrar o resultado final — nunca uma caixa livre que
 * "salta" para o tamanho certo só ao soltar.
 */
export const resizedRectPreservingAspect = (
  original: Rect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  aspect: number,
): Rect => {
  const free = resizedRect(original, handle, dx, dy);

  let scale: number;
  if (handle === "n" || handle === "s") {
    scale = free.h / original.h;
  } else if (handle === "e" || handle === "w") {
    scale = free.w / original.w;
  } else {
    const scaleW = free.w / original.w;
    const scaleH = free.h / original.h;
    scale = Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;
  }

  // A mesma trava de `resizedRect`, nos dois eixos de uma vez: como a proporção é
  // fixa, impedir o menor lado ORIGINAL de passar de `MIN_NODE_SIZE` já impede os
  // dois lados do resultado.
  const minScale = MIN_NODE_SIZE / Math.min(original.w, original.h);
  scale = Math.max(scale, minScale);

  const w = original.w * scale;
  const h = w / aspect;

  const x = handle.includes("w")
    ? original.x + original.w - w // borda direita parada
    : handle.includes("e")
      ? original.x // borda esquerda parada
      : original.x + (original.w - w) / 2; // n/s: sem lado indicado, cresce do centro

  const y = handle.includes("n")
    ? original.y + original.h - h // borda de baixo parada
    : handle.includes("s")
      ? original.y // borda de cima parada
      : original.y + (original.h - h) / 2; // e/w: sem lado indicado, cresce do centro

  return rect(x, y, w, h);
};
