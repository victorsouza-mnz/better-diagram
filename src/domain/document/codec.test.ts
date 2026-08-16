import { describe, expect, it } from "vitest";

import { fromDocument, parseDocument, stringify, toDocument } from "./codec.js";
import { DocumentInvalid, UnsupportedSchemaVersion } from "./errors.js";
import { SCHEMA_VERSION } from "./types.js";
import { Diagram } from "../diagram/Diagram.js";
import { DiagramNode } from "../diagram/Node.js";
import { Edge } from "../diagram/Edge.js";
import { iconContent, shapeContent, textContent } from "../diagram/NodeContent.js";
import type { Asset } from "../diagram/Asset.js";
import { AssetId, DiagramId, EdgeId, NodeId } from "../shared/ids.js";
import { rect } from "../shared/geometry.js";
import { AssetNotFound, NodeNotFound } from "../diagram/errors.js";

const postgres: Asset = {
  id: AssetId("sha256-postgres"),
  kind: "svg",
  name: "PostgreSQL",
  source: "catalog:postgresql",
  data: "<svg/>",
};

const exemplo = () =>
  Diagram.empty(DiagramId("d1"))
    .addNode(
      new DiagramNode(NodeId("n1"), rect(10, 20, 64, 64), iconContent(postgres.id), "banco", 2),
      postgres,
    )
    .addNode(new DiagramNode(NodeId("n2"), rect(200, 20, 140, 80), shapeContent("rect")))
    .connect(new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2"), "TCP"));

const rodarIdaEVolta = (diagram: Diagram) => fromDocument(parseDocument(stringify(diagram)));

describe("codec — ida e volta", () => {
  it("preserva o documento inteiro", () => {
    const original = exemplo();
    const voltou = rodarIdaEVolta(original);

    expect(toDocument(voltou)).toEqual(toDocument(original));
  });

  it("preserva rect, rótulo, z e conteúdo de cada nó", () => {
    const node = rodarIdaEVolta(exemplo()).node(NodeId("n1"));

    expect(node?.rect).toEqual({ x: 10, y: 20, w: 64, h: 64 });
    expect(node?.label).toBe("banco");
    expect(node?.z).toBe(2);
    expect(node?.content).toEqual({ kind: "icon", assetId: "sha256-postgres" });
  });

  it("guarda o asset uma vez, com o id como chave", () => {
    const doc = toDocument(exemplo());

    expect(Object.keys(doc.assets)).toEqual(["sha256-postgres"]);
    expect(doc.assets["sha256-postgres"]).not.toHaveProperty("id");
  });

  it("preserva o estilo da aresta (tracejado e bidirecional)", () => {
    const comEstilo = Diagram.empty(DiagramId("d1"))
      .addNode(new DiagramNode(NodeId("n1"), rect(0, 0, 10, 10), shapeContent("rect")))
      .addNode(new DiagramNode(NodeId("n2"), rect(100, 0, 10, 10), shapeContent("rect")))
      .connect(
        new Edge(EdgeId("e1"), NodeId("n1"), NodeId("n2"), "", {
          dashed: true,
          bidirectional: true,
        }),
      );

    const voltou = rodarIdaEVolta(comEstilo);
    expect(voltou.edge(EdgeId("e1"))?.style).toEqual({ dashed: true, bidirectional: true });
  });

  it("preserva o alinhamento de um nó de texto", () => {
    const comAlinhamento = Diagram.empty(DiagramId("d1")).addNode(
      new DiagramNode(
        NodeId("n1"),
        rect(0, 0, 120, 24),
        textContent({ horizontal: "right", vertical: "bottom" }),
      ),
    );

    const voltou = rodarIdaEVolta(comAlinhamento);
    const content = voltou.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.align).toEqual({
      horizontal: "right",
      vertical: "bottom",
    });
  });

  it("preserva o formato de um nó de texto (código)", () => {
    const comCodigo = Diagram.empty(DiagramId("d1")).addNode(
      new DiagramNode(
        NodeId("n1"),
        rect(0, 0, 120, 24),
        textContent(undefined, "code"),
        "const x = 1;",
      ),
    );

    const voltou = rodarIdaEVolta(comCodigo);
    const content = voltou.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.format).toBe("code");
  });

  it("preserva um nó de forma umlClass, com o texto dos três compartimentos", () => {
    const comClasse = Diagram.empty(DiagramId("d1")).addNode(
      new DiagramNode(
        NodeId("n1"),
        rect(0, 0, 160, 120),
        shapeContent("umlClass"),
        "Pedido\n\n+id: string\n\n+calcularTotal()",
      ),
    );

    const voltou = rodarIdaEVolta(comClasse);
    const node = voltou.node(NodeId("n1"));
    expect(node?.content).toEqual({ kind: "shape", shape: "umlClass" });
    expect(node?.label).toBe("Pedido\n\n+id: string\n\n+calcularTotal()");
  });
});

