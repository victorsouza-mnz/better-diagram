import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { attachPoints } from "../../domain/diagram/services/edgeGeometry.js";
import { center, type Point } from "../../domain/shared/geometry.js";
import { NodeId } from "../../domain/shared/ids.js";
import { union as unionSelection, type Selection } from "../../application/Selection.js";
import {
  marqueeBox,
  topmostNodeAt,
  withinMarquee,
  type EditorSession,
  type Tool,
} from "../session/useEditorSession.js";
import { screenToWorld } from "./viewport.js";
import { EdgeLayer } from "./EdgeLayer.js";
import { Minimap } from "./Minimap.js";
import { NodeView } from "./NodeView.js";
import { ZoomControls } from "./ZoomControls.js";

/**
 * O canvas.
 *
 * Pan e zoom são UM `transform` no `<g>` raiz — nunca recálculo posição a posição.
 * Durante o arrasto só os nós afetados recebem um offset visual; o documento não é
 * tocado até soltar.
 */

/** O foco está num campo de texto? Aí os atalhos do editor não valem. */
const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
};

export const DiagramCanvas = ({ session }: { session: EditorSession }) => {
  const {
    diagram,
    selection,
    viewport,
    drag,
    connecting,
    creating,
    resizing,
    marquee,
    tool,
    editing,
    rectOf,
    actions,
  } = session;
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Prévia do `Alt`+hover: qual nó está sob o cursor com `Alt` pressionado, e onde
   * está o cursor — o suficiente para desenhar a borda azul e a seta apontando na
   * direção dele em `AltConnectPreview`. É estado só de apresentação (nada aqui vira
   * entrada de histórico), por isso mora aqui e não na sessão.
   */
  const [altHover, setAltHover] = useState<{ nodeId: NodeId; at: Point } | null>(null);

  /**
   * Arrasto de pan com o botão do meio ou o direito — ponto de tela do
   * `pointermove` anterior, ou `null` fora do gesto.
   *
   * Ref, não estado: teria que setState a cada `pointermove` do arrasto, e o pan é
   * cosmético (não entra no histórico) — recriar o componente a 60fps só pra mover
   * a câmera é o mesmo desperdício que já motivou `canvas--alt` a ser uma classe
   * DOM direta, não estado React (ver o comentário lá embaixo).
   */
  const panningRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Tamanho do canvas em pixels de TELA — o minimapa e os botões de zoom precisam
   * dele pra saber o que "o centro da tela" ou "o que está visível agora" significa
   * (mesma conta de `toWorld`, só que dos dois cantos, não de um ponto de evento).
   * Via `ResizeObserver`, e não só a medida do primeiro render: a toolbar pode
   * empurrar largura (painel de propriedades aparecendo/sumindo) sem a janela
   * mudar de tamanho, e sem isso o minimapa ficaria com a câmera desalinhada até o
   * próximo resize da janela.
   */
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  // `useLayoutEffect`, e a medida INICIAL vem de `getBoundingClientRect` direto —
  // não só do primeiro callback do `ResizeObserver`. O observer é assíncrono, e o
  // primeiro disparo dele pode demorar mais que um frame (visto na prática: em
  // headless, só chegava junto do primeiro gesto do usuário) — até lá, minimapa e
  // zoom veriam `canvasSize` zerado e calculariam a câmera errada.
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const initial = el.getBoundingClientRect();
    setCanvasSize({ w: initial.width, h: initial.height });

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setCanvasSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /**
   * O que desenhar como selecionado — a seleção de verdade, ou, durante um
   * marquee, exatamente o que o `endMarquee` vai commitar (soma com a seleção
   * anterior se aditivo, senão substitui). A prévia É o resultado final, mesma
   * regra já usada no redimensionar: sem isso, a pessoa veria uma coisa arrastando
   * e outra ao soltar.
   *
   * Isto só vale para o RENDER. Atalhos como `Enter`/`Delete` continuam lendo
   * `session.selection` — a seleção comitada — e não este valor ao vivo.
   */
  const displaySelection: Selection = marquee
    ? (() => {
        const inside = withinMarquee(diagram, marqueeBox(marquee.from, marquee.to));
        return marquee.additive ? unionSelection(selection, inside) : inside;
      })()
    : selection;

  const toWorld = (event: { clientX: number; clientY: number }) => {
    const box = svgRef.current?.getBoundingClientRect();
    return screenToWorld(viewport, {
      x: event.clientX - (box?.left ?? 0),
      y: event.clientY - (box?.top ?? 0),
    });
  };

  // Ponteiro e teclado ficam na janela, não no elemento: um arrasto que sai do
  // canvas precisa continuar valendo, e soltar o botão lá fora precisa terminá-lo.
  useEffect(() => {
    // Nada aqui pergunta "há um gesto em curso?" olhando o estado: esse estado pode
    // estar um render atrasado, e o `pointerup` de um arrasto rápido chega antes do
    // React ter renderizado o último movimento. Cada ação consulta a própria ref e
    // não faz nada quando não há gesto — o gate mora num lugar só.
    const onMove = (event: PointerEvent) => {
      // Pan é exclusivo: só começa via `onPointerDownCapture` (botão do meio ou
      // direito), que intercepta o evento ANTES de qualquer outro gesto nascer
      // (nó, aresta, marquee, criação) — ver o comentário lá. Nenhum `update*`
      // abaixo teria o que fazer nesse instante; sair cedo só evita o trabalho.
      if (panningRef.current) {
        const dx = event.clientX - panningRef.current.x;
        const dy = event.clientY - panningRef.current.y;
        panningRef.current = { x: event.clientX, y: event.clientY };
        actions.panBy(dx, dy);
        return;
      }

      const at = toWorld(event);
      actions.updateDrag(at);
      actions.updateConnect(at);
      actions.updateCreate(at);
      actions.updateResize(at);
      actions.updateMarquee(at);

      // Classe pura DOM, fora do estado do React: alternar a cada `pointermove`
      // via `setState` recriaria o componente a 60fps só para trocar um cursor.
      // `event.altKey` é o estado do modificador NO EVENTO — nunca desalinha com
      // Alt de verdade solto fora da janela (blur, alt-tab), ao contrário de
      // rastrear via keydown/keyup à parte.
      svgRef.current?.classList.toggle("canvas--alt", event.altKey);

      // Prévia de `Alt`+hover: só faz sentido parado (nenhum gesto em curso) e com
      // `Alt` de verdade pressionado — do contrário é a linha de conexão de verdade
      // (`connecting`) que já cobre o feedback visual.
      const idle = !drag && !connecting && !creating && !resizing && !marquee;
      if (idle && event.altKey) {
        const target = topmostNodeAt(diagram, at);
        setAltHover(target ? { nodeId: target, at } : null);
      } else if (altHover) {
        setAltHover(null);
      }
    };
    const onUp = (event: PointerEvent) => {
      if (panningRef.current) {
        panningRef.current = null;
        svgRef.current?.classList.remove("canvas--panning");
        return;
      }

      const at = toWorld(event);
      actions.endDrag(at);
      actions.endConnect(at);
      actions.endCreate();
      actions.endResize(at);
      actions.endMarquee(at);
    };
    // Soltar `Alt` sem mover o mouse não dispara `pointermove` — sem isto a borda e
    // a seta da prévia ficariam penduradas na tela até o próximo movimento.
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Alt") return;
      svgRef.current?.classList.remove("canvas--alt");
      setAltHover(null);
    };
    const onKey = (event: KeyboardEvent) => {
      // Digitando num campo (a busca da paleta, um rótulo), o teclado é dele:
      // `Ctrl+Z` ali desfaz o texto, não o diagrama.
      if (isTyping(event.target)) return;

      if (event.key === "Escape") {
        // Cancelar o gesto em curso tem prioridade, e quem sabe se há um é a
        // própria sessão (pelas refs) — não o estado deste componente.
        if (actions.cancelGesture()) return;
        if (tool !== "select") actions.setTool("select");
        else actions.clearSelection();
        return;
      }
      // `Enter` com exatamente um nó selecionado abre a edição do rótulo: com dois,
      // não há qual editar.
      if (event.key === "Enter" && !editing) {
        const [only] = [...selection.nodes];
        if (only && selection.nodes.size === 1) {
          event.preventDefault();
          actions.beginEditLabel(only);
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        actions.deleteSelected();
        return;
      }

      const accel = event.ctrlKey || event.metaKey;
      if (!accel) {
        const shortcut = TOOL_KEYS[event.key.toLowerCase()];
        if (shortcut) actions.setTool(shortcut);
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "z") {
        // `Ctrl+Shift+Z` refaz — a convenção mais comum fora do Windows.
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
      } else if (key === "y") {
        event.preventDefault();
        actions.redo();
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  /**
   * Rolar o scroll SEMPRE dá zoom — não só com `Ctrl`/`Cmd` como antes. Pan por
   * scroll saiu: quem move a câmera sem zoom agora é o arrasto com o botão do meio
   * ou o direito (`beginPan`, abaixo) — dois gestos, dois dedos/botões diferentes,
   * sem sobrepor. De quebra, gesto de pinça no trackpad (que o browser reporta como
   * `wheel` com `ctrlKey: true`) já cai no mesmo caminho, sem precisar de um `if`.
   */
  const onWheel = (event: React.WheelEvent) => {
    // Só o eixo VERTICAL zoom — sem isto, um swipe horizontal de trackpad
    // (`deltaX` puro, `deltaY === 0`) cairia no `else` do zoom por não ser "< 0",
    // e uma rolagem de lado nenhuma dar zoom OUT do nada. Pan por scroll já não
    // existe mais (é o arrasto de `beginPan` agora); `deltaX` sem `deltaY` não tem
    // mais o que fazer aqui.
    if (event.deltaY === 0) return;

    const box = svgRef.current?.getBoundingClientRect();
    const at = { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
    actions.zoom(at, event.deltaY < 0 ? 1.1 : 1 / 1.1);
  };

  /**
   * Começa o pan com o botão do meio (`1`) ou o direito (`2`).
   *
   * `onPointerDownCapture`, e não `onPointerDown`: a fase de CAPTURA roda de cima
   * pra baixo, ANTES da de borbulhamento — intercepta o evento antes que ele chegue
   * a um nó/aresta e o `stopPropagation()` de lá o impeça de subir. Sem isto,
   * clicar o botão direito EM CIMA de um nó começaria a arrastar o nó (o handler
   * dele não filtra por botão), não a câmera. O `stopPropagation()` aqui é o
   * espelho: impede o evento de descer mais e acionar qualquer gesto de botão
   * esquerdo por baixo — pan é o ÚNICO gesto possível depois disto.
   */
  const beginPan = (event: React.PointerEvent) => {
    if (event.button !== 1 && event.button !== 2) return;
    event.preventDefault(); // sem isto, o botão do meio dispara o autoscroll do browser
    event.stopPropagation();
    panningRef.current = { x: event.clientX, y: event.clientY };
    svgRef.current?.classList.add("canvas--panning");
  };

  /**
   * As alças de redimensionamento renderizam sempre que não há outro gesto em
   * curso — a visibilidade de fato (hover, ou seleção única sem hover) é CSS, em
   * `NodeView`. Não depende mais de "é o único selecionado": a pessoa vê a alça de
   * qualquer nó só passando o mouse por cima, sem precisar selecionar primeiro.
   */
  const canShowHandles = !drag && !connecting && !marquee && !creating;

  /**
   * `soloSelected` é DIFERENTE de "está na seleção": com dois nós selecionados,
   * `displaySelection.nodes.has(id)` vale `true` para os dois — mas nenhum é o
   * único. Passar o `selected` genérico para a regra de "alça sempre visível"
   * faria os dois mostrarem alça sem precisar de hover, na seleção múltipla.
   */
  const isSoloSelected = (nodeId: NodeId) =>
    displaySelection.nodes.size === 1 &&
    displaySelection.edges.size === 0 &&
    displaySelection.nodes.has(nodeId);

  /**
   * `rectOf` da sessão pede um `DiagramNode`; a camada de arestas só tem o `NodeId`
   * (é tudo que `Edge` guarda). Este adaptador é o único lugar que faz essa ponte —
   * garante que aresta e nó leem exatamente a mesma prévia durante um arrasto ou
   * redimensionamento, em vez de duas fontes que podem divergir.
   */
  const rectOfId = (id: NodeId) => {
    const node = diagram.node(id);
    return node ? rectOf(node) : undefined;
  };

  return (
    <>
      <svg
        ref={svgRef}
        className={[
          "canvas",
          connecting ? "canvas--connecting" : "",
          tool === "select" ? "" : "canvas--creating",
        ]
          .filter(Boolean)
          .join(" ")}
        onWheel={onWheel}
        onPointerDownCapture={beginPan}
        // Sem isto, soltar o botão direito depois de arrastar (ou mesmo um clique
        // direito parado) abriria o menu de contexto do sistema por cima do canvas.
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          if (event.target !== svgRef.current) return; // nó ou aresta: handler deles
          // Só o botão ESQUERDO cria/seleciona aqui. Meio e direito já viraram pan
          // em `beginPan` (capturado antes deste handler rodar) — o filtro por
          // `button` é redundância de propósito: os dois handlers estão no MESMO
          // elemento (o `<svg>`), e depender só da ordem capture-antes-de-bubble
          // pro caso "clicou direto no fundo vazio" é frágil demais pra confiar.
          if (event.button !== 0) return;

          // No vazio: com ferramenta de forma ativa, começa a criar; com a de
          // seleção, começa o retângulo de seleção — a decisão entre "foi clique" e
          // "foi arrasto" só se resolve no `endMarquee`, pelo limiar de deslocamento.
          if (tool === "select") actions.beginMarquee(toWorld(event), event.shiftKey);
          else actions.beginCreate(toWorld(event));
        }}
      >
        <ArrowMarkers />

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {/* Arestas primeiro: ficam ATRÁS dos nós, para o logo nunca ser cortado. */}
          <EdgeLayer
            diagram={diagram}
            selected={displaySelection.edges}
            onSelect={actions.selectEdge}
            onCycleStyle={actions.cycleEdgeStyle}
            rectOf={rectOfId}
          />

          {connecting && <ConnectingLine session={session} />}
          {/* Não junto com `connecting`: a linha de arrasto de verdade já cobre o
              feedback assim que o gesto começa — a borda+seta é só do momento ANTES,
              enquanto ainda se decide de onde puxar. */}
          {!connecting && altHover && (
            <AltConnectPreview diagram={diagram} hover={altHover} scale={viewport.scale} />
          )}
          {creating && <CreationPreview session={session} />}
          {marquee && <MarqueeBox session={session} />}

          {diagram.nodesInDrawOrder.map((node) => (
            <NodeView
              key={node.id}
              node={node}
              diagram={diagram}
              selected={displaySelection.nodes.has(node.id)}
              rect={rectOf(node)}
              handles={canShowHandles}
              soloSelected={isSoloSelected(node.id)}
              scale={viewport.scale}
              onPointerDown={(event) => {
                event.stopPropagation();
                // `Ctrl`+clique (`Cmd` no Mac) troca de gesto por completo — não
                // seleciona nem arrasta, mesma regra do Ctrl+clique numa aresta
                // (`EdgeLayer`) — e cicla o que a variante tem pra ciclar: estilo de
                // preenchimento/contorno na forma, texto/código no texto. O mesmo
                // atalho nas três coisas que têm "estilo" no app (forma, aresta,
                // texto), em vez de cada uma ter o próprio gatilho. Em ícone não faz
                // nada — cai no caminho de sempre.
                if (event.ctrlKey || event.metaKey) {
                  if (node.content.kind === "shape") {
                    actions.cycleShapeStyle(node.id);
                    return;
                  }
                  if (node.content.kind === "text") {
                    actions.cycleTextFormat(node.id);
                    return;
                  }
                }
                // `Alt`+arrastar de QUALQUER lugar do nó conecta, em vez de mover —
                // um atalho mais rápido do que mirar na setinha do lado direito.
                // `Alt`+CLIQUE (sem arrastar) é o mesmo gesto sem deslocamento — e
                // `endConnect` reaproveita esse caso pra alternar o formato de um nó
                // de texto (código/simples), em vez de só desistir da conexão em
                // silêncio. Não há ramificação aqui: os dois casos começam iguais
                // (`beginConnect`), e só o `pointerup` decide o que aconteceu.
                if (event.altKey) {
                  actions.beginConnect(node.id, toWorld(event));
                  return;
                }
                // A seleção é resolvida dentro do `beginDrag`, e não numa chamada
                // separada antes: dois `setState` em sequência não são visíveis um
                // para o outro no mesmo evento.
                actions.beginDrag(node.id, toWorld(event), event.shiftKey);
              }}
              onStartConnect={(event) => actions.beginConnect(node.id, toWorld(event))}
              onEditLabel={() => actions.beginEditLabel(node.id)}
              onStartResize={(handle, event) =>
                actions.beginResize(node.id, handle, toWorld(event))
              }
              hidden={editing === node.id}
            />
          ))}
        </g>
      </svg>

      <Minimap
        diagram={diagram}
        viewport={viewport}
        canvasSize={canvasSize}
        onPanBy={actions.panBy}
      />
      <ZoomControls viewport={viewport} canvasSize={canvasSize} onZoom={actions.zoom} />
    </>
  );
};

/** Atalhos de ferramenta. */
const TOOL_KEYS: Record<string, Tool | undefined> = {
  v: "select",
  r: "rect",
  o: "ellipse",
  d: "diamond",
  t: "text",
  c: "umlClass",
  p: "umlPackage",
};

/** Prévia do tamanho enquanto se arrasta para criar. */
const CreationPreview = ({ session }: { session: EditorSession }) => {
  const { creating } = session;
  if (!creating) return null;

  const x = Math.min(creating.from.x, creating.to.x);
  const y = Math.min(creating.from.y, creating.to.y);
  const w = Math.abs(creating.to.x - creating.from.x);
  const h = Math.abs(creating.to.y - creating.from.y);
  if (w < 1 || h < 1) return null;

  return <rect x={x} y={y} width={w} height={h} className="creation-preview" />;
};

/** O retângulo de seleção, enquanto se arrasta no vazio com a ferramenta seleção. */
const MarqueeBox = ({ session }: { session: EditorSession }) => {
  const { marquee } = session;
  if (!marquee) return null;

  const box = marqueeBox(marquee.from, marquee.to);
  return <rect x={box.x} y={box.y} width={box.w} height={box.h} className="marquee-box" />;
};

/** A linha que segue o cursor enquanto se arrasta uma conexão. */
const ConnectingLine = ({ session }: { session: EditorSession }) => {
  const { diagram, connecting } = session;
  if (!connecting) return null;

  const source = diagram.node(connecting.from);
  if (!source) return null;

  // Sai da borda do nó na direção do cursor: um segmento degenerado (cursor sobre o
  // centro) simplesmente não é desenhado.
  const cursor = { x: connecting.at.x, y: connecting.at.y, w: 1, h: 1 };
  const points = attachPoints(source.rect, cursor);
  if (!points) return null;

  return (
    <line
      x1={points[0].x}
      y1={points[0].y}
      x2={connecting.at.x}
      y2={connecting.at.y}
      className="edge-preview"
      markerEnd="url(#arrow)"
    />
  );
};

/**
 * Prévia do `Alt`+hover: borda azul em volta do nó sob o cursor, e uma seta saindo
 * dessa borda na direção do cursor — avisa, ANTES de arrastar, que o próximo arrasto
 * conecta, e de que lado a aresta vai sair. Gira em torno do nó conforme o cursor se
 * move: reusa `attachPoints` (o MESMO cálculo do encaixe real da aresta) tratando o
 * cursor como um alvo de tamanho zero, então a seta da prévia já aponta para onde o
 * encaixe de verdade cairia.
 */
const AltConnectPreview = ({
  diagram,
  hover,
  scale,
}: {
  diagram: EditorSession["diagram"];
  hover: { nodeId: NodeId; at: Point };
  scale: number;
}) => {
  const node = diagram.node(hover.nodeId);
  if (!node) return null;

  const cursor = { x: hover.at.x, y: hover.at.y, w: 1, h: 1 };
  const points = attachPoints(node.rect, cursor);
  const c = center(node.rect);
  // Cursor sobre o centro (ponto degenerado): sem direção definida, a seta cai no
  // mesmo lugar do ponto de conexão fixo — a leste — em vez de sumir.
  const point = points?.[0] ?? { x: node.rect.x + node.rect.w, y: c.y };
  const angle = (Math.atan2(point.y - c.y, point.x - c.x) * 180) / Math.PI;

  // A seta não fica EM CIMA da borda: nos quatro pontos cardeais ela cairia
  // exatamente sobre a alça de meio-de-lado (mesma coincidência de pixel que o
  // ponto de conexão fixo tem com a alça leste). Empurra pra fora, ao longo da
  // mesma direção, por uma distância de TELA — não de mundo, senão a folga some
  // a zoom baixo.
  const ARROW_GAP_SCREEN = 16;
  const dist = Math.hypot(point.x - c.x, point.y - c.y) || 1;
  const dir = { x: (point.x - c.x) / dist, y: (point.y - c.y) / dist };
  const gap = ARROW_GAP_SCREEN / scale;
  const arrowAt = { x: point.x + dir.x * gap, y: point.y + dir.y * gap };
  // Seta com tamanho de TELA, não de mundo — a mesma técnica do ponto de conexão
  // fixo em `NodeView`.
  const arrowScale = 1.3 / scale;

  return (
    <g className="alt-connect-preview">
      <rect
        x={node.rect.x}
        y={node.rect.y}
        width={node.rect.w}
        height={node.rect.h}
        className="alt-connect-border"
      />
      <g transform={`translate(${arrowAt.x} ${arrowAt.y}) rotate(${angle}) scale(${arrowScale})`}>
        <path d="M -4 -6 L 9 0 L -4 6 Z" className="alt-connect-arrow" />
      </g>
    </g>
  );
};

/**
 * As pontas de seta.
 *
 * Duas, porque `marker` não herda a cor do traço de forma confiável entre browsers:
 * a selecionada tem a sua.
 */
const ArrowMarkers = () => (
  <defs>
    {[
      { id: "arrow", className: "arrow-head" },
      { id: "arrow-selected", className: "arrow-head arrow-head--selected" },
    ].map(({ id, className }) => (
      <marker
        key={id}
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" className={className} />
      </marker>
    ))}
  </defs>
);
