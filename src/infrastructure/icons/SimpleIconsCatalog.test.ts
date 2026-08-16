import { describe, expect, it } from "vitest";

import { SimpleIconsCatalog } from "./SimpleIconsCatalog.js";

const catalog = new SimpleIconsCatalog();

describe("SimpleIconsCatalog", () => {
  it("marca todo ícone como marca", () => {
    for (const icon of catalog.search("")) {
      expect(icon.category).toBe("brand");
    }
  });

  it("não é vazio e tem os logos pedidos", () => {
    const slugs = catalog.search("").map((icon) => icon.slug);
    for (const esperado of ["postgresql", "redis", "kubernetes"]) {
      expect(slugs).toContain(esperado);
    }
  });

  it("cada ícone tem cor própria da marca, não currentColor", () => {
    for (const icon of catalog.search("")) {
      expect(icon.svg).not.toContain("currentColor");
      expect(icon.svg).toMatch(/fill="#[0-9a-fA-F]{6}"/);
    }
  });

  it("busca por nome", () => {
    expect(catalog.search("Redis").map((icon) => icon.slug)).toContain("redis");
  });

  it("busca por slug", () => {
    expect(catalog.search("postgresql").map((icon) => icon.slug)).toContain("postgresql");
  });

  it("busca é insensível a maiúsculas/minúsculas", () => {
    expect(catalog.search("REDIS").map((icon) => icon.slug)).toContain("redis");
  });

  it("busca por palavra-chave de conceito acha a marca — o caso que motivou a feature", () => {
    expect(catalog.search("cache").map((icon) => icon.slug)).toContain("redis");
    expect(catalog.search("fila").map((icon) => icon.slug)).toContain("apachekafka");
    expect(catalog.search("nosql").map((icon) => icon.slug)).toContain("mongodb");
    expect(catalog.search("orquestração").map((icon) => icon.slug)).toContain("kubernetes");
  });

  it("termo sem nenhum resultado não quebra — lista vazia", () => {
    expect(catalog.search("xyzabc123")).toEqual([]);
  });

  it("bySlug encontra e devolve undefined para o que não existe", () => {
    expect(catalog.bySlug("redis")?.name).toBe("Redis");
    expect(catalog.bySlug("nao-existe")).toBeUndefined();
  });
});
