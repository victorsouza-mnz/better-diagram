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

/**
 * Um logo e os termos que uma pessoa digitaria PENSANDO no conceito, não no nome da
 * marca — "cache" para achar o Redis, "fila" para achar o Kafka. Não é busca
 * semântica (não há embedding nem similaridade): é a MESMA regra de substring que já
 * vale para nome e slug, só que contra uma lista curada por ícone (ver
 * `docs/specs/assets/catalogo-e-logos.md`).
 */
interface CuratedBrand {
  readonly icon: SimpleIcon;
  readonly keywords: readonly string[];
}

/** Ícones expostos na paleta, na ordem em que aparecem. */
const CURATED: readonly CuratedBrand[] = [
  { icon: siPostgresql, keywords: ["postgres", "sql", "banco de dados relacional"] },
  { icon: siMysql, keywords: ["sql", "banco de dados relacional"] },
  { icon: siSqlite, keywords: ["sql", "banco de dados embarcado"] },
  { icon: siRedis, keywords: ["cache", "em memória", "key-value", "sessão", "pub/sub"] },
  { icon: siMongodb, keywords: ["nosql", "documento", "banco de dados não relacional"] },
  { icon: siElasticsearch, keywords: ["busca", "search", "full-text", "log", "elk"] },
  { icon: siSupabase, keywords: ["backend as a service", "baas", "postgres gerenciado"] },
  {
    icon: siApachekafka,
    keywords: ["fila", "mensageria", "streaming", "eventos", "message broker", "pub/sub"],
  },
  { icon: siRabbitmq, keywords: ["fila", "mensageria", "message broker", "amqp"] },
  { icon: siDocker, keywords: ["container", "imagem", "containerização"] },
  { icon: siKubernetes, keywords: ["k8s", "orquestração de containers", "orchestration"] },
  { icon: siTerraform, keywords: ["iac", "infraestrutura como código", "provisionamento"] },
  { icon: siNginx, keywords: ["proxy reverso", "load balancer", "servidor web", "web server"] },
  { icon: siCloudflare, keywords: ["cdn", "dns", "proxy", "waf", "edge"] },
  { icon: siGooglecloud, keywords: ["gcp", "nuvem", "cloud"] },
  { icon: siGithubactions, keywords: ["ci/cd", "pipeline", "automação", "workflow"] },
  { icon: siPrometheus, keywords: ["monitoramento", "métricas", "observabilidade", "alerta"] },
  {
    icon: siGrafana,
    keywords: ["dashboard", "monitoramento", "observabilidade", "métricas", "visualização"],
  },
  { icon: siNodedotjs, keywords: ["javascript", "runtime", "backend"] },
  { icon: siPython, keywords: ["linguagem", "backend", "script", "data science"] },
  { icon: siGo, keywords: ["golang", "linguagem", "backend"] },
  { icon: siTypescript, keywords: ["javascript", "linguagem", "tipado"] },
  { icon: siReact, keywords: ["frontend", "javascript", "ui", "spa", "componente"] },
  { icon: siGraphql, keywords: ["api", "query language"] },
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
  private readonly icons: readonly CatalogIcon[] = CURATED.map(({ icon }) => ({
    slug: icon.slug,
    name: icon.title,
    svg: toSvg(icon),
    category: "brand",
  }));

  private readonly bySlugIndex = new Map(this.icons.map((icon) => [icon.slug, icon]));

  // Palavras-chave não entram em `CatalogIcon` — são detalhe de curadoria da BUSCA
  // deste catálogo, não algo que a paleta ou qualquer outra camada precisa exibir.
  private readonly keywordsBySlug = new Map(
    CURATED.map(({ icon, keywords }) => [icon.slug, keywords]),
  );

  search(query: string): readonly CatalogIcon[] {
    const term = query.trim().toLowerCase();
    if (term === "") return this.icons;
    return this.icons.filter((icon) => {
      if (icon.name.toLowerCase().includes(term) || icon.slug.includes(term)) return true;
      const keywords = this.keywordsBySlug.get(icon.slug) ?? [];
      return keywords.some((keyword) => keyword.toLowerCase().includes(term));
    });
  }

  bySlug(slug: string): CatalogIcon | undefined {
    return this.bySlugIndex.get(slug);
  }
}
