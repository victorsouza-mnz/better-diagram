import type { DiagramNode } from "../../domain/diagram/Node.js";
import type { Rect } from "../../domain/shared/geometry.js";
import { tokenizeJsLine } from "./jsHighlight.js";
import {
  LABEL_FONT_SIZE,
  LABEL_PADDING,
  LINE_HEIGHT,
  MONO_FONT_FAMILY,
  TEXT_NODE_FONT_SIZE,
  measureAt,
} from "./measureText.js";
import { wrapText } from "./textLayout.js";
import type { TextAlign } from "../../domain/diagram/TextAlign.js";

/**
 * O rótulo de um nó, quebrado em linhas.
 *
 * As três variantes usam o MESMO campo (`label`) e diferem só em onde o texto fica:
 *
 * - ícone → abaixo da caixa, porque texto sobre o logo tapa justamente o que
 *   identifica a tecnologia;
 * - forma → dentro, centralizado;
 * - texto → é o próprio conteúdo do nó.
 *
 * `<text>` não quebra linha sozinho: a quebra vem do `wrapText` (função pura,
 * testada) e vira `<tspan>`.
 */
export const NodeLabel = ({ node, rect }: { node: DiagramNode; rect: Rect }) => {
  if (node.label === "") {
    // Forma e ícone vazios continuam visíveis pelo próprio desenho (o contorno, o
    // logo) — não precisam de nada aqui. Nó de texto não tem nenhum desenho próprio;
    // sem um placeholder ele seria invisível e inatingível, e sumiria da tela assim
    // que perdesse o foco.
    if (node.content.kind !== "text") return null;
    return <TextPlaceholder w={rect.w} h={rect.h} />;
  }

  // Caixa de classe UML: três compartimentos, não um bloco só — desvia para um
  // desenho próprio antes de cair na regra genérica das outras variantes.
  if (node.content.kind === "shape" && node.content.shape === "umlClass") {
    return <UmlClassBody label={node.label} w={rect.w} />;
  }

  const isText = node.content.kind === "text";
  const isIcon = node.content.kind === "icon";
  const isCode = node.content.kind === "text" && node.content.format === "code";
  const fontSize = isText ? TEXT_NODE_FONT_SIZE : LABEL_FONT_SIZE;

  const maxWidth = isIcon
    ? Math.max(rect.w * 2, 96) // legenda pode ser mais larga que o ícone
    : Math.max(rect.w - LABEL_PADDING * 2, 1);

  // A quebra usa o medidor da fonte que vai desenhar — mono é mais largo por
  // caractere que a fonte proporcional; medir com a errada vaza texto da caixa.
  const lines = wrapText(node.label, maxWidth, measureAt(fontSize, isCode ? MONO_FONT_FAMILY : undefined));
  const lineHeight = fontSize * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;

  // Só nó de texto tem alinhamento — forma continua centralizada e ícone continua
  // abaixo da caixa, mesmo comportamento de sempre (`formas-e-texto.md`).
  const align = node.content.kind === "text" ? node.content.align : undefined;

  // Código ignora o alinhamento horizontal escolhido: convenção de todo editor de
  // código (linha alinhada à esquerda), e um bloco colorido por token só teria
  // posição previsível com `text-anchor: start` — nele, só o PRIMEIRO token da linha
  // carrega `x` (ver o `map` mais abaixo); "centralizar" pediria medir a linha
  // inteira de novo, duplicando o que a quebra já fez.
  const x = isCode ? LABEL_PADDING : align ? xForHorizontal(align.horizontal, rect.w) : rect.w / 2;
  const textAnchor = isCode ? "start" : align ? ANCHOR_FOR_HORIZONTAL[align.horizontal] : undefined;

  // Ícone: abaixo da caixa. Forma: bloco sempre centralizado. Texto: conforme o
  // alinhamento vertical escolhido.
  const firstBaseline = isIcon
    ? rect.h + fontSize + 4
    : align
      ? yForVertical(align.vertical, rect.h, blockHeight, fontSize)
      : (rect.h - blockHeight) / 2 + fontSize;

  if (isCode) {
    return (
      <text
        x={x}
        y={firstBaseline}
        className="node-text node-text--code"
        style={{ pointerEvents: "none", fontSize, fontFamily: MONO_FONT_FAMILY, textAnchor }}
      >
        {lines.map((line, lineIndex) => {
          const tokens = tokenizeJsLine(line);
          const dy = lineIndex === 0 ? 0 : lineHeight;
          // Linha vazia não tokeniza nada — sem um tspan aqui, ela colapsa e
          // desalinha o resto do bloco, igual ao ramo de texto simples logo abaixo.
          if (tokens.length === 0) {
            return (
              <tspan key={lineIndex} x={x} dy={dy}>
                {" "}
              </tspan>
            );
          }
          // Só o PRIMEIRO token da linha carrega `x`/`dy` — os seguintes continuam
          // no fluxo do texto, na mesma linha, cada um com a cor do seu tipo.
          return tokens.map((token, tokenIndex) => (
            <tspan
              key={`${lineIndex}-${tokenIndex}`}
              x={tokenIndex === 0 ? x : undefined}
              dy={tokenIndex === 0 ? dy : undefined}
              className={`code-token code-token--${token.kind}`}
            >
              {token.text}
            </tspan>
          ));
        })}
      </text>
    );
  }

  return (
    <text
      x={x}
      y={firstBaseline}
      className={isText ? "node-text" : "node-label"}
      style={{ pointerEvents: "none", fontSize, textAnchor }}
    >
      {lines.map((line, index) => (
        <tspan
          // As linhas não têm identidade própria: o índice é o id certo aqui.
          key={index}
          x={x}
          dy={index === 0 ? 0 : lineHeight}
        >
          {/* `<tspan>` vazio colapsa e desalinha o resto do bloco. */}
          {line === "" ? " " : line}
        </tspan>
      ))}
    </text>
  );
};

