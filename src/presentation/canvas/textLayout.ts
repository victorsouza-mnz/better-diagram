/**
 * Quebra de linha.
 *
 * `<text>` do SVG não quebra sozinho: a quebra é calculada aqui e vira `<tspan>`.
 * (`foreignObject` resolveria em uma linha e está descartado — atrapalha no export
 * para SVG.)
 *
 * A função é PURA e recebe o medidor como parâmetro. A regra de quebra fica testável
 * em Node com um medidor falso, e a medição real — que depende de fonte e de
 * canvas — fica fora. Testar quebra de linha sem browser é o que torna este código
 * confiável; com browser, ninguém testa.
 */

export type Measure = (text: string) => number;

/**
 * Corta uma palavra que não cabe nem sozinha na linha.
 *
 * Sem isso ela vazaria para fora da caixa — e uma URL ou um nome de serviço em
 * `snake_case` longo é exatamente o caso comum num diagrama de arquitetura.
 */
const breakLongWord = (word: string, maxWidth: number, measure: Measure): string[] => {
  const pieces: string[] = [];
  let current = "";

  for (const char of word) {
    const candidate = current + char;
    if (current !== "" && measure(candidate) > maxWidth) {
      pieces.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current !== "") pieces.push(current);
  return pieces;
};

export const wrapText = (text: string, maxWidth: number, measure: Measure): string[] => {
  if (maxWidth <= 0) return text === "" ? [] : [text];

  const lines: string[] = [];

  // As quebras que a pessoa digitou são respeitadas: cada parágrafo quebra sozinho.
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of paragraph.split(/\s+/).filter((w) => w !== "")) {
      const candidate = line === "" ? word : `${line} ${word}`;

      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }

      if (line !== "") lines.push(line);

      if (measure(word) > maxWidth) {
        const pieces = breakLongWord(word, maxWidth, measure);
        // O último pedaço continua a linha: ainda pode receber a próxima palavra.
        lines.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1] ?? "";
      } else {
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
};

/** Largura da linha mais larga — usado para ajustar a caixa de um nó de texto. */
export const widestLine = (lines: readonly string[], measure: Measure): number =>
  lines.reduce((widest, line) => Math.max(widest, measure(line)), 0);
