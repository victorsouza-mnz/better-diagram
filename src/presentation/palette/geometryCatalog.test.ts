import { describe, expect, it } from "vitest";

import { searchGeometry } from "./geometryCatalog.js";

describe("searchGeometry", () => {
  it("campo vazio devolve as cinco formas, na ordem da barra de ferramentas", () => {
    const shapes = searchGeometry("").map((entry) => entry.shape);
    expect(shapes).toEqual(["rect", "ellipse", "diamond", "umlClass", "umlPackage"]);
  });

  it("busca por nome", () => {
    expect(searchGeometry("losango").map((e) => e.shape)).toEqual(["diamond"]);
  });

  it("busca por slug (o próprio ShapeKind)", () => {
    expect(searchGeometry("umlpackage").map((e) => e.shape)).toEqual(["umlPackage"]);
  });

  it("busca por palavra-chave de conceito", () => {
    expect(searchGeometry("decisão").map((e) => e.shape)).toEqual(["diamond"]);
    expect(searchGeometry("caso de uso").map((e) => e.shape)).toEqual(["ellipse"]);
    expect(searchGeometry("módulo").map((e) => e.shape)).toEqual(["umlPackage"]);
  });

  it("busca é insensível a maiúsculas/minúsculas", () => {
    expect(searchGeometry("LOSANGO").map((e) => e.shape)).toEqual(["diamond"]);
  });

  it("termo sem nenhum resultado devolve lista vazia", () => {
    expect(searchGeometry("xyzabc123")).toEqual([]);
  });

  it("cada entrada leva o atalho de teclado da barra de ferramentas", () => {
    const byShape = Object.fromEntries(searchGeometry("").map((e) => [e.shape, e.key]));
    expect(byShape).toEqual({
      rect: "R",
      ellipse: "O",
      diamond: "D",
      umlClass: "C",
      umlPackage: "P",
    });
  });
});
