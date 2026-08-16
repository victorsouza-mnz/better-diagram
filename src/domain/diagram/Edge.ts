import type { EdgeId, NodeId } from "../shared/ids.js";
import { DEFAULT_EDGE_STYLE, type EdgeStyle } from "./EdgeStyle.js";

/**
 * Entidade aresta.
 *
 * Referencia nós por id, e só. Uma aresta que guardasse a geometria dos pontos
 * ficaria desatualizada no instante em que alguém movesse um nó — a rota é
 * derivada na hora de desenhar, a partir dos retângulos.
 */
export class Edge {
  constructor(
    readonly id: EdgeId,
    readonly source: NodeId,
    readonly target: NodeId,
    readonly label: string = "",
    readonly style: EdgeStyle = DEFAULT_EDGE_STYLE,
  ) {}

  connects(nodeId: NodeId): boolean {
    return this.source === nodeId || this.target === nodeId;
  }

  labeled(label: string): Edge {
    return new Edge(this.id, this.source, this.target, label, this.style);
  }

  withStyle(style: EdgeStyle): Edge {
    return new Edge(this.id, this.source, this.target, this.label, style);
  }
}
