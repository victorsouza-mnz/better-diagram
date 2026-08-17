import { useCallback, useEffect, useRef, useState } from "react";

import { Diagram } from "../../domain/diagram/Diagram.js";
import { rect, type Point, type Rect } from "../../domain/shared/geometry.js";
import { NodeId } from "../../domain/shared/ids.js";
import type { DiagramNode } from "../../domain/diagram/Node.js";
import {
  resizedRect,
  resizedRectPreservingAspect,
  type ResizeHandle,
} from "../../domain/diagram/services/resizeGeometry.js";
import { preservesAspectRatio } from "../../domain/diagram/NodeContent.js";
import type { TextAlign } from "../../domain/diagram/TextAlign.js";
import type { TextFormat } from "../../domain/diagram/TextFormat.js";
import type { EdgeStyle } from "../../domain/diagram/EdgeStyle.js";
import type { ShapeStyle } from "../../domain/diagram/ShapeStyle.js";
import { History } from "../../application/history/History.js";
import {
  EMPTY_SELECTION,
  isEmpty,
  of as selectionOf,
  onlyEdge,
  toggleEdge,
  onlyNodes,
  union as unionSelection,
  withNode,
  withoutNode,
  type Selection,
} from "../../application/Selection.js";
import { contains, containsRect } from "../../domain/shared/geometry.js";
import type { EdgeId } from "../../domain/shared/ids.js";
import { downloadJson, pickJsonFile } from "../../infrastructure/file/fileTransfer.js";
import {
  DEFAULT_SHAPE_SIZE,
  DEFAULT_UML_CLASS_SIZE,
  UML_CLASS_TEMPLATE,
} from "../../application/editing.js";
import type { ShapeKind } from "../../domain/diagram/NodeContent.js";
import { CURRENT_DIAGRAM_ID, catalog, useCases } from "../composition.js";
import { initialViewport, pan, zoomAt, type Viewport } from "../canvas/viewport.js";
import { textHeightFor } from "../canvas/measureText.js";
import { useAutosave } from "./useAutosave.js";

/**
 * Estado de sessão do editor + fio até os casos de uso.
 *
 * A regra que este arquivo existe para respeitar: DURANTE o arrasto nada chama caso
 * de uso. O deslocamento vive em `drag`, aqui, e a apresentação desenha os nós
 * afetados deslocados. Só no `endDrag` uma única execução de `MoveNodes` comete a
 * mudança — uma interação, uma transação, uma entrada de undo.
 *
 * As implementações concretas ficam no composition root (`../composition.ts`) —
 * este arquivo só conhece casos de uso.
 */

/** Deslocamento mínimo para um arrasto contar como mover, e não como clique. */
const DRAG_THRESHOLD = 3;

interface DragState {
  readonly ids: readonly NodeId[];
  readonly from: Point;
  readonly dx: number;
  readonly dy: number;
  /** Nó em que o ponteiro desceu — o candidato a sair da seleção no `Shift`. */
  readonly pressed: NodeId;
  readonly togglesOff: boolean;
  readonly additive: boolean;
}

/**
 * Ferramenta ativa.
 *
 * Estado de SESSÃO: não entra no documento nem no histórico. Ninguém quer desfazer
 * "troquei de ferramenta".
 */
export type Tool = "select" | "rect" | "ellipse" | "diamond" | "text" | "umlClass" | "umlPackage";

export const SHAPE_TOOLS: Record<string, ShapeKind> = {
  rect: "rect",
  ellipse: "ellipse",
  diamond: "diamond",
  umlClass: "umlClass",
  umlPackage: "umlPackage",
};

/**
 * Tamanho padrão e rótulo inicial de uma forma recém-criada — a mesma regra vale
 * pro clique da ferramenta (`endCreate`) e pro arrasto da paleta (`addShapeAt`):
 * caixa de classe é mais alta (três compartimentos) e já nasce com o exemplo
 * preenchido; toda outra forma nasce no tamanho comum, sem rótulo.
 */
const shapeDefaults = (shape: ShapeKind): { size: { w: number; h: number }; label?: string } =>
  shape === "umlClass"
    ? { size: DEFAULT_UML_CLASS_SIZE, label: UML_CLASS_TEMPLATE }
    : { size: DEFAULT_SHAPE_SIZE, label: undefined };

/** Arrasto de criação em curso. */
interface CreateState {
  readonly tool: Tool;
  readonly from: Point;
  readonly to: Point;
}

/** Deslocamento mínimo para o arrasto definir o tamanho, em vez de virar clique. */
const CREATE_THRESHOLD = 5;

