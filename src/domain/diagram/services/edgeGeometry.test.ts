import { describe, expect, it } from "vitest";

import { attachPoints, controlPoint, parallelBow } from "./edgeGeometry.js";
import { rect } from "../../shared/geometry.js";

describe("attachPoints", () => {
  it("encaixa nas bordas voltadas uma para a outra", () => {
    const a = rect(0, 0, 100, 100); // centro (50,50)
    const b = rect(300, 0, 100, 100); // centro (350,50)

    const [from, to] = attachPoints(a, b)!;
    expect(from).toEqual({ x: 100, y: 50 }); // borda direita de A
    expect(to).toEqual({ x: 300, y: 50 }); // borda esquerda de B
  });

  it("funciona na vertical", () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(0, 300, 100, 100);

    const [from, to] = attachPoints(a, b)!;
    expect(from).toEqual({ x: 50, y: 100 });
    expect(to).toEqual({ x: 50, y: 300 });
  });

  it("sai pelo canto quando a diagonal é exata", () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(200, 200, 100, 100);

    const [from] = attachPoints(a, b)!;
    expect(from).toEqual({ x: 100, y: 100 });
  });

  it("é simétrico: inverter origem e destino troca os pontos", () => {
    const a = rect(0, 0, 60, 40);
    const b = rect(200, 130, 80, 90);

    const ida = attachPoints(a, b)!;
    const volta = attachPoints(b, a)!;
    expect(volta[0]).toEqual(ida[1]);
    expect(volta[1]).toEqual(ida[0]);
  });

  it("é indefinido quando os centros coincidem", () => {
    const a = rect(0, 0, 100, 100);
    const b = rect(25, 25, 50, 50); // mesmo centro

    expect(attachPoints(a, b)).toBeUndefined();
  });
});

describe("parallelBow", () => {
  it("aresta única fica reta", () => {
    expect(parallelBow(0, 1)).toBe(0);
  });

  it("espalha o feixe simetricamente em torno da reta", () => {
    const dois = [parallelBow(0, 2), parallelBow(1, 2)];
    expect(dois[0]).toBe(-dois[1]!);
    expect(dois[0]).not.toBe(0);

    const tres = [parallelBow(0, 3), parallelBow(1, 3), parallelBow(2, 3)];
    expect(tres[1]).toBe(0); // a do meio fica reta
    expect(tres[0]).toBe(-tres[2]!);
  });

  it("dá desvios distintos para cada aresta do feixe", () => {
    const total = 4;
    const desvios = [0, 1, 2, 3].map((i) => parallelBow(i, total));
    expect(new Set(desvios).size).toBe(total);
  });
});

describe("controlPoint", () => {
  it("sem desvio, cai no meio do segmento", () => {
    expect(controlPoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 0)).toEqual({ x: 50, y: 0 });
  });

  it("desloca perpendicularmente ao segmento", () => {
    const p = controlPoint({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
    expect(p.x).toBe(50);
    expect(Math.abs(p.y)).toBe(20);
  });

  it("desvios opostos caem em lados opostos", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0, y: 100 };
    expect(controlPoint(a, b, 15).x).toBe(-controlPoint(a, b, -15).x);
  });
});
