import { describe, expect, it } from "vitest";

import {
  MIN_NODE_SIZE,
  handlePosition,
  resizedRect,
  resizedRectPreservingAspect,
} from "./resizeGeometry.js";
import { rect } from "../../shared/geometry.js";

const base = rect(100, 100, 200, 100); // de (100,100) a (300,200)

describe("resizedRect — a borda oposta fica parada", () => {
  it("sudeste move largura e altura, mantendo o canto noroeste", () => {
    expect(resizedRect(base, "se", 50, 30)).toEqual({ x: 100, y: 100, w: 250, h: 130 });
  });

  it("noroeste move o canto de origem, mantendo o sudeste", () => {
    const resultado = resizedRect(base, "nw", 20, 10);
    expect(resultado).toEqual({ x: 120, y: 110, w: 180, h: 90 });
    expect(resultado.x + resultado.w).toBe(300);
    expect(resultado.y + resultado.h).toBe(200);
  });

  it("leste muda só a largura", () => {
    expect(resizedRect(base, "e", 40, 999)).toEqual({ x: 100, y: 100, w: 240, h: 100 });
  });

  it("norte muda só a altura, e move o topo", () => {
    expect(resizedRect(base, "n", 999, 25)).toEqual({ x: 100, y: 125, w: 200, h: 75 });
  });

  it("oeste move a borda esquerda", () => {
    expect(resizedRect(base, "w", 30, 0)).toEqual({ x: 130, y: 100, w: 170, h: 100 });
  });
});

describe("resizedRect — limites", () => {
  it("para no tamanho mínimo em vez de espelhar", () => {
    const resultado = resizedRect(base, "e", -1000, 0);
    expect(resultado.w).toBe(MIN_NODE_SIZE);
    expect(resultado.x).toBe(100); // a borda esquerda não se mexeu
  });

  it("para no mínimo também puxando a borda de origem", () => {
    const resultado = resizedRect(base, "nw", 1000, 1000);
    expect(resultado.w).toBe(MIN_NODE_SIZE);
    expect(resultado.h).toBe(MIN_NODE_SIZE);
    expect(resultado.x + resultado.w).toBe(300); // o canto oposto seguiu firme
    expect(resultado.y + resultado.h).toBe(200);
  });

  it("nunca produz dimensão não positiva", () => {
    for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const) {
      const resultado = resizedRect(base, handle, -5000, -5000);
      expect(resultado.w).toBeGreaterThan(0);
      expect(resultado.h).toBeGreaterThan(0);
    }
  });

  it("deslocamento zero devolve o mesmo retângulo", () => {
    expect(resizedRect(base, "se", 0, 0)).toEqual(base);
  });
});

describe("resizedRectPreservingAspect — alça de canto", () => {
  const icon = rect(100, 100, 64, 64); // aspect 1

  it("cresce nos dois eixos mantendo o canto oposto parado", () => {
    const resultado = resizedRectPreservingAspect(icon, "se", 40, 40, 1);
    expect(resultado).toEqual({ x: 100, y: 100, w: 104, h: 104 });
  });

  it("segue o eixo que a pessoa moveu proporcionalmente mais", () => {
    // Arrasto bem mais horizontal que vertical: o resultado segue a largura.
    const resultado = resizedRectPreservingAspect(icon, "se", 100, 20, 1);
    expect(resultado.w).toBe(164);
    expect(resultado.h).toBe(164);
    // O canto oposto (nw) continua exatamente onde estava.
    expect(resultado.x).toBe(100);
    expect(resultado.y).toBe(100);
  });

  it("nw mantém o canto sudeste (oposto) fixo", () => {
    const resultado = resizedRectPreservingAspect(icon, "nw", -20, -10, 1);
    expect(resultado.x + resultado.w).toBe(icon.x + icon.w);
    expect(resultado.y + resultado.h).toBe(icon.y + icon.h);
  });

  it("deslocamento zero devolve o mesmo retângulo", () => {
    expect(resizedRectPreservingAspect(icon, "se", 0, 0, 1)).toEqual(icon);
  });
});

describe("resizedRectPreservingAspect — alça lateral (a que estava sem efeito)", () => {
  const icon = rect(100, 100, 64, 64); // aspect 1

  it("leste MUDA de tamanho — não volta ao original", () => {
    const resultado = resizedRectPreservingAspect(icon, "e", 50, 0, 1);
    expect(resultado.w).toBeGreaterThan(icon.w);
    expect(resultado.h).toBeGreaterThan(icon.h);
  });

  it("leste preserva a proporção e mantém a borda esquerda parada", () => {
    const resultado = resizedRectPreservingAspect(icon, "e", 50, 0, 1);
    expect(resultado.w / resultado.h).toBeCloseTo(1);
    expect(resultado.x).toBe(100); // borda esquerda não se mexeu
  });

  it("leste cresce a altura CENTRADA no eixo vertical original", () => {
    const resultado = resizedRectPreservingAspect(icon, "e", 50, 0, 1);
    const centroOriginal = icon.y + icon.h / 2;
    const centroResultado = resultado.y + resultado.h / 2;
    expect(centroResultado).toBeCloseTo(centroOriginal);
  });

  it("norte preserva proporção e mantém a borda de baixo parada", () => {
    const resultado = resizedRectPreservingAspect(icon, "n", 0, -30, 1);
    expect(resultado.w / resultado.h).toBeCloseTo(1);
    expect(resultado.y + resultado.h).toBe(icon.y + icon.h);
  });
});

describe("resizedRectPreservingAspect — proporção diferente de 1", () => {
  it("mantém aspect 16:9 ao crescer por um canto", () => {
    const banner = rect(0, 0, 160, 90); // 16:9
    const resultado = resizedRectPreservingAspect(banner, "se", 80, 20, 160 / 90);
    expect(resultado.w / resultado.h).toBeCloseTo(160 / 90);
  });
});

describe("resizedRectPreservingAspect — limites", () => {
  it("nunca produz dimensão abaixo do mínimo", () => {
    const icon = rect(100, 100, 64, 64);
    for (const handle of ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const) {
      const resultado = resizedRectPreservingAspect(icon, handle, -5000, -5000, 1);
      expect(resultado.w).toBeGreaterThanOrEqual(MIN_NODE_SIZE - 1e-9);
      expect(resultado.h).toBeGreaterThanOrEqual(MIN_NODE_SIZE - 1e-9);
    }
  });

  it("não deixa a lado mínimo já atingido encolher mais", () => {
    // w já está no mínimo: não há como encolher mantendo a proporção.
    const fino = rect(0, 0, 64, 16); // aspect 4, altura já no piso
    const resultado = resizedRectPreservingAspect(fino, "w", 1000, 0, 4);
    expect(resultado.h).toBeCloseTo(16);
    expect(resultado.w).toBeCloseTo(64);
  });
});

describe("handlePosition", () => {
  it("põe os cantos nos extremos e os lados no meio", () => {
    expect(handlePosition("nw")).toEqual({ fx: 0, fy: 0 });
    expect(handlePosition("se")).toEqual({ fx: 1, fy: 1 });
    expect(handlePosition("n")).toEqual({ fx: 0.5, fy: 0 });
    expect(handlePosition("e")).toEqual({ fx: 1, fy: 0.5 });
  });
});
