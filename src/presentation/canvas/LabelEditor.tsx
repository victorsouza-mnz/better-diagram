import { useEffect, useRef, useState } from "react";

import { rect } from "../../domain/shared/geometry.js";
import type { EditorSession } from "../session/useEditorSession.js";
import { tokenizeJsLine } from "./jsHighlight.js";
import {
  LABEL_FONT_SIZE,
  LABEL_PADDING,
  LINE_HEIGHT,
  MONO_FONT_FAMILY,
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
  // O fundo colorido do modo código (ver o ramo `isCode` abaixo) — precisa da MESMA
  // rolagem que o textarea, ou o destaque desliza fora de sincronia com o cursor
  // assim que o texto passa da altura da caixa.
  const backdropRef = useRef<HTMLDivElement>(null);
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
  const isCode = node.content.kind === "text" && node.content.format === "code";
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
    // Código mede com a fonte mono — a mesma divergência de largura por caractere
    // que já vale para a quebra de linha em `NodeLabel`.
    const height = Math.max(node.rect.h, textHeightFor(text, width, isCode ? MONO_FONT_FAMILY : undefined));
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

  // Posição e tamanho na TELA — comum aos dois ramos abaixo. No modo código é o
  // envoltório que ocupa este retângulo; nos demais, o próprio `<textarea>`.
  const boxStyle = {
    left: topLeft.x,
    // Rótulo de ícone fica ABAIXO da caixa; nas outras variantes, dentro dela.
    top: isIcon ? topLeft.y + node.rect.h * viewport.scale : topLeft.y,
    width: Math.max(node.rect.w, 80) * viewport.scale,
    height: (isIcon ? fontSize * LINE_HEIGHT * 2 : node.rect.h) * viewport.scale,
  };

  if (isCode) {
    return (
      <div className="label-editor-code-wrap" style={boxStyle}>
        {/*
         * O TRUQUE: o texto de verdade fica invisível (`color: transparent` na CSS
         * do `.label-editor--code`) — quem aparece é este `<div>` por baixo, com
         * cada token colorido. Os dois têm fonte, padding e altura de linha
         * IDÊNTICOS (mesmas constantes, mesmo valor de `fontSize`/`viewport.scale`
         * abaixo), então o texto colorido cai exatamente sob o texto real: o
         * `<textarea>` continua dono de foco, seleção, cursor e IME — só não é ELE
         * quem pinta o glifo na tela.
         *
         * `aria-hidden`: quem lê a tela já tem o `<textarea>` com o mesmo texto;
         * duplicar aqui seria o conteúdo lido duas vezes.
         */}
        <div
          ref={backdropRef}
          className="label-editor-code-backdrop"
          aria-hidden="true"
          style={{ fontSize: fontSize * viewport.scale, lineHeight: LINE_HEIGHT, padding: LABEL_PADDING * viewport.scale }}
        >
          {value.split("\n").map((line, index, allLines) => (
            <span key={index}>
              {tokenizeJsLine(line).map((token, tokenIndex) => (
                <span key={tokenIndex} className={`code-token code-token--${token.kind}`}>
                  {token.text}
                </span>
              ))}
              {/* Quebra real entre linhas — a última não leva, ou sobraria uma linha
                  em branco a mais que `value` não tem. */}
              {index < allLines.length - 1 ? "\n" : ""}
            </span>
          ))}
        </div>
        <textarea
          ref={ref}
          className="label-editor label-editor--code"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          // O destaque rola junto — sem isso, digitar além da altura visível
          // desalinha o fundo colorido do texto real assim que o campo rola.
          onScroll={(event) => {
            if (backdropRef.current) backdropRef.current.scrollTop = event.currentTarget.scrollTop;
          }}
          onBlur={() => focused && commit(valueRef.current)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              commit(valueRef.current);
            }
          }}
          style={{ fontSize: fontSize * viewport.scale, lineHeight: LINE_HEIGHT, padding: LABEL_PADDING * viewport.scale }}
        />
      </div>
    );
  }

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
        ...boxStyle,
        fontSize: fontSize * viewport.scale,
        lineHeight: LINE_HEIGHT,
        padding: isIcon ? 0 : LABEL_PADDING * viewport.scale,
        textAlign: isIcon ? "center" : textAlign,
      }}
    />
  );
};