describe("codec — retrocompatibilidade", () => {
  it("documento salvo antes de dashed/bidirectional existirem abre com o estilo padrão", () => {
    // Sem os campos novos — é exatamente o formato que um arquivo salvo pela versão
    // anterior do app tem. Precisa continuar abrindo.
    const antigo = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      nodes: [
        { id: "n1", rect: { x: 0, y: 0, w: 10, h: 10 }, content: { kind: "text" } },
        { id: "n2", rect: { x: 100, y: 0, w: 10, h: 10 }, content: { kind: "text" } },
      ],
      edges: [{ id: "e1", source: "n1", target: "n2" }],
    };

    const diagram = fromDocument(parseDocument(JSON.stringify(antigo)));
    expect(diagram.edge(EdgeId("e1"))?.style).toEqual({ dashed: false, bidirectional: false });
  });

  it("nó de texto salvo antes do alinhamento existir abre centralizado", () => {
    const antigo = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      nodes: [{ id: "n1", rect: { x: 0, y: 0, w: 120, h: 24 }, content: { kind: "text" } }],
      edges: [],
    };

    const diagram = fromDocument(parseDocument(JSON.stringify(antigo)));
    const content = diagram.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.align).toEqual({
      horizontal: "center",
      vertical: "middle",
    });
  });

  it("nó de texto salvo antes do formato existir abre como texto simples", () => {
    const antigo = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      nodes: [{ id: "n1", rect: { x: 0, y: 0, w: 120, h: 24 }, content: { kind: "text" } }],
      edges: [],
    };

    const diagram = fromDocument(parseDocument(JSON.stringify(antigo)));
    const content = diagram.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.format).toBe("plain");
  });

  it("formato com valor desconhecido cai no padrão, em vez de rejeitar o documento", () => {
    const adulterado = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      nodes: [
        {
          id: "n1",
          rect: { x: 0, y: 0, w: 120, h: 24 },
          content: { kind: "text", format: "markdown" },
        },
      ],
      edges: [],
    };

    const diagram = fromDocument(parseDocument(JSON.stringify(adulterado)));
    const content = diagram.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.format).toBe("plain");
  });

  it("alinhamento com valor desconhecido cai no padrão, em vez de rejeitar o documento", () => {
    const adulterado = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      nodes: [
        {
          id: "n1",
          rect: { x: 0, y: 0, w: 120, h: 24 },
          content: { kind: "text", align: { horizontal: "diagonal", vertical: "meio-termo" } },
        },
      ],
      edges: [],
    };

    const diagram = fromDocument(parseDocument(JSON.stringify(adulterado)));
    const content = diagram.node(NodeId("n1"))?.content;
    expect(content?.kind === "text" && content.align).toEqual({
      horizontal: "center",
      vertical: "middle",
    });
  });
});

describe("codec — arquivo recusado", () => {
  const recusa = (raw: string) => () => parseDocument(raw);

  it("recusa texto que não é JSON", () => {
    expect(recusa("nada disso")).toThrow(DocumentInvalid);
  });

  it("recusa documento sem schemaVersion", () => {
    expect(recusa(JSON.stringify({ id: "d1", nodes: [] }))).toThrow(DocumentInvalid);
  });

  it("recusa versão futura com mensagem clara", () => {
    const futuro = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, id: "d1", nodes: [] });

    expect(recusa(futuro)).toThrow(UnsupportedSchemaVersion);
    expect(recusa(futuro)).toThrow(/versão mais nova/);
  });

  it("checa a versão ANTES do resto — versão futura não vira erro de campo faltando", () => {
    // Sem `nodes`, sem `id`: se a ordem estivesse errada, o erro seria outro.
    expect(recusa(JSON.stringify({ schemaVersion: 99 }))).toThrow(UnsupportedSchemaVersion);
  });

  it("recusa nó com geometria inválida", () => {
    const doc = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      assets: {},
      nodes: [{ id: "n1", rect: { x: 0, y: 0, w: "grande", h: 10 }, content: { kind: "text" } }],
      edges: [],
    };
    expect(recusa(JSON.stringify(doc))).toThrow(DocumentInvalid);
  });

  it("recusa conteúdo de tipo desconhecido", () => {
    const doc = {
      schemaVersion: SCHEMA_VERSION,
      id: "d1",
      assets: {},
      nodes: [{ id: "n1", rect: { x: 0, y: 0, w: 10, h: 10 }, content: { kind: "hologram" } }],
      edges: [],
    };
    expect(recusa(JSON.stringify(doc))).toThrow(/kind desconhecido/);
  });
});

describe("codec — invariantes na reconstrução", () => {
  const construir = (doc: object) => () => fromDocument(parseDocument(JSON.stringify(doc)));

  it("recusa aresta apontando para nó inexistente", () => {
    expect(
      construir({
        schemaVersion: SCHEMA_VERSION,
        id: "d1",
        assets: {},
        nodes: [{ id: "n1", rect: { x: 0, y: 0, w: 10, h: 10 }, content: { kind: "text" } }],
        edges: [{ id: "e1", source: "n1", target: "n404" }],
      }),
    ).toThrow(NodeNotFound);
  });

  it("recusa nó de ícone sem o asset no arquivo", () => {
    expect(
      construir({
        schemaVersion: SCHEMA_VERSION,
        id: "d1",
        assets: {},
        nodes: [
          {
            id: "n1",
            rect: { x: 0, y: 0, w: 10, h: 10 },
            content: { kind: "icon", assetId: "sha256-sumiu" },
          },
        ],
        edges: [],
      }),
    ).toThrow(AssetNotFound);
  });

  it("aceita documento sem assets nem edges", () => {
    const diagram = fromDocument(
      parseDocument(
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          id: "d1",
          nodes: [{ id: "n1", rect: { x: 0, y: 0, w: 10, h: 10 }, content: { kind: "text" } }],
        }),
      ),
    );

    expect(diagram.nodes).toHaveLength(1);
    expect(diagram.edges).toHaveLength(0);
  });
});
