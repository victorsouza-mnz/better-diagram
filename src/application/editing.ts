import type { Diagram } from "../domain/diagram/Diagram.js";
import { DiagramNode } from "../domain/diagram/Node.js";
import { Edge } from "../domain/diagram/Edge.js";
import { nextEdgeStyle, type EdgeStyle } from "../domain/diagram/EdgeStyle.js";
import { shapeContent, textContent, type ShapeKind } from "../domain/diagram/NodeContent.js";
import type { TextAlign } from "../domain/diagram/TextAlign.js";
import type { TextFormat } from "../domain/diagram/TextFormat.js";
import { rect, type Point, type Rect } from "../domain/shared/geometry.js";
import { EdgeId, NodeId } from "../domain/shared/ids.js";
import type { IdGenerator } from "./ports/index.js";
import type { Selection } from "./Selection.js";

/**
 * Casos de uso de edição.
 *
 * Cada um é UMA intenção do usuário, e portanto uma transação e uma entrada de
 * undo. `MoveNodes` recebe o deslocamento TOTAL e roda uma vez, ao soltar o mouse —
 * nunca por frame de arrasto. Durante o arrasto, o movimento é estado de sessão na
 * apresentação; se algum dia isto for chamado de dentro de um `onPointerMove`, o
 * erro está na modelagem, não na performance.
 */

export class MoveNodes {
  execute(input: {
    diagram: Diagram;
    ids: readonly NodeId[];
    dx: number;
    dy: number;
  }): Diagram {
    return input.diagram.moveNodes(input.ids, input.dx, input.dy);
  }
}

export class ResizeNode {
  execute(input: { diagram: Diagram; id: NodeId; target: Rect }): Diagram {
    return input.diagram.resizeNode(input.id, input.target);
  }
}

export class ConnectNodes {
  constructor(private readonly ids: IdGenerator) {}

  execute(input: {
    diagram: Diagram;
    source: NodeId;
    target: NodeId;
    label?: string;
  }): Diagram {
    const edge = new Edge(
      EdgeId(this.ids.next()),
      input.source,
      input.target,
      input.label ?? "",
    );
    return input.diagram.connect(edge);
  }
}

/**
 * Alt+clique numa aresta: avança um passo no ciclo de 4 estilos.
 *
 * A ORDEM do ciclo é regra de domínio (`nextEdgeStyle`, testada isoladamente); este
 * caso de uso só busca a aresta, pede o próximo estilo e comete — a mesma forma dos
 * outros casos de uso de edição.
 */
export class CycleEdgeStyle {
  execute(input: { diagram: Diagram; id: EdgeId }): Diagram {
    const current = input.diagram.edge(input.id);
    if (!current) return input.diagram;
    return input.diagram.setEdgeStyle(input.id, nextEdgeStyle(current.style));
  }
}

/**
 * Escolha direta de estilo — o painel de propriedades, ao contrário do Alt+clique
 * (`CycleEdgeStyle`), sabe exatamente qual dos 4 estilos a pessoa quer, então não
 * há o que ciclar.
 */
export class SetEdgeStyle {
  execute(input: { diagram: Diagram; id: EdgeId; style: EdgeStyle }): Diagram {
    return input.diagram.setEdgeStyle(input.id, input.style);
  }
}

export class DeleteSelection {
  execute(input: { diagram: Diagram; selection: Selection }): Diagram {
    // Arestas incidentes aos nós apagados e assets órfãos saem junto — é o agregado
    // que garante, não este caso de uso. Regra de consistência espalhada pelos casos
    // de uso é regra que um deles vai esquecer.
    //
    // As arestas removidas aqui são as selecionadas DIRETAMENTE; remover primeiro
    // as arestas e depois os nós evita depender da ordem: uma aresta que já saiu com
    // o nó simplesmente não existe mais, e `removeEdges` ignora id inexistente.
    return input.diagram
      .removeEdges([...input.selection.edges])
      .removeNodes([...input.selection.nodes]);
  }
}

/**
 * Grava o rótulo e, opcionalmente, ajusta a caixa ao texto.
 *
 * Os dois numa operação só porque são UMA intenção: escrever o rótulo de um nó de
 * texto muda o tamanho dele. Em duas operações, seriam duas entradas de histórico, e
 * desfazer deixaria o nó do tamanho novo com o texto velho.
 */
export class SetNodeLabel {
  execute(input: { diagram: Diagram; id: NodeId; label: string; fit?: Rect }): Diagram {
    const withLabel = input.diagram.setNodeLabel(input.id, input.label);
    return input.fit ? withLabel.resizeNode(input.id, input.fit) : withLabel;
  }
}

/** Alinhamento do rótulo dentro da caixa — só existe em nó de texto. */
export class SetTextAlign {
  execute(input: { diagram: Diagram; id: NodeId; align: TextAlign }): Diagram {
    return input.diagram.setTextAlign(input.id, input.align);
  }
}

/** Texto simples ou código JS — só existe em nó de texto. */
export class SetTextFormat {
  execute(input: { diagram: Diagram; id: NodeId; format: TextFormat }): Diagram {
    return input.diagram.setTextFormat(input.id, input.format);
  }
}

/** Tamanhos usados quando a pessoa cria com um clique, sem arrastar. */
export const DEFAULT_SHAPE_SIZE = { w: 140, h: 80 } as const;
export const DEFAULT_TEXT_SIZE = { w: 120, h: 24 } as const;
/** Mais alta que a forma padrão: precisa caber três compartimentos, não um. */
export const DEFAULT_UML_CLASS_SIZE = { w: 160, h: 120 } as const;

/**
 * O texto com que uma caixa de classe nasce — não vazio, ao contrário das outras
 * formas. Uma caixa de classe em branco não tem como a pessoa adivinhar a
 * convenção (linha em branco separa nome / atributos / métodos); o exemplo já
 * preenchido MOSTRA a convenção, e ela edita por cima em vez de digitar do zero.
 */
export const UML_CLASS_TEMPLATE = "NomeDaClasse\n\n+atributo: tipo\n\n+metodo()";

export class AddShapeNode {
  constructor(private readonly ids: IdGenerator) {}

  execute(input: { diagram: Diagram; shape: ShapeKind; rect: Rect; label?: string }): Diagram {
    const node = new DiagramNode(
      NodeId(this.ids.next()),
      input.rect,
      shapeContent(input.shape),
      input.label ?? "",
    );
    return input.diagram.addNode(node);
  }
}

/**
 * Cria um nó de texto vazio.
 *
 * Nasce com um tamanho mínimo e a caixa se ajusta ao conteúdo quando o rótulo é
 * gravado — quem cria ainda não sabe o que vai ser digitado.
 */
export class AddTextNode {
  constructor(private readonly ids: IdGenerator) {}

  execute(input: { diagram: Diagram; at: Point }): { diagram: Diagram; id: NodeId } {
    const id = NodeId(this.ids.next());
    const node = new DiagramNode(
      id,
      rect(
        input.at.x - DEFAULT_TEXT_SIZE.w / 2,
        input.at.y - DEFAULT_TEXT_SIZE.h / 2,
        DEFAULT_TEXT_SIZE.w,
        DEFAULT_TEXT_SIZE.h,
      ),
      textContent(),
    );
    // Devolve o id porque quem chama precisa abrir a edição nesse nó — criar um
    // texto e não deixar digitar seria um passo a mais sem função.
    return { diagram: input.diagram.addNode(node), id };
  }
}
