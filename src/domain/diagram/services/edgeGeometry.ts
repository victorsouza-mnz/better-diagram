import { center, type Point, type Rect } from "../../shared/geometry.js";

/**
 * Geometria das arestas — funções puras: entra retângulo, sai ponto.
 *
 * Não conhece SVG, evento nem zoom. É o que permite testar a rota da aresta sem
 * abrir um browser, e trocar o roteamento depois sem tocar em componente nenhum.
 *
 * A aresta NÃO guarda geometria: ela referencia dois nós por id, e a rota é derivada
 * daqui a cada render. Uma aresta que guardasse pontos ficaria desatualizada no
 * instante em que alguém movesse um nó.
 */

/** Distância entre arestas vizinhas de um mesmo feixe. */
const BUNDLE_SPACING = 20;

/**
 * Ponto onde a linha centro-a-centro sai pela borda do retângulo.
 *
 * Escala a direção até bater na borda mais próxima — a vertical ou a horizontal, o
 * que vier primeiro.
 */
const borderPoint = (r: Rect, dx: number, dy: number): Point => {
  const c = center(r);
  const byWidth = dx === 0 ? Infinity : r.w / 2 / Math.abs(dx);
  const byHeight = dy === 0 ? Infinity : r.h / 2 / Math.abs(dy);
  const t = Math.min(byWidth, byHeight);

  return { x: c.x + dx * t, y: c.y + dy * t };
};

/**
 * Os dois pontos de encaixe de uma aresta, nas bordas dos nós.
 *
 * `undefined` quando os centros coincidem: não há direção definida, então não há o
 * que desenhar. É estado transitório de arrasto, não erro — a aresta reaparece assim
 * que os nós se separam.
 */
export const attachPoints = (
  source: Rect,
  target: Rect,
): readonly [Point, Point] | undefined => {
  const from = center(source);
  const to = center(target);
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === 0) return undefined;

  return [borderPoint(source, dx, dy), borderPoint(target, -dx, -dy)];
};

/**
 * Desvio lateral de uma aresta dentro de um feixe entre o mesmo par de nós.
 *
 * O documento permite duas arestas entre os mesmos nós — dois canais entre os mesmos
 * serviços é caso real. Desenhadas iguais, ficariam uma sobre a outra e o diagrama
 * mentiria: pareceriam uma só. O feixe é espalhado simetricamente em torno da reta,
 * para a contagem visível bater com a real.
 */
export const parallelBow = (index: number, total: number): number =>
  total <= 1 ? 0 : (index - (total - 1) / 2) * BUNDLE_SPACING;

/**
 * Ponto de controle da curva, deslocado perpendicularmente ao segmento.
 *
 * Com `bow` zero cai no meio do segmento, e a curva quadrática vira uma reta — não
 * há caso especial a tratar em quem desenha.
 */
export const controlPoint = (a: Point, b: Point, bow: number): Point => {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (bow === 0) return mid;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return mid;

  // Perpendicular unitária ao segmento.
  return { x: mid.x - (dy / length) * bow, y: mid.y + (dx / length) * bow };
};
