import {
  siApachekafka,
  siCloudflare,
  siDocker,
  siElasticsearch,
  siGithubactions,
  siGo,
  siGooglecloud,
  siGrafana,
  siGraphql,
  siKubernetes,
  siMongodb,
  siMysql,
  siNginx,
  siNodedotjs,
  siPostgresql,
  siPrometheus,
  siPython,
  siRabbitmq,
  siReact,
  siRedis,
  siSqlite,
  siSupabase,
  siTerraform,
  siTypescript,
} from "simple-icons";

import type { CatalogIcon, IconCatalog } from "../../application/ports/index.js";

/**
 * Catálogo de logos embutido no build, a partir do `simple-icons`.
 *
 * Os ícones são importados um a um, e NÃO por `import *`: o pacote tem ~3400
 * ícones, e o namespace inteiro derrota o tree-shaking — o bundle vai de dezenas
 * de KB para 5 MB. A lista explícita é o que mantém no build só o que a paleta usa.
 *
 * Curado também por produto: o app é de diagrama de arquitetura, e uma paleta com
 * milhares de marcas atrapalha quem quer achar "Postgres". A lista cresce por
 * pedido, não por completude.
 *
 * FALTA A AWS. A Amazon pediu a remoção das próprias marcas do simple-icons, então
 * o pacote não tem AWS nem seus serviços — justamente os logos mais comuns num
 * diagrama de arquitetura. Cobrir isso exige outra fonte (a AWS distribui os
 * "Architecture Icons" sob termos próprios) e é decisão de produto em aberto na
 * spec de assets. Os ícones GENÉRICOS de `GenericIconCatalog.ts` (servidor, banco
 * de dados, fila, …) cobrem parte do caso de uso — um serviço da AWS sem marca
 * específica na paleta ainda pode entrar no diagrama como "banco de dados" ou
 * "fila" — mas não substituem o logo real.
 *
 * Licenciamento: os arquivos do simple-icons são CC0, as MARCAS são dos seus donos.
 * Usar o logo para identificar a tecnologia num diagrama é uso nominativo. O app não
 * altera o logo nem sugere endosso da empresa.
 */

interface SimpleIcon {
  readonly title: string;
  readonly slug: string;
  readonly path: string;
  readonly hex: string;
}

/** Ícones expostos na paleta, na ordem em que aparecem. */
const CURATED: readonly SimpleIcon[] = [
  siPostgresql,
  siMysql,
  siSqlite,
  siRedis,
  siMongodb,
  siElasticsearch,
  siSupabase,
  siApachekafka,
  siRabbitmq,
  siDocker,
  siKubernetes,
  siTerraform,
  siNginx,
  siCloudflare,
  siGooglecloud,
  siGithubactions,
  siPrometheus,
  siGrafana,
  siNodedotjs,
  siPython,
  siGo,
  siTypescript,
  siReact,
  siGraphql,
];

/**
 * O pacote entrega o `path`, não um SVG pronto para embutir. Montamos o markup
 * mínimo: `viewBox` de 24×24 (padrão do simple-icons) e a cor da marca.
 *
 * A cor vem do `hex` em vez de `currentColor` porque o logo é desenhado dentro de
 * um `<image>` isolado, onde `currentColor` cairia para preto — e um diagrama em
 * que o Postgres é azul e o Redis é vermelho se lê bem mais rápido.
 */
const toSvg = (icon: SimpleIcon): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${icon.hex}">` +
  `<path d="${icon.path}"/></svg>`;

export class SimpleIconsCatalog implements IconCatalog {
  private readonly icons: readonly CatalogIcon[] = CURATED.map((icon) => ({
    slug: icon.slug,
    name: icon.title,
    svg: toSvg(icon),
    category: "brand",
  }));

  private readonly bySlugIndex = new Map(this.icons.map((icon) => [icon.slug, icon]));

  search(query: string): readonly CatalogIcon[] {
    const term = query.trim().toLowerCase();
    if (term === "") return this.icons;
    return this.icons.filter(
      (icon) => icon.name.toLowerCase().includes(term) || icon.slug.includes(term),
    );
  }

  bySlug(slug: string): CatalogIcon | undefined {
    return this.bySlugIndex.get(slug);
  }
}
