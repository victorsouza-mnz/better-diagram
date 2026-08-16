import type { AssetId, DiagramId, EdgeId, NodeId } from "../shared/ids.js";
import type { Rect } from "../shared/geometry.js";
import type { Asset } from "./Asset.js";
import { DiagramNode } from "./Node.js";
import { Edge } from "./Edge.js";
import type { EdgeStyle } from "./EdgeStyle.js";
import type { TextAlign } from "./TextAlign.js";
import { referencedAsset } from "./NodeContent.js";
import {
  AssetNotFound,
  DuplicateId,
  EdgeNotFound,
  NodeNotFound,
  SelfLoopNotAllowed,
} from "./errors.js";

/**
 * AGREGADO RAIZ.
 *
 * Carregado e salvo inteiro, porque a fronteira de consistência é mesmo o
 * documento todo: aresta referencia nó, nó referencia asset. Legítimo aqui porque
 * documentos são de KBs. Se um diagrama chegar a milhares de nós, este é o primeiro
 * ponto a revisitar.
 *
 * IMUTÁVEL: toda operação devolve um `Diagram` novo. A escolha é do estilo
 * funcional de DDD, e não do clássico com agregado mutável, por dois motivos
 * práticos: undo vira pilha de snapshots (sem comando inverso para cada operação),
 * e o React detecta mudança por identidade de referência, de graça. O custo é
 * copiar mapas de dezenas de entradas por operação — irrelevante nesta escala, e a
 * operação só acontece ao FIM de uma interação, nunca por frame de arrasto.
 *
 * Os invariantes (ver `docs/specs/documento/schema-v1.md`):
 *   1. Toda aresta referencia dois nós existentes.
 *   2. Deletar um nó remove as arestas incidentes.
 *   3. Todo conteúdo de ícone aponta para um asset presente na tabela.
 *   4. Asset sem referência não existe.
 *   5. Ids são únicos no documento.
 *   6. Rect tem largura e altura positivas (garantido pelo próprio `rect()`).
 */
export class Diagram {
  private constructor(
    readonly id: DiagramId,
    private readonly nodesById: ReadonlyMap<NodeId, DiagramNode>,
    private readonly edgesById: ReadonlyMap<EdgeId, Edge>,
    private readonly assetsById: ReadonlyMap<AssetId, Asset>,
  ) {}

  static empty(id: DiagramId): Diagram {
    return new Diagram(id, new Map(), new Map(), new Map());
  }

  /**
   * Reconstrói um diagrama a partir de dados já materializados (leitura de arquivo
   * ou do IndexedDB) VALIDANDO os invariantes. Documento que viola invariante é
   * rejeitado, nunca carregado "quase certo" — um arquivo meio válido vira bug
   * silencioso três telas adiante.
   */
  static restore(input: {
    id: DiagramId;
    nodes: readonly DiagramNode[];
    edges: readonly Edge[];
    assets: readonly Asset[];
  }): Diagram {
    const nodes = new Map<NodeId, DiagramNode>();
    for (const node of input.nodes) {
      if (nodes.has(node.id)) throw new DuplicateId(node.id);
      nodes.set(node.id, node);
    }

    const assets = new Map<AssetId, Asset>();
    for (const asset of input.assets) {
      if (assets.has(asset.id)) throw new DuplicateId(asset.id);
      assets.set(asset.id, asset);
    }

    for (const node of nodes.values()) {
      const assetId = referencedAsset(node.content);
      if (assetId !== undefined && !assets.has(assetId)) {
        throw new AssetNotFound(assetId); // invariante 3
      }
    }

    const edges = new Map<EdgeId, Edge>();
    for (const edge of input.edges) {
      if (edges.has(edge.id)) throw new DuplicateId(edge.id);
      if (!nodes.has(edge.source)) throw new NodeNotFound(edge.source); // invariante 1
      if (!nodes.has(edge.target)) throw new NodeNotFound(edge.target);
      if (edge.source === edge.target) throw new SelfLoopNotAllowed(edge.id);
      edges.set(edge.id, edge);
    }

    return new Diagram(input.id, nodes, edges, assets).pruneAssets();
  }

  // ---------------------------------------------------------------- consultas

  get nodes(): readonly DiagramNode[] {
    return [...this.nodesById.values()];
  }

  get edges(): readonly Edge[] {
    return [...this.edgesById.values()];
  }

  get assets(): readonly Asset[] {
    return [...this.assetsById.values()];
  }

  node(id: NodeId): DiagramNode | undefined {
    return this.nodesById.get(id);
  }

  edge(id: EdgeId): Edge | undefined {
    return this.edgesById.get(id);
  }

  asset(id: AssetId): Asset | undefined {
    return this.assetsById.get(id);
  }

  /** Nós em ordem de desenho: `z` crescente, empate pela ordem de inserção. */
  get nodesInDrawOrder(): readonly DiagramNode[] {
    return this.nodes
      .map((node, index) => ({ node, index }))
      .sort((a, b) => a.node.z - b.node.z || a.index - b.index)
      .map(({ node }) => node);
  }

  edgesOf(nodeId: NodeId): readonly Edge[] {
    return this.edges.filter((edge) => edge.connects(nodeId));
  }

  // ---------------------------------------------------------------- operações

