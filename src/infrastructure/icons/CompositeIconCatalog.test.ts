import { describe, expect, it } from "vitest";

import type { CatalogIcon, IconCatalog } from "../../application/ports/index.js";
import { CompositeIconCatalog } from "./CompositeIconCatalog.js";

/** Catálogo falso, só para testar a composição — não depende de nenhuma fonte real. */
class FakeCatalog implements IconCatalog {
  constructor(private readonly icons: readonly CatalogIcon[]) {}

  search(query: string): readonly CatalogIcon[] {
    const term = query.toLowerCase();
    return this.icons.filter((icon) => icon.slug.includes(term));
  }

  bySlug(slug: string): CatalogIcon | undefined {
    return this.icons.find((icon) => icon.slug === slug);
  }
}

const icon = (slug: string, category: "brand" | "generic"): CatalogIcon => ({
  slug,
  name: slug,
  svg: "<svg/>",
  category,
});

describe("CompositeIconCatalog", () => {
  const brands = new FakeCatalog([icon("postgresql", "brand"), icon("redis", "brand")]);
  const generics = new FakeCatalog([icon("server", "generic"), icon("database", "generic")]);
  const composite = new CompositeIconCatalog([brands, generics]);

  it("busca vazia devolve tudo, na ordem dos catálogos passados", () => {
    expect(composite.search("").map((i) => i.slug)).toEqual([
      "postgresql",
      "redis",
      "server",
      "database",
    ]);
  });

  it("busca cruza as duas fontes", () => {
    // "dis" acerta só "redis" (marca) — confirma que a busca não para na primeira
    // fonte nem devolve o catálogo inteiro por engano.
    expect(composite.search("dis").map((i) => i.slug)).toEqual(["redis"]);
  });

  it("bySlug encontra em qualquer fonte", () => {
    expect(composite.bySlug("postgresql")?.category).toBe("brand");
    expect(composite.bySlug("server")?.category).toBe("generic");
  });

  it("bySlug devolve undefined quando não está em nenhuma fonte", () => {
    expect(composite.bySlug("nao-existe")).toBeUndefined();
  });

  it("em caso de slug repetido, o primeiro catálogo da lista vence", () => {
    const duplicado = new CompositeIconCatalog([
      new FakeCatalog([icon("x", "brand")]),
      new FakeCatalog([icon("x", "generic")]),
    ]);
    expect(duplicado.bySlug("x")?.category).toBe("brand");
  });
});
