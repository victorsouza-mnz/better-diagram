import type { CatalogIcon, IconCatalog } from "../../application/ports/index.js";

/**
 * Junta vários catálogos (marcas, genéricos, …) num só, na ordem em que são
 * passados — é essa ordem que decide o que aparece primeiro na busca com o campo
 * vazio.
 *
 * Fica na infraestrutura, e não em `application/`, pelo mesmo critério do resto das
 * ports: quem chama isto é só a apresentação (monta a paleta), o domínio nunca.
 *
 * Os slugs precisam ser únicos entre TODOS os catálogos compostos — é o mesmo
 * requisito que já valia dentro de um catálogo só. `SimpleIconsCatalog` usa nomes
 * de empresa (`postgresql`, `redis`); `GenericIconCatalog` usa substantivos comuns
 * em inglês (`server`, `database`) — colisão é teoricamente possível, mas nenhuma
 * ocorre na lista curada de hoje. Se um dia ocorrer, o segundo catálogo passado
 * aqui vence, silenciosamente — por isso a ordem de composição importa.
 */
export class CompositeIconCatalog implements IconCatalog {
  constructor(private readonly sources: readonly IconCatalog[]) {}

  search(query: string): readonly CatalogIcon[] {
    return this.sources.flatMap((source) => source.search(query));
  }

  bySlug(slug: string): CatalogIcon | undefined {
    for (const source of this.sources) {
      const icon = source.bySlug(slug);
      if (icon) return icon;
    }
    return undefined;
  }
}