/**
 * Retângulo normalizado do arrasto de criação.
 *
 * Normaliza porque arrastar para cima e para a esquerda é tão válido quanto para
 * baixo e para a direita — e o agregado recusa largura ou altura não positivas.
 * Arrasto curto demais vira o tamanho padrão: um clique acidental não pode criar uma
 * forma de 2px que ninguém consegue pegar depois.
 */
const creationRect = (state: CreateState, fallback: { w: number; h: number }): Rect => {
  const w = Math.abs(state.to.x - state.from.x);
  const h = Math.abs(state.to.y - state.from.y);

  if (w < CREATE_THRESHOLD || h < CREATE_THRESHOLD) {
    return rect(
      state.from.x - fallback.w / 2,
      state.from.y - fallback.h / 2,
      fallback.w,
      fallback.h,
    );
  }
  return rect(Math.min(state.from.x, state.to.x), Math.min(state.from.y, state.to.y), w, h);
};

/** Redimensionamento em curso. */
interface ResizeState {
  readonly id: NodeId;
  readonly handle: ResizeHandle;
  readonly from: Point;
  readonly dx: number;
  readonly dy: number;
}

/** Arrasto de conexão em curso: de onde saiu e onde o cursor está. */
interface ConnectState {
  readonly from: NodeId;
  readonly at: Point;
}

/** Retângulo de seleção em curso. */
interface MarqueeState {
  readonly from: Point;
  readonly to: Point;
  /** `Shift` estava pressionado ao começar: soma à seleção em vez de substituir. */
  readonly additive: boolean;
}

/**
 * O retângulo normalizado de um marquee — mesma forma da `CreationPreview`: só
 * min/max, sem passar pelo `rect()` do domínio. Enquanto o arrasto mal começou,
 * `w`/`h` podem ser zero, e `rect()` recusaria isso (documento não aceita dimensão
 * não positiva); aqui é geometria efêmera de tela, nunca vai para o agregado.
 */
export const marqueeBox = (from: Point, to: Point): Rect => ({
  x: Math.min(from.x, to.x),
  y: Math.min(from.y, to.y),
  w: Math.abs(to.x - from.x),
  h: Math.abs(to.y - from.y),
});

/**
 * O que um retângulo de seleção abrange.
 *
 * As duas regras vêm da spec (`editor/canvas-selecao-e-arrasto.md`):
 *
 * - Nó entra por CONTENÇÃO INTEIRA, nunca por interseção — o retângulo desenhado É
 *   a resposta, sem elemento entrando "de raspão" pela borda.
 * - Aresta entra pelos DOIS NÓS que ela liga, não pelo desenho da curva: arrastar
 *   uma caixa ao redor de dois nós conectados também seleciona a ligação; ao redor
 *   de só um, não — mesmo que o arco do feixe cruze o retângulo.
 *
 * Exportada (e não só interna à sessão) porque a apresentação chama a MESMA função
 * para pintar o destaque ao vivo durante o arrasto — a prévia é o resultado final,
 * a mesma regra que já vale para redimensionar.
 */
export const withinMarquee = (diagram: Diagram, box: Rect): Selection => {
  const nodes = diagram.nodes.filter((node) => containsRect(box, node.rect));
  const containedIds = new Set(nodes.map((node) => node.id));
  const edges = diagram.edges.filter(
    (edge) => containedIds.has(edge.source) && containedIds.has(edge.target),
  );
  return selectionOf(
    nodes.map((node) => node.id),
    edges.map((edge) => edge.id),
  );
};

/**
 * Registra um gesto: escreve a ref NA HORA e agenda o estado.
 *
 * O ciclo de vida da ref é fechado e vale para os quatro gestos: `begin` escreve,
 * `update` altera, `end` e `cancel` limpam. Nenhum deles pode faltar — a ref não é
 * mais sincronizada no render, então uma ref esquecida faz o gesto seguinte não
 * começar.
 *
 * A ref é o registro autoritativo de "há um gesto em curso"; o estado existe para
 * desenhar a prévia. Sem escrever a ref no início, um `Esc` ou um `pointerup` que
 * chegue antes do próximo render não encontra gesto nenhum — e o gesto acaba
 * commitado justamente quando a pessoa pediu para cancelar.
 */
const startGesture = <T,>(
  setState: (value: T) => void,
  ref: { current: T | null },
  gesture: T,
): void => {
  ref.current = gesture;
  setState(gesture);
};

