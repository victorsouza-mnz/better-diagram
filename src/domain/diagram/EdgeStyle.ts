/**
 * Estilo visual de uma aresta — dois eixos independentes: tracejado e direção.
 *
 * São dois booleanos soltos, e não um enum de 4 nomes (`"dashed-bi"` etc.), porque
 * os dois eixos são ortogonais de verdade: nada no domínio precisa que "tracejada"
 * e "bidirecional" andem juntas. Um enum encoberia essa independência atrás de
 * quatro rótulos arbitrários.
 */
export interface EdgeStyle {
  readonly dashed: boolean;
  readonly bidirectional: boolean;
}

/** O estilo de uma aresta recém-criada. */
export const DEFAULT_EDGE_STYLE: EdgeStyle = { dashed: false, bidirectional: false };

/**
 * A ordem que Ctrl+clique percorre — sólida/unidirecional é o ponto de partida e
 * também para onde o ciclo volta depois da quarta.
 */
const CYCLE: readonly EdgeStyle[] = [
  { dashed: false, bidirectional: false },
  { dashed: false, bidirectional: true },
  { dashed: true, bidirectional: false },
  { dashed: true, bidirectional: true },
];

const sameStyle = (a: EdgeStyle, b: EdgeStyle): boolean =>
  a.dashed === b.dashed && a.bidirectional === b.bidirectional;

/**
 * O próximo estilo no ciclo.
 *
 * Um estilo que não bate com nenhuma posição do ciclo (não deveria acontecer, mas
 * documento é entrada de fora) cai no PRIMEIRO — `findIndex` devolve `-1`,
 * `(-1 + 1) % 4 === 0` — em vez de travar sem produzir o próximo estilo.
 */
export const nextEdgeStyle = (current: EdgeStyle): EdgeStyle => {
  const index = CYCLE.findIndex((style) => sameStyle(style, current));
  // Índice sempre cai dentro de CYCLE (tamanho fixo, módulo garante o range).
  return CYCLE[(index + 1) % CYCLE.length]!;
};
