import { wrapText, type Measure } from "./textLayout.js";

/**
 * Medição de texto com um canvas 2D fora da tela.
 *
 * É a metade impura do `wrapText`: depende de fonte e de plataforma, então fica
 * aqui, e a REGRA de quebra fica lá, pura e testada.
 *
 * A fonte precisa bater com a do CSS. Se divergirem, a quebra fica calculada para
 * uma fonte e desenhada com outra — e o texto vaza da caixa por alguns pixels, um
 * bug chato de diagnosticar. As constantes abaixo são a fonte única desses valores:
 * o CSS as consome via variável.
 */

export const LABEL_FONT_SIZE = 12;
export const TEXT_NODE_FONT_SIZE = 14;
export const LINE_HEIGHT = 1.3;
export const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', sans-serif";
/**
 * Fonte do modo código (`TextFormat: "code"`). Monoespaçada não é estética — é o
 * que faz o backdrop de destaque de sintaxe (`LabelEditor`) casar caractere por
 * caractere com o `<textarea>` transparente por cima: com fonte proporcional, o
 * cursor real do textarea e o texto colorido do backdrop divergem a cada tecla.
 */
export const MONO_FONT_FAMILY = "'SF Mono', 'Cascadia Code', Consolas, 'Courier New', monospace";

/** Respiro lateral do texto dentro de uma caixa — mesmo valor em render e edição. */
export const LABEL_PADDING = 10;

const context = (() => {
  const canvas = document.createElement("canvas");
  return canvas.getContext("2d");
})();

const cache = new Map<string, Measure>();

/** Um medidor por tamanho+família de fonte, memoizado. */
export const measureAt = (fontSize: number, fontFamily: string = FONT_FAMILY): Measure => {
  const key = `${fontSize}/${fontFamily}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const font = `${fontSize}px ${fontFamily}`;
  const measure: Measure = context
    ? (text) => {
        context.font = font;
        return context.measureText(text).width;
      }
    // Sem canvas 2D (ambiente exótico), estima por caractere. É pior, mas render
    // aproximado é melhor que tela em branco.
    : (text) => text.length * fontSize * 0.55;

  cache.set(key, measure);
  return measure;
};

/**
 * A altura que um rótulo de nó de texto precisa, quebrado numa dada largura —
 * o PISO da caixa, nunca o valor final (a pessoa pode esticar além dele; ver
 * `useEditorSession.previewResize`). Uma função só, usada tanto pela prévia do
 * redimensionamento quanto pelo fim da edição de rótulo (`LabelEditor.fitToText`):
 * a mesma conta nos dois lugares é o que garante que um nunca "corrige" o que o
 * outro decidiu.
 *
 * `fontFamily` é opcional porque só o modo código diverge do padrão — passar
 * `MONO_FONT_FAMILY` aqui é o que mantém a altura calculada batendo com a largura
 * real dos caracteres monoespaçados desenhados por `NodeLabel`.
 */
export const textHeightFor = (label: string, width: number, fontFamily: string = FONT_FAMILY): number => {
  const lines = wrapText(
    label,
    Math.max(width - LABEL_PADDING * 2, 1),
    measureAt(TEXT_NODE_FONT_SIZE, fontFamily),
  );
  return lines.length * TEXT_NODE_FONT_SIZE * LINE_HEIGHT;
};
