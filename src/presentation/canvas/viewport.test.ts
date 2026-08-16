import { describe, expect, it } from "vitest";

import {
  MAX_SCALE,
  MIN_SCALE,
  initialViewport,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from "./viewport.js";

describe("viewport", () => {
  it("faz round-trip entre tela e mundo", () => {
    const v = { x: 120, y: -40, scale: 1.75 };
    const world = { x: 33, y: 91 };
    expect(screenToWorld(v, worldToScreen(v, world))).toEqual(world);
  });

  it("mantém sob o cursor o mesmo ponto do mundo ao dar zoom", () => {
    const cursor = { x: 400, y: 300 };
    const antes = screenToWorld(initialViewport, cursor);
    const depois = screenToWorld(zoomAt(initialViewport, cursor, 1.2), cursor);

    expect(depois.x).toBeCloseTo(antes.x, 10);
    expect(depois.y).toBeCloseTo(antes.y, 10);
  });

  it("respeita os limites de zoom", () => {
    const cursor = { x: 0, y: 0 };
    expect(zoomAt(initialViewport, cursor, 100).scale).toBe(MAX_SCALE);
    expect(zoomAt(initialViewport, cursor, 0.001).scale).toBe(MIN_SCALE);
  });
});