  /**
   * Adiciona um nó. Nó de ícone exige o asset: ou ele já está na tabela, ou vem
   * junto em `asset`. É o invariante 3 sendo garantido no ponto de entrada, e não
   * conferido depois.
   */
  addNode(node: DiagramNode, asset?: Asset): Diagram {
    if (this.nodesById.has(node.id)) throw new DuplicateId(node.id);

    const assets = new Map(this.assetsById);
    if (asset) assets.set(asset.id, asset);

    const required = referencedAsset(node.content);
    if (required !== undefined && !assets.has(required)) {
      throw new AssetNotFound(required);
    }

    const nodes = new Map(this.nodesById);
    nodes.set(node.id, node);
    return new Diagram(this.id, nodes, this.edgesById, assets);
  }

  /**
   * Move vários nós de uma vez. É UMA operação, e portanto uma entrada de undo:
   * arrastar cinco nós é "Mover", não cinco movimentos.
   */
  moveNodes(ids: readonly NodeId[], dx: number, dy: number): Diagram {
    const nodes = new Map(this.nodesById);
    for (const id of ids) {
      const node = nodes.get(id);
      if (!node) throw new NodeNotFound(id);
      nodes.set(id, node.movedBy(dx, dy));
    }
    return new Diagram(this.id, nodes, this.edgesById, this.assetsById);
  }

  resizeNode(id: NodeId, target: Rect): Diagram {
    const node = this.nodesById.get(id);
    if (!node) throw new NodeNotFound(id);

    const nodes = new Map(this.nodesById);
    nodes.set(id, node.resizedTo(target));
    return new Diagram(this.id, nodes, this.edgesById, this.assetsById);
  }

  setNodeLabel(id: NodeId, label: string): Diagram {
    const node = this.nodesById.get(id);
    if (!node) throw new NodeNotFound(id);

    const nodes = new Map(this.nodesById);
    nodes.set(id, node.labeled(label));
    return new Diagram(this.id, nodes, this.edgesById, this.assetsById);
  }

  /** Lança `NotATextNode` (via `DiagramNode.withTextAlign`) se o nó não for texto. */
  setTextAlign(id: NodeId, align: TextAlign): Diagram {
    const node = this.nodesById.get(id);
    if (!node) throw new NodeNotFound(id);

    const nodes = new Map(this.nodesById);
    nodes.set(id, node.withTextAlign(align));
    return new Diagram(this.id, nodes, this.edgesById, this.assetsById);
  }

  connect(edge: Edge): Diagram {
    if (this.edgesById.has(edge.id)) throw new DuplicateId(edge.id);
    if (!this.nodesById.has(edge.source)) throw new NodeNotFound(edge.source);
    if (!this.nodesById.has(edge.target)) throw new NodeNotFound(edge.target);
    if (edge.source === edge.target) throw new SelfLoopNotAllowed(edge.id);

    const edges = new Map(this.edgesById);
    edges.set(edge.id, edge);
    return new Diagram(this.id, this.nodesById, edges, this.assetsById);
  }

  setEdgeStyle(id: EdgeId, style: EdgeStyle): Diagram {
    const edge = this.edgesById.get(id);
    if (!edge) throw new EdgeNotFound(id);

    const edges = new Map(this.edgesById);
    edges.set(id, edge.withStyle(style));
    return new Diagram(this.id, this.nodesById, edges, this.assetsById);
  }

  /**
   * Remove nós, as arestas incidentes (invariante 2) e os assets que ficaram sem
   * referência (invariante 4). Id inexistente é ignorado em silêncio: apagar o que
   * já não existe é o resultado que o chamador queria.
   */
  removeNodes(ids: readonly NodeId[]): Diagram {
    const removing = new Set<NodeId>(ids);

    const nodes = new Map(this.nodesById);
    for (const id of removing) nodes.delete(id);

    const edges = new Map(this.edgesById);
    for (const edge of this.edgesById.values()) {
      if (removing.has(edge.source) || removing.has(edge.target)) {
        edges.delete(edge.id);
      }
    }

    return new Diagram(this.id, nodes, edges, this.assetsById).pruneAssets();
  }

  removeEdges(ids: readonly EdgeId[]): Diagram {
    const edges = new Map(this.edgesById);
    for (const id of ids) edges.delete(id);
    return new Diagram(this.id, this.nodesById, edges, this.assetsById);
  }

  // ------------------------------------------------------------------ interno

  /**
   * Invariante 4: asset sem referência não existe.
   *
   * A tabela é DERIVADA do que os nós alcançam, em vez de mantida por contagem de
   * referência. Contagem é mais rápida e erra em silêncio — um decremento esquecido
   * vaza para sempre, e o sintoma (arquivo inchando) aparece semanas depois. Aqui o
   * custo é O(nós) sobre dezenas de nós, e a correção é estrutural: não existe
   * caminho de código que produza um órfão.
   */
  private pruneAssets(): Diagram {
    const reachable = new Set<AssetId>();
    for (const node of this.nodesById.values()) {
      const assetId = referencedAsset(node.content);
      if (assetId !== undefined) reachable.add(assetId);
    }

    if (reachable.size === this.assetsById.size) return this;

    const assets = new Map<AssetId, Asset>();
    for (const id of reachable) {
      const asset = this.assetsById.get(id);
      if (asset) assets.set(id, asset);
    }
    return new Diagram(this.id, this.nodesById, this.edgesById, assets);
  }
}
