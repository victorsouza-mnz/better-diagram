import { useEffect, useRef, useState } from "react";

import { rect } from "../../domain/shared/geometry.js";
import type { EditorSession } from "../session/useEditorSession.js";
import {
  LABEL_FONT_SIZE,
  LABEL_PADDING,
  LINE_HEIGHT,
  TEXT_NODE_FONT_SIZE,
  textHeightFor,
} from "./measureText.js";
import { worldToScreen } from "./viewport.js";

/**
 * Editor de rótulo, sobreposto ao canvas.
 *
 * É um `<textarea>` HTML posicionado sobre o nó, e NÃO um `foreignObject`:
 * `foreignObject` resolveria em uma linha e atrapalha no export para SVG, que está
 * na fila. De quebra, um campo de verdade traz foco, seleção, IME e os atalhos do
 * sistema de graça.
 *
 * `Enter` quebra linha e `Esc` grava — convenção dos editores de canvas, e aqui o
 * motivo é concreto: rótulo de diagrama quebra linha com frequência ("API Gateway /
 * (Kong)"), então `Enter` gravando seria o atalho errado no gesto mais comum.
 */
export const LabelEditor = ({ session }: { session: EditorSession }) => {
  const { diagram, viewport, editing, actions } = session;
  const node = editing ? diagram.node(editing) : undefined;

  const [value, setValue] = useState(node?.label ?? "");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  // O valor mais recente, para o commit no desmonte não capturar um texto velho.
  const valueRef = useRef(value);
  valueRef.current = value;

  /**
   * O foco é pedido no quadro SEGUINTE, e não no layout effect.
   *
   * O editor abre a partir de um duplo clique, e o `dblclick` nativo ainda está em
   * curso quando o React aplica o render: focar ali é focar no meio do evento, e o
   * browser devolve o foco ao `body` logo depois — o `blur` resultante fechava o
   * editor no mesmo instante em que ele aparecia.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
      setFocused(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!node) return null;

  const isText = node.content.kind === "text";
  const fontSize = isText ? TEXT_NODE_FONT_SIZE : LABEL_FONT_SIZE;

  /**
   * Grava e fecha.
   *
   * Chamado dos pontos de saída — `Esc` e perda de foco — e NÃO de um cleanup de
   * efeito. Cleanup precisa ser desmontagem pura: o StrictMode desmonta e remonta de
   * propósito em desenvolvimento, e um cleanup que muda estado do app dispara nessa
   * desmontagem simulada. Aqui isso fechava o editor no instante em que ele abria.
   */
  function commit(text: string) {
    if (!node) return;
    actions.commitLabel(text, isText ? fitToText(text) : undefined);
  }

  /**
   * Nó de texto: a LARGURA é da pessoa (tamanho atual da caixa, ajustável pelas
   * alças) — é ela que faz a quebra de linha responder ao tamanho da caixa, e não só
   * ao `Enter` (mesma largura que `NodeLabel` usa para quebrar ao desenhar).
   *
   * A ALTURA só CRESCE quando o texto novo não cabe mais na altura atual — nunca
   * encolhe sozinha. Uma pessoa que esticou a caixa (pelas alças, para o alinhamento
   * vertical ter onde atuar) não pode ver isso desfeito só por editar o rótulo de
   * novo. `textHeightFor` é a mesma conta de `useEditorSession.previewResize`, para
   * a prévia do redimensionamento e o fim da edição nunca divergirem.
   */
  function fitToText(text: string) {
    if (!node) return undefined;
    const width = node.rect.w;
    const height = Math.max(node.rect.h, textHeightFor(text, width));
    return rect(node.rect.x, node.rect.y, width, height);
  }

  const topLeft = worldToScreen(viewport, { x: node.rect.x, y: node.rect.y });
  const isIcon = node.content.kind === "icon";

  // Horizontal já é visível DURANTE a digitação — é só `text-align` do textarea.
  // Vertical não: um `<textarea>` sempre começa o texto no topo, não existe
  // `text-align` de eixo vertical para o conteúdo dele. Centralizar ou "descer" o
  // texto ao editar pediria trocar por um `contentEditable` — e a spec do editor já
  // rejeita isso de propósito (foco, seleção e IME de um campo de verdade, de
  // graça). Resultado aceito: o vertical só aparece ao sair da edição.
  const textAlign =
    node.content.kind === "text"
      ? ({ left: "left", center: "center", right: "right" } as const)[
          node.content.align.horizontal
        ]
      : "center";

  return (
    <textarea
      ref={ref}
      className="label-editor"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      // Só fecha por blur depois de ter ganhado o foco: um blur anterior a isso é
      // ruído do próprio evento que abriu o editor.
      onBlur={() => focused && commit(valueRef.current)}
      onKeyDown={(event) => {
        // O canvas ignora teclado quando o foco está num campo, então `Esc` precisa
        // ser tratado aqui.
        if (event.key === "Escape") {
          event.stopPropagation();
          commit(valueRef.current);
        }
      }}
      style={{
        left: topLeft.x,
        // Rótulo de ícone fica ABAIXO da caixa; nas outras variantes, dentro dela.
        top: isIcon ? topLeft.y + node.rect.h * viewport.scale : topLeft.y,
        width: Math.max(node.rect.w, 80) * viewport.scale,
        height: (isIcon ? fontSize * LINE_HEIGHT * 2 : node.rect.h) * viewport.scale,
        fontSize: fontSize * viewport.scale,
        lineHeight: LINE_HEIGHT,
        padding: isIcon ? 0 : LABEL_PADDING * viewport.scale,
        textAlign: isIcon ? "center" : textAlign,
      }}
    />
  );
};
