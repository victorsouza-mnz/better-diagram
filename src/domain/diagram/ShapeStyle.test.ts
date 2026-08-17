import { describe, expect, it } from "vitest";

import { DEFAULT_SHAPE_STYLE, nextShapeStyle, type ShapeStyle } from "./ShapeStyle.js";

describe("nextShapeStyle — o ciclo de 3 que Ctrl+clique percorre", () => {
  it("percorre preenchida → contorno → tracejada → volta", () => {
    let style: ShapeStyle = DEFAULT_SHAPE_STYLE;
    expect(style).toBe("filled");

    style = nextShapeStyle(style);
    expect(style).toBe("outlined");

    style = nextShapeStyle(style);
    expect(style).toBe("dashed");

    style = nextShapeStyle(style);
    expect(style).toBe("filled"); // fechou o ciclo
  });

  it("três Ctrl+clique seguidos voltam exatamente ao estilo original", () => {
    const inicio: ShapeStyle = "outlined";
    let style: ShapeStyle = inicio;
    for (let i = 0; i < 3; i += 1) style = nextShapeStyle(style);
    expect(style).toBe(inicio);
  });
});
