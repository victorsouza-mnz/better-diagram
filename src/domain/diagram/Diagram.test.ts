import { describe, expect, it } from "vitest";

import { Diagram } from "./Diagram.js";
import { DiagramNode } from "./Node.js";
import { Edge } from "./Edge.js";
import { iconContent, shapeContent, textContent } from "./NodeContent.js";
import type { Asset } from "./Asset.js";
import {
  AssetNotFound,
  DuplicateId,
  EdgeNotFound,
  NodeNotFound,
  NotATextNode,
  SelfLoopNotAllowed,
} from "./errors.js";
import { AssetId, DiagramId, EdgeId, NodeId } from "../shared/ids.js";
import { rect } from "../shared/geometry.js";

// Estes testes rodam em Node puro, sem jsdom. Se um dia precisarem de DOM, a regra
// da dependência já foi quebrada — o teste é o alarme.

const postgres: Asset = {
  id: AssetId("sha256-postgres"),
  kind: "svg",
  name: "PostgreSQL",
  source: "catalog:simple-icons/postgresql",
  data: "<svg/>",
};

const redis: Asset = {
  id: AssetId("sha256-redis"),
  kind: "svg",
  name: "Redis",
  source: "catalog:simple-icons/redis",
  data: "<svg/>",
};

const iconNode = (id: string, asset: Asset, x = 0, y = 0) =>
  new DiagramNode(NodeId(id), rect(x, y, 64, 64), iconContent(asset.id));

const shapeNode = (id: string, x = 0, y = 0) =>
  new DiagramNode(NodeId(id), rect(x, y, 100, 60), shapeContent("rect"));

const empty = () => Diagram.empty(DiagramId("d1"));

describe("Diagram — nós", () => {
  it("trata ícone, forma e texto pelas mesmas operações", () => {
    const diagram = empty()
      .addNode(iconNode("n1", postgres), postgres)
      .addNode(shapeNode("n2"))
      .moveNodes([NodeId("n1"), NodeId("n2")], 10, 20);

    expect(diagram.node(NodeId("n1"))?.rect).toMatchObject({ x: 10, y: 20 });
    expect(diagram.node(NodeId("n2"))?.rect).toMatchObject({ x: 10, y: 20 });
  });

  it("recusa id duplicado", () => {
    const diagram = empty().addNode(shapeNode("n1"));
    expect(() => diagram.addNode(shapeNode("n1"))).toThrow(DuplicateId);
  });

  it("recusa mover nó inexistente", () => {
    expect(() => empty().moveNodes([NodeId("fantasma")], 1, 1)).toThrow(NodeNotFound);
  });

  it("ordena o desenho por z, com empate pela ordem de inserção", () => {
    const diagram = empty()
      .addNode(shapeNode("fundo").atDepth(0))
      .addNode(shapeNode("meio").atDepth(0))
      .addNode(shapeNode("topo").atDepth(5));

    expect(diagram.nodesInDrawOrder.map((n) => n.id)).toEqual(["fundo", "meio", "topo"]);
  });
});