/**
 * O retângulo de um redimensionamento em curso — prévia e commit chamam esta MESMA
 * função, com o MESMO deslocamento, para nunca divergir.
 *
 * Nó de ícone usa a alça-consciente `resizedRectPreservingAspect`: o lado oposto à
 * alça fica parado e funciona também nas alças laterais. Sem essa trava, a prévia
 * mostraria um retângulo livre — dando a entender que o desenho vai esticar — para
 * só depois, ao soltar, `DiagramNode.resizedTo` reencaixar a proporção e "corrigir"
 * a imagem para outro tamanho e posição. Calculando a mesma conta aqui, a prévia já
 * É o resultado final.
 *
 * Nó de TEXTO é um terceiro caso: a alça decide LARGURA e ALTURA livremente, como
 * numa forma — mas a altura tem um PISO que a forma não tem: nunca fica menor que o
 * necessário para as linhas que o rótulo forma na largura resultante. Abaixo do
 * mínimo genérico de 16px (que vale para todos), o texto teria altura de sobra
 * sobrando mas cortaria linha por dentro sem nenhum aviso na tela — o piso aqui é
 * o mesmo tipo de trava, só que o valor vem do conteúdo, não de uma constante.
 * ESTICAR além do piso é sempre livre: é o que sobra de espaço para o alinhamento
 * vertical (topo/meio/baixo) decidir onde o texto senta dentro da caixa.
 */
const previewResize = (node: DiagramNode, handle: ResizeHandle, dx: number, dy: number): Rect => {
  if (preservesAspectRatio(node.content)) {
    return resizedRectPreservingAspect(node.rect, handle, dx, dy, node.rect.w / node.rect.h);
  }

  const free = resizedRect(node.rect, handle, dx, dy);
  if (node.content.kind !== "text") return free;

  const minHeight = textHeightFor(node.label, free.w);
  if (free.h >= minHeight) return free; // dentro do piso: a alça manda, como numa forma.

  // Abaixo do piso: trava nele, ancorada no mesmo lado que `resizedRect` já
  // ancoraria — alça "n"/"ne"/"nw" arrasta o topo, então é o fundo que fica parado.
  const y = handle.includes("n") ? node.rect.y + node.rect.h - minHeight : node.rect.y;
  return rect(free.x, y, free.w, minHeight);
};

/**
 * Nó sob um ponto do mundo, o de cima primeiro.
 *
 * Usa a área RETANGULAR do nó, e não o traço do vetor — mesma regra da área de
 * clique: soltar uma conexão num vão transparente do logo tem que valer.
 */
export const topmostNodeAt = (diagram: Diagram, at: Point): NodeId | undefined =>
  [...diagram.nodesInDrawOrder].reverse().find((node) => contains(node.rect, at))?.id;

