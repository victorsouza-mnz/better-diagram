import { describe, expect, it } from "vitest";

import { GenericIconCatalog } from "./GenericIconCatalog.js";

const catalog = new GenericIconCatalog();

describe("GenericIconCatalog", () => {
  it("marca todo ícone como genérico", () => {
    for (const icon of catalog.search("")) {
      expect(icon.category).toBe("generic");
    }
  });

  it("não é vazio e tem os conceitos pedidos", () => {
    const slugs = catalog.search("").map((icon) => icon.slug);
    for (const esperado of ["server", "database", "split", "inbox"]) {
      expect(slugs).toContain(esperado);
    }
  });

  it("substitui currentColor por uma cor fixa — <image> isolado não resolveria currentColor", () => {
    for (const icon of catalog.search("")) {
      expect(icon.svg).not.toContain("currentColor");
      expect(icon.svg).toContain("#64748b");
    }
  });

  it("busca por nome em português", () => {
    const resultado = catalog.search("banco");
    expect(resultado.map((icon) => icon.slug)).toContain("database");
  });

  it("busca por slug", () => {
    expect(catalog.search("server").map((icon) => icon.slug)).toContain("server");
  });

  it("bySlug encontra e devolve undefined para o que não existe", () => {
    expect(catalog.bySlug("server")?.name).toBe("Servidor");
    expect(catalog.bySlug("nao-existe")).toBeUndefined();
  });

  it("busca por palavra-chave de tecnologia acha o conceito genérico", () => {
    expect(catalog.search("redis").map((icon) => icon.slug)).toContain("layers");
    expect(catalog.search("kafka").map((icon) => icon.slug)).toContain("inbox");
    expect(catalog.search("lambda").map((icon) => icon.slug)).toContain("zap");
  });

  it("termo sem nenhum resultado não quebra — lista vazia", () => {
    expect(catalog.search("xyzabc123")).toEqual([]);
  });
});