describe("Diagram — invariante 1 e 2: arestas", () => {
  it("recusa aresta para nó inexistente", () => {
    const diagram = empty().addNode(shapeNode("n1"));
    const solta = new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2"));
    expect(() => diagram.connect(solta)).toThrow(NodeNotFound);
  });

  it("recusa aresta de um nó para ele mesmo", () => {
    const diagram = empty().addNode(shapeNode("n1"));
    const loop = new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n1"));
    expect(() => diagram.connect(loop)).toThrow(SelfLoopNotAllowed);
  });

  it("permite duas arestas entre o mesmo par — dois canais é caso real", () => {
    const diagram = empty()
      .addNode(shapeNode("n1"))
      .addNode(shapeNode("n2"))
      .connect(new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2"), "HTTP"))
      .connect(new Edge(EdgeId("e2"), NodeId("n1"), NodeId("n2"), "gRPC"));

    expect(diagram.edges).toHaveLength(2);
  });

  it("deletar um nó remove as arestas incidentes", () => {
    const diagram = empty()
      .addNode(shapeNode("n1"))
      .addNode(shapeNode("n2"))
      .addNode(shapeNode("n3"))
      .connect(new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2")))
      .connect(new Edge(EdgeId("e2"), NodeId("n2"), NodeId("n3")))
      .removeNodes([NodeId("n2")]);

    expect(diagram.edges).toHaveLength(0);
    expect(diagram.nodes.map((n) => n.id).sort()).toEqual(["n1", "n3"]);
  });
});

describe("Diagram — estilo de aresta", () => {
  it("aresta nasce sólida e unidirecional", () => {
    const diagram = empty()
      .addNode(shapeNode("n1"))
      .addNode(shapeNode("n2"))
      .connect(new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2")));

    expect(diagram.edge(EdgeId("e1"))?.style).toEqual({ dashed: false, bidirectional: false });
  });

  it("setEdgeStyle troca o estilo sem afetar o resto da aresta", () => {
    const diagram = empty()
      .addNode(shapeNode("n1"))
      .addNode(shapeNode("n2"))
      .connect(new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2"), "HTTP"))
      .setEdgeStyle(EdgeId("e1"), { dashed: true, bidirectional: true });

    const edge = diagram.edge(EdgeId("e1"));
    expect(edge?.style).toEqual({ dashed: true, bidirectional: true });
    expect(edge?.label).toBe("HTTP"); // não mexeu no resto
  });

  it("recusa mudar o estilo de uma aresta inexistente", () => {
    expect(() =>
      empty().setEdgeStyle(EdgeId("fantasma"), { dashed: true, bidirectional: false }),
    ).toThrow(EdgeNotFound);
  });
});

describe("Diagram — alinhamento de nó de texto", () => {
  const textNode = (id: string, x = 0, y = 0) =>
    new DiagramNode(NodeId(id), rect(x, y, 120, 24), textContent());

  it("nasce centralizado nos dois eixos", () => {
    const diagram = empty().addNode(textNode("n1"));
    const content = diagram.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.align).toEqual({
      horizontal: "center",
      vertical: "middle",
    });
  });

  it("setTextAlign troca o alinhamento sem afetar o resto do nó", () => {
    const diagram = empty()
      .addNode(textNode("n1"))
      .setNodeLabel(NodeId("n1"), "Status")
      .setTextAlign(NodeId("n1"), { horizontal: "left", vertical: "top" });

    const node = diagram.node(NodeId("n1"));
    expect(node?.content.kind === "text" && node.content.align).toEqual({
      horizontal: "left",
      vertical: "top",
    });
    expect(node?.label).toBe("Status"); // não mexeu no resto
  });

  it("recusa alinhar um nó que não é de texto", () => {
    const diagram = empty().addNode(shapeNode("n1"));
    expect(() =>
      diagram.setTextAlign(NodeId("n1"), { horizontal: "left", vertical: "top" }),
    ).toThrow(NotATextNode);
  });

  it("recusa alinhar um nó inexistente", () => {
    expect(() =>
      empty().setTextAlign(NodeId("fantasma"), { horizontal: "left", vertical: "top" }),
    ).toThrow(NodeNotFound);
  });
});

describe("Diagram — invariante 3 e 4: assets", () => {
  it("recusa nó de ícone cujo asset não está no documento", () => {
    expect(() => empty().addNode(iconNode("n1", postgres))).toThrow(AssetNotFound);
  });

  it("dois nós do mesmo logo compartilham uma entrada", () => {
    const diagram = empty()
      .addNode(iconNode("n1", postgres), postgres)
      .addNode(iconNode("n2", postgres), postgres);

    expect(diagram.assets).toHaveLength(1);
  });

  it("apagar o último nó de um logo remove o asset", () => {
    const diagram = empty()
      .addNode(iconNode("n1", postgres), postgres)
      .addNode(iconNode("n2", redis), redis)
      .removeNodes([NodeId("n1")]);

    expect(diagram.assets.map((a) => a.id)).toEqual(["sha256-redis"]);
  });

  it("apagar um de dois nós do mesmo logo mantém o asset", () => {
    const diagram = empty()
      .addNode(iconNode("n1", postgres), postgres)
      .addNode(iconNode("n2", postgres), postgres)
      .removeNodes([NodeId("n1")]);

    expect(diagram.assets).toHaveLength(1);
  });
});

describe("Diagram — proporção ao redimensionar", () => {
  it("preserva a proporção do ícone e centra no alvo", () => {
    const diagram = empty()
      .addNode(iconNode("n1", postgres), postgres)
      .resizeNode(NodeId("n1"), rect(0, 0, 200, 100));

    // Ícone quadrado (64x64) dentro de um alvo 200x100 → 100x100 centrado.
    expect(diagram.node(NodeId("n1"))?.rect).toEqual({ x: 50, y: 0, w: 100, h: 100 });
  });

  it("não preserva proporção de forma", () => {
    const diagram = empty()
      .addNode(shapeNode("n1"))
      .resizeNode(NodeId("n1"), rect(0, 0, 200, 100));

    expect(diagram.node(NodeId("n1"))?.rect).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });
});

describe("Diagram.restore — documento vindo de fora", () => {
  it("rejeita aresta apontando para nó inexistente", () => {
    expect(() =>
      Diagram.restore({
        id: DiagramId("d1"),
        nodes: [shapeNode("n1")],
        edges: [new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n404"))],
        assets: [],
      }),
    ).toThrow(NodeNotFound);
  });

  it("rejeita nó de ícone sem o asset correspondente", () => {
    expect(() =>
      Diagram.restore({
        id: DiagramId("d1"),
        nodes: [iconNode("n1", postgres)],
        edges: [],
        assets: [],
      }),
    ).toThrow(AssetNotFound);
  });

  it("descarta asset órfão vindo no arquivo", () => {
    const restored = Diagram.restore({
      id: DiagramId("d1"),
      nodes: [shapeNode("n1")],
      edges: [],
      assets: [postgres],
    });

    expect(restored.assets).toHaveLength(0);
  });
});

describe("Diagram — imutabilidade", () => {
  it("operação devolve documento novo e não altera o anterior", () => {
    const antes = empty().addNode(shapeNode("n1"));
    const depois = antes.moveNodes([NodeId("n1")], 50, 50);

    expect(antes.node(NodeId("n1"))?.rect.x).toBe(0);
    expect(depois.node(NodeId("n1"))?.rect.x).toBe(50);
    expect(depois).not.toBe(antes);
  });
});