export const useEditorSession = () => {
  const [history, setHistory] = useState(() => History.of(Diagram.empty(CURRENT_DIAGRAM_ID)));
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [connecting, setConnecting] = useState<ConnectState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [creating, setCreating] = useState<CreateState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [editing, setEditing] = useState<NodeId | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const diagram = history.present.diagram;
  const selection = history.present.selection;

  /**
   * PONTO ÚNICO DE COMMIT.
   *
   * Toda mudança de documento passa por aqui, e é aqui que ela entra no histórico.
   * Nada mais define o diagrama. Sem essa regra, uma feature futura muda o documento
   * sem empilhar entrada, e a pessoa só descobre quando o `Ctrl+Z` pula uma ação.
   */
  const commit = useCallback(
    (next: Diagram, selectionAfter: Selection, label: string) => {
      setHistory((h) => h.commit(next, selectionAfter, label));
    },
    [],
  );

  /** Selecionar não é mudança de documento: troca o presente, sem criar entrada. */
  const setSelection = useCallback((next: Selection) => {
    setHistory((h) => h.withSelection(next));
  }, []);

  // Carga inicial: o app reabre no diagrama onde a pessoa parou, sem perguntar nada.
  useEffect(() => {
    let cancelled = false;

    useCases.loadDiagram
      .execute(CURRENT_DIAGRAM_ID)
      .then((saved) => {
        // O que veio do storage é o estado ZERO do histórico: não existe
        // "desfazer a abertura do app".
        if (!cancelled) setHistory(History.of(saved));
      })
      .catch(() => {
        // Storage indisponível (modo privativo, cota) não pode impedir de desenhar:
        // o app abre com um diagrama novo e avisa que não vai conseguir guardar.
        if (!cancelled) {
          setNotice("Não foi possível abrir o diagrama salvo. O que você fizer agora pode não ser guardado.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveState = useAutosave(diagram, loaded);

  const clearSelection = useCallback(() => setSelection(EMPTY_SELECTION), []);

  /**
   * Pressionar um nó já resolve a seleção, em vez de deixar isso para um `select`
   * separado antes: o `select` enfileirado ainda não teria sido aplicado quando o
   * arrasto lesse a seleção, e `Shift`+arrastar acabaria movendo só o último nó.
   */
  const beginDrag = useCallback(
    (id: NodeId, at: Point, additive: boolean) => {
      // Pegar um nó fora da seleção passa a arrastar só ele — é o que a pessoa
      // espera ao agarrar algo que não estava selecionado.
      const next = additive
        ? withNode(selection, id)
        : selection.nodes.has(id)
          ? selection
          : onlyNodes([id]);

      setSelection(next);
      // A ref é escrita AQUI, e não no render: um `Esc` ou um `pointerup` imediato
      // chega antes do React renderizar, e precisa encontrar o gesto registrado.
      // A ref é o registro do gesto em curso; o estado serve para desenhar.
      startGesture(setDrag, dragRef, {
        ids: [...next.nodes],
        from: at,
        dx: 0,
        dy: 0,
        pressed: id,
        // `Shift` num nó JÁ selecionado só tira da seleção se não virar arrasto —
        // decidido no `endDrag`, quando se sabe se houve movimento.
        togglesOff: additive && selection.nodes.has(id),
        additive,
      });
    },
    [selection],
  );

  /** Só mexe em estado de sessão. Nenhum caso de uso é chamado por frame. */
  const updateDrag = useCallback((at: Point) => {
    const current = dragRef.current;
    if (!current) return;
    const next = { ...current, dx: at.x - current.from.x, dy: at.y - current.from.y };
    dragRef.current = next;
    setDrag(next);
  }, []);

  /**
   * Fecha o arrasto usando o ponto do PRÓPRIO `pointerup`.
   *
   * O deslocamento acumulado em `drag` só chega aqui depois de um render, e o
   * `pointerup` pode vir antes disso — uma sequência rápida de `pointermove` é
   * agrupada pelo React, e o commit acabava usando o delta do primeiro movimento.
   * O evento de soltar sempre carrega a posição final; `from` está fixo desde o
   * começo. Os dois juntos não dependem de quando o React renderizou.
   */
  const endDrag = useCallback((at?: Point) => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;

    const dx = at ? at.x - current.from.x : current.dx;
    const dy = at ? at.y - current.from.y : current.dy;

    // O commit fica FORA de qualquer updater de estado. Um updater precisa ser
    // função pura: o StrictMode do React o executa duas vezes em dev justamente
    // para expor efeito colateral escondido ali dentro — e `setDiagram` dentro do
    // updater de `setDrag` aplicava o deslocamento duas vezes.
    const moved = Math.hypot(dx, dy) >= DRAG_THRESHOLD;

    if (moved) {
      // Um arrasto inteiro é UMA entrada de histórico, não uma por frame.
      commit(
        useCases.moveNodes.execute({ diagram, ids: current.ids, dx, dy }),
        selection,
        "Mover",
      );
    } else if (current.togglesOff) {
      setSelection(withoutNode(selection, current.pressed));
    } else if (!current.additive && (selection.nodes.size > 1 || selection.edges.size > 0)) {
      // CLICAR num nó de uma seleção múltipla reduz a seleção a ele. Só o ARRASTO é
      // que preserva o conjunto — é o que permite mover vários de uma vez sem
      // perder a seleção, e ao mesmo tempo isolar um deles com um clique simples.
      setSelection(onlyNodes([current.pressed]));
    }

  }, [diagram, selection, commit, setSelection]);

  /**
   * `Esc` no meio do arrasto: descarta o deslocamento e não grava nada.
   *
   * Limpa a REF junto do estado. O `pointerup` que vem logo depois lê a ref, e ela
   * só se atualizaria no próximo render — o gesto cancelado seria commitado mesmo
   * assim.
   */
  const cancelDrag = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  // ------------------------------------------------------------------ conectar

  const beginConnect = useCallback((from: NodeId, at: Point) => {
    startGesture(setConnecting, connectingRef, { from, at });
  }, []);

  /** Só estado de sessão: a linha segue o cursor, o documento não é tocado. */
  const updateConnect = useCallback((at: Point) => {
    const current = connectingRef.current;
    if (!current) return;
    const next = { ...current, at };
    connectingRef.current = next;
    setConnecting(next);
  }, []);

  /**
   * Solta a conexão.
   *
   * Sem alvo válido — vazio — nada é criado e nada é avisado. Desistir no meio é o
   * caso comum, não erro.
   *
   * Soltar em cima do PRÓPRIO nó de origem é o formato de um `Alt`+clique sem
   * arrastar (começou e terminou no mesmo nó — `beginConnect` já disparou no
   * `pointerdown`, então um clique puro sempre cai aqui). Em nó de texto, esse
   * "clique com Alt" é reaproveitado como um atalho de canvas: alterna entre texto
   * simples e código, sem abrir o painel de propriedades — mesmo espírito do
   * Ctrl+clique numa aresta (`cycleEdgeStyle`), reagindo ao MESMO gesto que já
   * existia (`Alt`+algo num nó), não um listener novo. Nas outras variantes (forma,
   * ícone) continua sem fazer nada, exatamente como antes desta entrega.
   */
  const endConnect = useCallback(
    (at: Point) => {
      const current = connectingRef.current;
      connectingRef.current = null;
      setConnecting(null);
      if (!current) return;

      const target = topmostNodeAt(diagramRef.current, at);
      if (!target) return;

      if (target === current.from) {
        const node = diagramRef.current.node(current.from);
        if (node?.content.kind === "text") {
          commit(
            useCases.cycleTextFormat.execute({ diagram: diagramRef.current, id: node.id }),
            selectionRef.current,
            "Mudar formato do texto",
          );
        }
        return;
      }

      commit(
        useCases.connectNodes.execute({
          diagram: diagramRef.current,
          source: current.from,
          target,
        }),
        selectionRef.current,
        "Conectar",
      );
    },
    [commit],
  );

  const cancelConnect = useCallback(() => {
    connectingRef.current = null;
    setConnecting(null);
  }, []);

  // ------------------------------------------------------- seleção retangular

  const beginMarquee = useCallback((at: Point, additive: boolean) => {
    startGesture(setMarquee, marqueeRef, { from: at, to: at, additive });
  }, []);

  /** Só estado de sessão: o retângulo e o destaque ao vivo acompanham o cursor. */
  const updateMarquee = useCallback((at: Point) => {
    const current = marqueeRef.current;
    if (!current) return;
    const next = { ...current, to: at };
    marqueeRef.current = next;
    setMarquee(next);
  }, []);

  /**
   * Solta o retângulo de seleção.
   *
   * Abaixo do limiar de arrasto é CLIQUE no vazio, não seleção retangular vazia —
   * mesma regra do `endDrag`. Não aditivo, limpa a seleção (era o que o
   * `pointerdown` fazia direto antes de existir o marquee); aditivo, `Shift`+clique
   * no vazio não faz nada — não há o que somar.
   */
  const endMarquee = useCallback(
    (at?: Point) => {
      const current = marqueeRef.current;
      marqueeRef.current = null;
      setMarquee(null);
      if (!current) return;

      const to = at ?? current.to;
      const moved = Math.hypot(to.x - current.from.x, to.y - current.from.y) >= DRAG_THRESHOLD;

      if (!moved) {
        if (!current.additive) setSelection(EMPTY_SELECTION);
        return;
      }

      const inside = withinMarquee(diagramRef.current, marqueeBox(current.from, to));
      setSelection(current.additive ? unionSelection(selectionRef.current, inside) : inside);
    },
    [setSelection],
  );

  /** `Esc` no meio do arrasto: descarta o retângulo, não muda a seleção. */
  const cancelMarquee = useCallback(() => {
    marqueeRef.current = null;
    setMarquee(null);
  }, []);

  // -------------------------------------------------------- redimensionar

  const beginResize = useCallback((id: NodeId, handle: ResizeHandle, at: Point) => {
    startGesture(setResizing, resizingRef, { id, handle, from: at, dx: 0, dy: 0 });
  }, []);

  /** Só estado de sessão: a prévia acompanha, o documento não é tocado. */
  const updateResize = useCallback((at: Point) => {
    const current = resizingRef.current;
    if (!current) return;
    const next = { ...current, dx: at.x - current.from.x, dy: at.y - current.from.y };
    resizingRef.current = next;
    setResizing(next);
  }, []);

  const endResize = useCallback((at?: Point) => {
    const current = resizingRef.current;
    resizingRef.current = null;
    setResizing(null);
    if (!current) return;

    const node = diagramRef.current.node(current.id);
    if (!node) return;

    // Mesma regra do `endDrag`: o ponto final vem do `pointerup`, não do delta
    // acumulado — que pode estar um render atrasado.
    const dx = at ? at.x - current.from.x : current.dx;
    const dy = at ? at.y - current.from.y : current.dy;
    const target = previewResize(node, current.handle, dx, dy);
    // Arrasto que não mudou nada não vira entrada de histórico.
    if (target.w === node.rect.w && target.h === node.rect.h && target.x === node.rect.x) return;

    commit(
      useCases.resizeNode.execute({ diagram: diagramRef.current, id: current.id, target }),
      selectionRef.current,
      "Redimensionar",
    );
  }, [commit]);

  const cancelResize = useCallback(() => {
    resizingRef.current = null;
    setResizing(null);
  }, []);


  /**
   * O retângulo a DESENHAR para um nó — a prévia, quando há arrasto ou
   * redimensionamento em curso.
   *
   * Fica aqui, e não no componente, porque é a mesma regra para os dois gestos: o
   * documento só muda ao soltar, e até lá o que a tela mostra é derivado do estado
   * de sessão.
   */
  const rectOf = useCallback(
    (node: DiagramNode): Rect => {
      if (resizing?.id === node.id) {
        return previewResize(node, resizing.handle, resizing.dx, resizing.dy);
      }
      if (drag?.ids.includes(node.id)) {
        return { ...node.rect, x: node.rect.x + drag.dx, y: node.rect.y + drag.dy };
      }
      return node.rect;
    },
    [resizing, drag],
  );

  // ------------------------------------------------- criar formas e texto

  const beginCreate = useCallback((at: Point) => {
    if (creatingRef.current) return;
    startGesture(setCreating, creatingRef, { tool: toolRef.current, from: at, to: at });
  }, []);

  const updateCreate = useCallback((at: Point) => {
    const current = creatingRef.current;
    if (!current) return;
    const next = { ...current, to: at };
    creatingRef.current = next;
    setCreating(next);
  }, []);

  const endCreate = useCallback(() => {
    const current = creatingRef.current;
    creatingRef.current = null;
    setCreating(null);
    if (!current) return;

    // Criar devolve a ferramenta para "selecionar": o caso comum é criar um e mexer
    // nele em seguida, não criar dez seguidos.
    setTool("select");

    const shape = SHAPE_TOOLS[current.tool];
    if (shape) {
      const { size, label } = shapeDefaults(shape);
      const box = creationRect(current, size);
      const next = useCases.addShapeNode.execute({
        diagram: diagramRef.current,
        shape,
        rect: box,
        label,
      });
      // Nasce selecionado: é quase sempre o que se vai mexer em seguida.
      const created = next.nodes[next.nodes.length - 1];
      commit(next, created ? onlyNodes([created.id]) : EMPTY_SELECTION, "Adicionar forma");
      return;
    }

    if (current.tool === "text") {
      const { diagram: next, id } = useCases.addTextNode.execute({
        diagram: diagramRef.current,
        at: current.from,
      });
      commit(next, onlyNodes([id]), "Adicionar texto");
      // Texto vazio não tem o que mostrar: já abre em edição.
      setEditing(id);
    }
  }, [commit]);

  /**
   * Solta uma forma arrastada da paleta (grupo "Geometria") — mesmo caso de uso e
   * mesmo tamanho padrão de `endCreate`, só que centrado no ponto onde soltou, em
   * vez de derivado de um arrasto de definição de tamanho. Mesma regra de seleção
   * de `addIcon`: NÃO força a seleção pro nó novo — é o mesmo gesto (arrastar da
   * paleta e soltar no canvas), e os dois grupos da paleta devem se comportar
   * igual nesse detalhe, ou a pessoa aprende uma regra por grupo à toa.
   */
  const addShapeAt = useCallback(
    (shape: ShapeKind, at: Point) => {
      const { size, label } = shapeDefaults(shape);
      const box = rect(at.x - size.w / 2, at.y - size.h / 2, size.w, size.h);
      const next = useCases.addShapeNode.execute({
        diagram: diagramRef.current,
        shape,
        rect: box,
        label,
      });
      commit(next, selectionRef.current, "Adicionar forma");
    },
    [commit],
  );

  const cancelCreate = useCallback(() => {
    creatingRef.current = null;
    setCreating(null);
    setTool("select");
  }, []);

  // ------------------------------------------------------ editar rótulo

  const beginEditLabel = useCallback((id: NodeId) => setEditing(id), []);

  /**
   * Grava o rótulo — UMA entrada de histórico, ao sair da edição, nunca uma por
   * tecla digitada.
   *
   * Nó de texto com rótulo vazio persiste, igual forma e ícone com rótulo vazio: a
   * paleta desenha um placeholder para ele continuar achável (ver `NodeLabel`).
   */
  const commitLabel = useCallback(
    (label: string, fit?: Rect) => {
      const id = editingRef.current;
      setEditing(null);
      if (!id) return;

      const node = diagramRef.current.node(id);
      if (!node) return;

      // Sair sem ter mudado nada não vira entrada de histórico: um `Ctrl+Z` que não
      // desfaz nada visível é pior que nenhum. Cobre também o texto recém-criado que
      // sai sem digitar — nasce com rótulo vazio, sai vazio, nada muda.
      if (node.label === label) return;

      commit(
        useCases.setNodeLabel.execute({ diagram: diagramRef.current, id, label, fit }),
        selectionRef.current,
        "Renomear",
      );
    },
    [commit],
  );

  const selectEdge = useCallback(
    (id: EdgeId, additive: boolean) => {
      setSelection(additive ? toggleEdge(selection, id) : onlyEdge(id));
    },
    [selection, setSelection],
  );

  /**
   * Ctrl+clique numa aresta: avança um passo no ciclo de 4 estilos.
   *
   * Ação imediata, sem gesto de arrasto — commit direto, como `deleteSelected`. Não
   * mexe na seleção: cicla o estilo do que foi clicado, selecionado ou não.
   */
  const cycleEdgeStyle = useCallback(
    (id: EdgeId) => {
      commit(
        useCases.cycleEdgeStyle.execute({ diagram: diagramRef.current, id }),
        selectionRef.current,
        "Mudar estilo da aresta",
      );
    },
    [commit],
  );

  /**
   * Clique num botão de estilo do painel: escolha direta (não cicla) — mesmo rótulo
   * de undo do Ctrl+clique, "Mudar estilo da aresta": é a mesma mudança, só que por
   * um gatilho diferente, e as duas entradas precisam ficar indistinguíveis no
   * histórico para não confundir quem está desfazendo.
   */
  const setEdgeStyle = useCallback(
    (id: EdgeId, style: EdgeStyle) => {
      commit(
        useCases.setEdgeStyle.execute({ diagram: diagramRef.current, id, style }),
        selectionRef.current,
        "Mudar estilo da aresta",
      );
    },
    [commit],
  );

  /**
   * Clique num botão de alinhamento do painel: ação imediata, mesmo formato de
   * `cycleEdgeStyle` — sem gesto de arrasto, sem prévia, commit direto.
   */
  const setTextAlign = useCallback(
    (id: NodeId, align: TextAlign) => {
      commit(
        useCases.setTextAlign.execute({ diagram: diagramRef.current, id, align }),
        selectionRef.current,
        "Alinhar texto",
      );
    },
    [commit],
  );

  /** Clique no toggle "Texto simples / Código" do painel — mesmo formato acima. */
  const setTextFormat = useCallback(
    (id: NodeId, format: TextFormat) => {
      commit(
        useCases.setTextFormat.execute({ diagram: diagramRef.current, id, format }),
        selectionRef.current,
        "Mudar formato do texto",
      );
    },
    [commit],
  );

  /**
   * Ctrl+clique num nó de texto: alterna entre texto simples e código — mesmo
   * formato de `cycleShapeStyle`/`cycleEdgeStyle`, pra usar o MESMO gatilho nos três
   * tipos de elemento com estilo (forma, aresta, texto). `Alt`+clique (sem arrastar)
   * continua fazendo a mesma coisa — é o gesto que já existia antes de `Ctrl`+clique
   * chegar aqui (reaproveita o clique-sem-deslocamento do `Alt`+arrasto de conectar,
   * ver `endConnect`) — os dois caminhos chamam o mesmo `CycleTextFormat` por baixo,
   * então nunca divergem.
   */
  const cycleTextFormat = useCallback(
    (id: NodeId) => {
      commit(
        useCases.cycleTextFormat.execute({ diagram: diagramRef.current, id }),
        selectionRef.current,
        "Mudar formato do texto",
      );
    },
    [commit],
  );

  /**
   * Ctrl+clique numa forma: avança um passo no ciclo de 3 estilos. Mesmo formato de
   * `cycleEdgeStyle` — ação imediata, sem gesto de arrasto, não mexe na seleção.
   */
  const cycleShapeStyle = useCallback(
    (id: NodeId) => {
      commit(
        useCases.cycleShapeStyle.execute({ diagram: diagramRef.current, id }),
        selectionRef.current,
        "Mudar estilo da forma",
      );
    },
    [commit],
  );

  /**
   * Clique num botão de estilo do painel: escolha direta — mesmo rótulo de undo do
   * Ctrl+clique, "Mudar estilo da forma", mesma razão de `setEdgeStyle`.
   */
  const setShapeStyle = useCallback(
    (id: NodeId, style: ShapeStyle) => {
      commit(
        useCases.setShapeStyle.execute({ diagram: diagramRef.current, id, style }),
        selectionRef.current,
        "Mudar estilo da forma",
      );
    },
    [commit],
  );

  // `addIcon` é assíncrono (o hash do asset passa por WebCrypto). Ler o diagrama de
  // uma ref evita cometer sobre uma versão velha, capturada no closure antes do
  // await — bug que só aparece quando duas inserções se cruzam.
  const diagramRef = useRef(diagram);
  diagramRef.current = diagram;
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  // O fim da conexão vem de um listener na janela: ler de uma ref evita depender de
  // o handler ter sido recriado com o estado mais novo.
  const dragRef = useRef(drag);
  const connectingRef = useRef(connecting);
  const creatingRef = useRef(creating);
  const resizingRef = useRef(resizing);
  const marqueeRef = useRef(marquee);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const addIcon = useCallback(
    async (slug: string, at: Point) => {
      const next = await useCases.addIconNode.execute({ diagram: diagramRef.current, slug, at });
      commit(next, selectionRef.current, "Adicionar logo");
    },
    [commit],
  );

  const deleteSelected = useCallback(() => {
    if (isEmpty(selection)) return;
    // A seleção do estado ANTERIOR já está registrada na entrada atual, então
    // desfazer devolve o que foi apagado já selecionado.
    commit(
      useCases.deleteSelection.execute({ diagram, selection }),
      EMPTY_SELECTION,
      "Apagar",
    );
  }, [diagram, selection, commit]);

  const exportFile = useCallback(() => {
    downloadJson("diagrama", useCases.exportDocument.execute(diagramRef.current));
  }, []);

  /**
   * Importar um `.json`.
   *
   * Arquivo inválido NÃO substitui o diagrama aberto — só vira aviso. Perder o
   * trabalho da pessoa porque ela escolheu o arquivo errado seria punição
   * desproporcional ao engano.
   */
  const importFile = useCallback(async () => {
    let raw: string | undefined;
    try {
      raw = await pickJsonFile();
    } catch {
      setNotice("Não foi possível ler o arquivo.");
      return;
    }
    if (raw === undefined) return; // cancelou: não é erro

    try {
      // Importar É desfazível: substitui o documento inteiro, e é justamente a
      // operação em que o engano se descobre tarde demais.
      commit(useCases.importDocument.execute(raw), EMPTY_SELECTION, "Importar");
      setViewport(initialViewport);
      setNotice(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Arquivo de diagrama inválido.");
    }
  }, [commit]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  /**
   * Desfazer e refazer.
   *
   * Ignorados durante um arrasto em curso: o arrasto carrega os ids dos nós que
   * está movendo, e desfazer no meio poderia apagar justamente esses nós — o commit
   * ao soltar falharia com "nó não encontrado". `Esc` continua sendo como se
   * cancela um arrasto.
   */
  const undo = useCallback(() => {
    if (drag) return;
    setHistory((h) => h.undo());
  }, [drag]);

  const redo = useCallback(() => {
    if (drag) return;
    setHistory((h) => h.redo());
  }, [drag]);

  const zoom = useCallback((at: Point, factor: number) => {
    setViewport((v) => zoomAt(v, at, factor));
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((v) => pan(v, dx, dy));
  }, []);

  /**
   * `Esc`: cancela o gesto em curso, seja ele qual for.
   *
   * A decisão de QUAL cancelar consulta as refs, e não o estado do componente —
   * mesma razão do `pointerup`: o estado pode estar um render atrasado, e aí o `Esc`
   * cairia no ramo errado e o gesto seria commitado assim mesmo.
   *
   * Devolve `true` quando havia algo a cancelar, para quem chama decidir o resto.
   */
  const cancelGesture = useCallback((): boolean => {
    if (resizingRef.current) {
      cancelResize();
      return true;
    }
    if (creatingRef.current) {
      cancelCreate();
      return true;
    }
    if (connectingRef.current) {
      cancelConnect();
      return true;
    }
    if (marqueeRef.current) {
      cancelMarquee();
      return true;
    }
    if (dragRef.current) {
      cancelDrag();
      return true;
    }
    return false;
  }, [cancelResize, cancelCreate, cancelConnect, cancelMarquee, cancelDrag]);

  return {
    diagram,
    selection,
    viewport,
    drag,
    connecting,
    creating,
    resizing,
    marquee,
    rectOf,
    tool,
    editing,
    catalog,
    loaded,
    saveState,
    notice,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    actions: {
      undo,
      redo,
      clearSelection,
      selectEdge,
      cycleEdgeStyle,
      setEdgeStyle,
      setTextAlign,
      setTextFormat,
      cycleTextFormat,
      cycleShapeStyle,
      setShapeStyle,
      setTool,
      beginResize,
      updateResize,
      endResize,
      cancelResize,
      cancelGesture,
      beginCreate,
      updateCreate,
      endCreate,
      cancelCreate,
      beginEditLabel,
      commitLabel,
      beginConnect,
      updateConnect,
      endConnect,
      cancelConnect,
      beginMarquee,
      updateMarquee,
      endMarquee,
      cancelMarquee,
      beginDrag,
      updateDrag,
      endDrag,
      cancelDrag,
      addIcon,
      addShapeAt,
      deleteSelected,
      zoom,
      panBy,
      exportFile,
      importFile,
      dismissNotice,
    },
  };
};

export type EditorSession = ReturnType<typeof useEditorSession>;
