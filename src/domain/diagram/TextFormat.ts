/**
 * Como o rótulo de um nó de TEXTO é interpretado ao desenhar — texto simples, ou
 * um trecho de código JS (fonte monoespaçada, destaque de sintaxe).
 *
 * Só existe dentro de `NodeContent` de `kind: "text"` (ver `NodeContent.ts`), mesma
 * razão de `TextAlign`: forma e ícone não têm esse controle — é o `content` que
 * decide o que se desenha dentro, não um atributo solto do nó.
 *
 * Union de string, não booleano (`code: boolean`), porque "como formatar" é um
 * conjunto de opções que só cresce (a próxima pode ser markdown, JSON…) — um
 * booleano teria que virar união mais cedo ou mais tarde, e essa migração
 * quebraria todo código que já testasse `=== true`.
 */
export type TextFormat = "plain" | "code";

/**
 * O formato de um nó de texto recém-criado — e de qualquer nó salvo antes deste
 * controle existir (o codec preenche este padrão na leitura). É o visual de
 * sempre: texto simples, sem mudar a aparência de diagramas já salvos.
 */
export const DEFAULT_TEXT_FORMAT: TextFormat = "plain";

/**
 * O outro valor — usado pelo atalho de `Alt`+clique num nó de texto (alterna, não
 * escolhe), o mesmo espírito de `nextEdgeStyle`, só que um ciclo de DOIS valores em
 * vez de quatro: só existem "plain" e "code" hoje, então "próximo" é sempre "o
 * outro". Se um terceiro formato chegar (markdown?), isto deixa de ser um `if` e
 * vira um ciclo de verdade — a MESMA mudança que `nextEdgeStyle` já fez o caminho.
 */
export const nextTextFormat = (current: TextFormat): TextFormat =>
  current === "plain" ? "code" : "plain";
