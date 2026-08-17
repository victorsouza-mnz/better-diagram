/**
 * Preenchimento e contorno de uma FORMA — três aparências, não dois eixos
 * independentes como `EdgeStyle`. "Tracejada com fundo" nunca foi pedida como
 * opção; modelar como dois booleanos soltos (`filled`, `dashed`) convidaria essa
 * quarta combinação que ninguém pediu. Um ciclo fechado de três valores, na mesma
 * veia de `TextFormat` (um tipo que "só cresce" se um dia aparecer uma quarta
 * aparência), é o que descreve exatamente as três opções e nada além delas.
 *
 * Só existe na variante `shape` de `NodeContent` — ícone desenha só a própria
 * imagem (nunca teve contorno de forma) e texto não tem caixa (ver
 * `docs/specs/ui/painel-propriedades.md`).
 */
export type ShapeStyle = "filled" | "outlined" | "dashed";

/** O estilo de uma forma recém-criada — o visual de sempre. */
export const DEFAULT_SHAPE_STYLE: ShapeStyle = "filled";

/** A ordem que Ctrl+clique percorre — sólida com fundo é o ponto de partida. */
const CYCLE: readonly ShapeStyle[] = ["filled", "outlined", "dashed"];

/**
 * O próximo estilo no ciclo.
 *
 * Um estilo que não bate com nenhuma posição do ciclo (não deveria acontecer, mas
 * documento é entrada de fora) cai no PRIMEIRO — `indexOf` devolve `-1`,
 * `(-1 + 1) % 3 === 0` — em vez de travar sem produzir o próximo estilo.
 */
export const nextShapeStyle = (current: ShapeStyle): ShapeStyle => {
  const index = CYCLE.indexOf(current);
  return CYCLE[(index + 1) % CYCLE.length]!;
};