/**
 * Nó de texto sem rótulo: contorno tracejado + dica, só para existir na tela.
 *
 * `pointer-events: none` nos dois — quem recebe o clique é sempre o `.node-hit` do
 * `NodeView`, igual a forma e ícone. O contorno não é seleção (essa é a
 * `.node-selection` de sempre, desenhada por cima quando o nó está selecionado).
 */
const TextPlaceholder = ({ w, h }: { w: number; h: number }) => (
  <>
    <rect
      width={w}
      height={h}
      className="text-placeholder-box"
      style={{ pointerEvents: "none" }}
    />
    <text
      x={w / 2}
      y={h / 2}
      className="text-placeholder-label"
      style={{ pointerEvents: "none" }}
    >
      Texto
    </text>
  </>
);

/** Respiro vertical no topo de CADA compartimento — mesmo valor nos três. */
const COMPARTMENT_PADDING = 6;

/**
 * O corpo de uma caixa de classe: nome, atributos e métodos, cada um seu
 * compartimento, separados por uma linha em branco no `label` — não é um campo
 * estruturado, é a MESMA string que qualquer forma já guardava, só que este
 * desenho a interpreta em três pedaços em vez de um bloco só (ver
 * `docs/specs/editor/formas-e-texto.md`).
 *
 * A altura de cada compartimento vem só do que ele contém — nunca é esticada para
 * preencher a caixa. Uma caixa redimensionada maior que o conteúdo sobra em branco
 * embaixo do último compartimento; menor que o conteúdo, o texto vaza por baixo —
 * mesma regra de "sem corte" que já vale para as outras formas.
 */
const UmlClassBody = ({ label, w }: { label: string; w: number }) => {
  const measure = measureAt(LABEL_FONT_SIZE);
  const maxWidth = Math.max(w - LABEL_PADDING * 2, 1);
  const lineHeight = LABEL_FONT_SIZE * LINE_HEIGHT;

  // Linha em branco (uma ou mais) separa os compartimentos. Além do terceiro, tudo
  // vira método — várias quebras extras não criam um quarto compartimento fantasma.
  const [rawName = "", rawAttributes = "", ...rest] = label.split(/\n\s*\n/);
  const rawMethods = rest.join("\n\n");

  const nameLines = wrapText(rawName, maxWidth, measure);
  const attributeLines = wrapText(rawAttributes, maxWidth, measure);
  const methodLines = wrapText(rawMethods, maxWidth, measure);

  const sectionHeight = (lines: readonly string[]) =>
    Math.max(lines.length, 1) * lineHeight + COMPARTMENT_PADDING * 2;

  const firstDivider = sectionHeight(nameLines);
  const secondDivider = firstDivider + sectionHeight(attributeLines);

  return (
    <g style={{ pointerEvents: "none" }}>
      <line x1={0} y1={firstDivider} x2={w} y2={firstDivider} className="uml-class-divider" />
      <line x1={0} y1={secondDivider} x2={w} y2={secondDivider} className="uml-class-divider" />

      <UmlClassCompartment lines={nameLines} w={w} top={0} lineHeight={lineHeight} centered />
      <UmlClassCompartment lines={attributeLines} w={w} top={firstDivider} lineHeight={lineHeight} />
      <UmlClassCompartment lines={methodLines} w={w} top={secondDivider} lineHeight={lineHeight} />
    </g>
  );
};

/**
 * Uma linha ou lista de linhas dentro de um compartimento. Nome vem centralizado
 * (mesma convenção da forma); atributos e métodos vêm alinhados à esquerda — é
 * como toda notação de classe UML desenha uma lista de membros, nunca centralizada.
 */
const UmlClassCompartment = ({
  lines,
  w,
  top,
  lineHeight,
  centered = false,
}: {
  lines: readonly string[];
  w: number;
  top: number;
  lineHeight: number;
  centered?: boolean;
}) => {
  const x = centered ? w / 2 : LABEL_PADDING;
  const firstBaseline = top + COMPARTMENT_PADDING + LABEL_FONT_SIZE;

  return (
    <text
      x={x}
      y={firstBaseline}
      className={centered ? "uml-class-name" : "uml-class-member"}
      style={{
        pointerEvents: "none",
        fontSize: LABEL_FONT_SIZE,
        textAnchor: centered ? "middle" : "start",
      }}
    >
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : lineHeight}>
          {line === "" ? " " : line}
        </tspan>
      ))}
    </text>
  );
};

const ANCHOR_FOR_HORIZONTAL: Record<TextAlign["horizontal"], "start" | "middle" | "end"> = {
  left: "start",
  center: "middle",
  right: "end",
};

/** Posição horizontal do texto — a mesma folga de `LABEL_PADDING` usada na quebra. */
const xForHorizontal = (horizontal: TextAlign["horizontal"], w: number): number => {
  if (horizontal === "left") return LABEL_PADDING;
  if (horizontal === "right") return w - LABEL_PADDING;
  return w / 2;
};

/**
 * Posição vertical (a primeira baseline) — mesma folga de `LABEL_PADDING` no topo e
 * no fundo, para o texto nunca colar na borda da caixa.
 */
const yForVertical = (
  vertical: TextAlign["vertical"],
  h: number,
  blockHeight: number,
  fontSize: number,
): number => {
  if (vertical === "top") return LABEL_PADDING + fontSize;
  if (vertical === "bottom") return h - LABEL_PADDING - blockHeight + fontSize;
  return (h - blockHeight) / 2 + fontSize;
};
