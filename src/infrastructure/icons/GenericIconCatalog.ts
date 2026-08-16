import server from "lucide-static/icons/server.svg?raw";
import database from "lucide-static/icons/database.svg?raw";
import layers from "lucide-static/icons/layers.svg?raw";
import split from "lucide-static/icons/split.svg?raw";
import inbox from "lucide-static/icons/inbox.svg?raw";
import route from "lucide-static/icons/route.svg?raw";
import shield from "lucide-static/icons/shield.svg?raw";
import globe from "lucide-static/icons/globe.svg?raw";
import monitor from "lucide-static/icons/monitor.svg?raw";
import user from "lucide-static/icons/user.svg?raw";
import hardDrive from "lucide-static/icons/hard-drive.svg?raw";
import router from "lucide-static/icons/router.svg?raw";
import zap from "lucide-static/icons/zap.svg?raw";
import container from "lucide-static/icons/container.svg?raw";

import type { CatalogIcon, IconCatalog } from "../../application/ports/index.js";

/**
 * Catálogo de símbolos genéricos de arquitetura — servidor, banco de dados, fila…
 * Não representam nenhuma tecnologia específica, então complementam
 * `SimpleIconsCatalog` sem se misturar com ele: um serviço sem logo próprio (ou uma
 * marca ainda não coberta — AWS, por exemplo) ainda entra no diagrama como "banco
 * de dados" ou "fila".
 *
 * A fonte é o [lucide](https://lucide.dev) (`lucide-static`, licença ISC) — ícones
 * de traço, não silhueta preenchida como o simple-icons, e é exatamente essa
 * diferença visual que ajuda a olho a distinguir "isto é uma marca" de "isto é um
 * conceito" num diagrama só de olhar.
 *
 * NÃO É MARCA REGISTRADA — ao contrário do catálogo de logos, nenhum destes símbolos
 * pertence a uma empresa. A restrição de "uso nominativo, não alterar o desenho"
 * que vale para `SimpleIconsCatalog` não se aplica aqui.
 *
 * `?raw` é a importação de arquivo cru do Vite: cada ícone vira uma string
 * constante no bundle, igual a `toSvg()` no catálogo de marcas — sem runtime, sem
 * requisição, sem depender do build empacotar o pacote inteiro (só os arquivos
 * importados entram).
 */

interface RawIcon {
  readonly slug: string;
  readonly name: string;
  readonly svg: string;
  /**
   * Termos que uma pessoa digitaria pensando na TECNOLOGIA, não no conceito
   * genérico — "redis" pra achar este ícone de Cache, "kafka" pra achar Fila. Mesma
   * regra de substring que já vale pra nome e slug (ver `SimpleIconsCatalog` para a
   * contraparte: lá é o logo que ganha sinônimos de conceito; aqui é o conceito que
   * ganha sinônimos de tecnologia — as duas direções do mesmo problema).
   */
  readonly keywords?: readonly string[];
}

/** Ícones expostos na paleta, na ordem em que aparecem. */
const CURATED: readonly RawIcon[] = [
  { slug: "server", name: "Servidor", svg: server, keywords: ["backend", "vm", "máquina virtual"] },
  { slug: "database", name: "Banco de dados", svg: database, keywords: ["sql", "db"] },
  { slug: "hard-drive", name: "Armazenamento", svg: hardDrive, keywords: ["storage", "disco", "s3", "volume"] },
  { slug: "layers", name: "Cache", svg: layers, keywords: ["redis", "memcached"] },
  {
    slug: "inbox",
    name: "Fila / Message Broker",
    svg: inbox,
    keywords: ["fila", "queue", "kafka", "rabbitmq", "sqs", "mensageria"],
  },
  { slug: "split", name: "Load Balancer", svg: split, keywords: ["lb", "balanceador de carga"] },
  { slug: "route", name: "API Gateway", svg: route, keywords: ["gateway", "proxy"] },
  { slug: "shield", name: "Firewall", svg: shield, keywords: ["segurança", "waf"] },
  { slug: "globe", name: "CDN", svg: globe, keywords: ["cloudflare", "edge"] },
  { slug: "router", name: "Rede / Roteador", svg: router, keywords: ["network", "vpc"] },
  { slug: "monitor", name: "Cliente", svg: monitor, keywords: ["frontend", "browser", "navegador"] },
  { slug: "user", name: "Usuário", svg: user, keywords: ["ator", "actor", "pessoa"] },
  {
    slug: "zap",
    name: "Função (serverless)",
    svg: zap,
    keywords: ["lambda", "faas", "function", "serverless"],
  },
  { slug: "container", name: "Container", svg: container, keywords: ["docker", "pod"] },
];

/**
 * Cor fixa, e não `currentColor`.
 *
 * Mesma razão do catálogo de marcas: o ícone é desenhado dentro de um `<image>`
 * isolado, onde `currentColor` cairia para preto. Como estes ícones não têm uma cor
 * "correta" própria (não são marca de ninguém), a família inteira usa UM tom neutro
 * — o que faz o olho reconhecer "isto é genérico" de cara, por contraste com as
 * cores próprias dos logos de marca ao lado na paleta.
 */
const GENERIC_COLOR = "#64748b";

const withColor = (svg: string): string => svg.replace("currentColor", GENERIC_COLOR);

export class GenericIconCatalog implements IconCatalog {
  private readonly icons: readonly CatalogIcon[] = CURATED.map((icon) => ({
    slug: icon.slug,
    name: icon.name,
    svg: withColor(icon.svg),
    category: "generic",
  }));

  private readonly bySlugIndex = new Map(this.icons.map((icon) => [icon.slug, icon]));

  // Mesmo raciocínio de `SimpleIconsCatalog`: palavras-chave não entram em
  // `CatalogIcon`, são detalhe de curadoria só da busca.
  private readonly keywordsBySlug = new Map(CURATED.map((icon) => [icon.slug, icon.keywords ?? []]));

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
