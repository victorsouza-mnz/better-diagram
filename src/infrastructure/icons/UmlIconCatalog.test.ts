import { describe, expect, it } from "vitest";

import { UmlIconCatalog } from "./UmlIconCatalog.js";

const catalog = new UmlIconCatalog();

describe("UmlIconCatalog", () => {
  it("marca todo ícone como uml", () => {
    for (const icon of catalog.search("")) {
      expect(icon.category).toBe("uml");
    }
  });

  it("não é vazio e tem os conceitos básicos pedidos", () => {
    const slugs = catalog.search("").map((icon) => icon.slug);
    for (const esperado of ["uml-actor", "uml-interface", "uml-note", "uml-component"]) {
      expect(slugs).toContain(esperado);
    }
  });

  it("não tem entrada de classe nem de pacote — são forma, não ícone (ver ShapeKind)", () => {
    const slugs = catalog.search("").map((icon) => icon.slug);
    expect(slugs).not.toContain("uml-class");
    expect(slugs).not.toContain("uml-package");
  });

  it("substitui currentColor por uma cor fixa — <image> isolado não resolveria currentColor", () => {
    for (const icon of catalog.search("")) {
      expect(icon.svg).not.toContain("currentColor");
      expect(icon.svg).toContain("#64748b");
    }
  });

  it("busca por nome em português", () => {
    expect(catalog.search("ator").map((icon) => icon.slug)).toContain("uml-actor");
  });

  it("busca por slug", () => {
    expect(catalog.search("uml-note").map((icon) => icon.slug)).toContain("uml-note");
  });

  it("bySlug encontra e devolve undefined para o que não existe", () => {
    expect(catalog.bySlug("uml-actor")?.name).toBe("Ator");
    expect(catalog.bySlug("nao-existe")).toBeUndefined();
  });

  it("busca por sinônimo em inglês acha o termo em português", () => {
    expect(catalog.search("actor").map((icon) => icon.slug)).toContain("uml-actor");
    expect(catalog.search("component").map((icon) => icon.slug)).toContain("uml-component");
  });
});
