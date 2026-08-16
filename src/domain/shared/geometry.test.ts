import { describe, expect, it } from "vitest";

import {
  boundingBox,
  contains,
  containsRect,
  fitPreservingAspect,
  intersects,
  point,
  rect,
} from "./geometry.js";

describe("rect", () => {
  it("recusa largura ou altura não positivas", () => {
    expect(() => rect(0, 0, 0, 10)).toThrow(RangeError);
    expect(() => rect(0, 0, 10, -5)).toThrow(RangeError);
  });
});

describe("contains / intersects", () => {
  const r = rect(10, 10, 100, 50);

  it("acerta dentro, fora e na borda", () => {
    expect(contains(r, point(50, 30))).toBe(true);
    expect(contains(r, point(5, 30))).toBe(false);
    expect(contains(r, point(10, 10))).toBe(true);
  });

  it("detecta sobreposição sem contar encostar como intersecção", () => {
    expect(intersects(r, rect(50, 20, 100, 100))).toBe(true);
    expect(intersects(r, rect(110, 10, 10, 10))).toBe(false);
  });
});

describe("containsRect", () => {
  const outer = rect(0, 0, 100, 100);

  it("aceita o que está inteiramente dentro", () => {
    expect(containsRect(outer, rect(10, 10, 20, 20))).toBe(true);
  });

  it("aceita encostando exatamente na borda", () => {
    expect(containsRect(outer, rect(0, 0, 100, 100))).toBe(true);
  });

  it("recusa o que só toca, sem estar todo dentro", () => {
    // Metade para fora à direita: intersects seria true, containsRect não.
    expect(containsRect(outer, rect(90, 10, 20, 20))).toBe(false);
    expect(intersects(outer, rect(90, 10, 20, 20))).toBe(true);
  });

  it("recusa o que está totalmente fora", () => {
    expect(containsRect(outer, rect(200, 200, 10, 10))).toBe(false);
  });

  it("recusa um retângulo maior que o de fora, mesmo sobrepondo", () => {
    expect(containsRect(outer, rect(-10, -10, 500, 500))).toBe(false);
  });
});

describe("boundingBox", () => {
  it("envolve todos os retângulos", () => {
    expect(boundingBox([rect(0, 0, 10, 10), rect(50, 20, 10, 10)])).toEqual({
      x: 0,
      y: 0,
      w: 60,
      h: 30,
    });
  });

  it("é indefinido para lista vazia", () => {
    expect(boundingBox([])).toBeUndefined();
  });
});

describe("fitPreservingAspect", () => {
  it("encaixa quadrado em alvo largo, centrado na horizontal", () => {
    expect(fitPreservingAspect(rect(0, 0, 200, 100), 1)).toEqual({
      x: 50,
      y: 0,
      w: 100,
      h: 100,
    });
  });

  it("encaixa quadrado em alvo alto, centrado na vertical", () => {
    expect(fitPreservingAspect(rect(0, 0, 100, 200), 1)).toEqual({
      x: 0,
      y: 50,
      w: 100,
      h: 100,
    });
  });
});
