import { describe, expect, it } from "vitest";

import { DEFAULT_EDGE_STYLE, nextEdgeStyle, type EdgeStyle } from "./EdgeStyle.js";

describe("nextEdgeStyle — o ciclo de 4 que Ctrl+clique percorre", () => {
  it("percorre sólida-uni → sólida-bi → tracejada-uni → tracejada-bi → volta", () => {
    let style = DEFAULT_EDGE_STYLE;
    expect(style).toEqual({ dashed: false, bidirectional: false });

    style = nextEdgeStyle(style);
    expect(style).toEqual({ dashed: false, bidirectional: true });

    style = nextEdgeStyle(style);
    expect(style).toEqual({ dashed: true, bidirectional: false });

    style = nextEdgeStyle(style);
    expect(style).toEqual({ dashed: true, bidirectional: true });

    style = nextEdgeStyle(style);
    expect(style).toEqual({ dashed: false, bidirectional: false }); // fechou o ciclo
  });

  it("quatro Ctrl+clique seguidos voltam exatamente ao estilo original", () => {
    const inicio: EdgeStyle = { dashed: true, bidirectional: true };
    let style = inicio;
    for (let i = 0; i < 4; i += 1) style = nextEdgeStyle(style);
    expect(style).toEqual(inicio);
  });

});
