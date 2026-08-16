import { describe, expect, it } from "vitest";

import { History } from "./History.js";
import { Diagram } from "../../domain/diagram/Diagram.js";
import { DiagramNode } from "../../domain/diagram/Node.js";
import { shapeContent } from "../../domain/diagram/NodeContent.js";
import { DiagramId, NodeId } from "../../domain/shared/ids.js";
import { EMPTY_SELECTION, onlyNodes } from "../Selection.js";
import { rect } from "../../domain/shared/geometry.js";

const node = (id: string, x = 0) =>
  new DiagramNode(NodeId(id), rect(x, 0, 100, 60), shapeContent("rect"));

const vazio = () => Diagram.empty(DiagramId("d1"));
const comNo = (id: string) => vazio().addNode(node(id));
const sel = (...ids: string[]) => (ids.length === 0 ? EMPTY_SELECTION : onlyNodes(ids.map(NodeId)));

describe("History — base", () => {
  it("começa sem nada para desfazer nem refazer", () => {
    const history = History.of(vazio());

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("desfazer na base não faz nada", () => {
    const history = History.of(vazio());
    expect(history.undo()).toBe(history);
  });

  it("refazer sem futuro não faz nada", () => {
    const history = History.of(vazio());
    expect(history.redo()).toBe(history);
  });
});

describe("History — desfazer e refazer", () => {
  it("volta ao estado anterior e avança de novo", () => {
    const antes = vazio();
    const depois = comNo("n1");

    const history = History.of(antes).commit(depois, sel(), "Adicionar");
    expect(history.present.diagram).toBe(depois);

    const desfeito = history.undo();
    expect(desfeito.present.diagram).toBe(antes);
    expect(desfeito.canRedo).toBe(true);

    expect(desfeito.redo().present.diagram).toBe(depois);
  });

  it("editar depois de desfazer descarta o refazer pendente", () => {
    const history = History.of(vazio())
      .commit(comNo("n1"), sel(), "Adicionar")
      .undo()
      .commit(comNo("n2"), sel(), "Outro caminho");

    expect(history.canRedo).toBe(false);
    expect(history.present.diagram.node(NodeId("n2"))).toBeDefined();
  });

  it("guarda o rótulo de cada entrada", () => {
    const history = History.of(vazio()).commit(comNo("n1"), sel(), "Adicionar logo");
    expect(history.present.label).toBe("Adicionar logo");
  });
});

describe("History — seleção", () => {
  it("trocar a seleção não cria entrada", () => {
    const history = History.of(comNo("n1")).withSelection(sel("n1"));

    expect(history.canUndo).toBe(false);
    expect(history.present.selection.nodes).toEqual(new Set([NodeId("n1")]));
  });

  it("desfazer devolve a seleção que existia naquele estado", () => {
    // Selecionar um nó e apagá-lo: desfazer precisa devolver o nó JÁ selecionado,
    // senão a pessoa tem que caçar visualmente o que reapareceu.
    const comN1 = comNo("n1");
    const history = History.of(comN1)
      .withSelection(sel("n1"))
      .commit(vazio(), sel(), "Apagar")
      .undo();

    expect(history.present.diagram.node(NodeId("n1"))).toBeDefined();
    expect(history.present.selection.nodes).toEqual(new Set([NodeId("n1")]));
  });

  it("descarta da seleção ids que não existem no diagrama daquela entrada", () => {
    const history = History.of(vazio()).withSelection(sel("fantasma"));
    expect(history.present.selection.nodes.size).toBe(0);
  });
});

describe("History — limite de profundidade", () => {
  it("descarta a entrada mais antiga e mantém o refazer consistente", () => {
    const limite = 3;
    let history = History.of(vazio(), limite);

    for (let i = 1; i <= 5; i += 1) {
      history = history.commit(comNo(`n${i}`), sel(), `Passo ${i}`);
    }

    expect(history.depth).toBe(limite);

    // Desfaz até o fundo: sobram só os 3 últimos passos.
    const fundo = history.undo().undo().undo();
    expect(fundo.canUndo).toBe(false);
    expect(fundo.present.label).toBe("Passo 2");

    // E o refazer atravessa os três de volta, na ordem.
    expect(fundo.redo().redo().redo().present.label).toBe("Passo 5");
  });
});
