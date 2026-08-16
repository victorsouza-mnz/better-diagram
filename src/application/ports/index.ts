import type { Diagram } from "../../domain/diagram/Diagram.js";
import type { DiagramId } from "../../domain/shared/ids.js";

/**
 * Ports: o que os casos de uso PRECISAM do mundo externo.
 *
 * A infraestrutura implementa estas interfaces, então a seta de dependência
 * continua apontando para dentro — é a inversão de dependência de sempre.
 *
 * POR QUE AQUI, E NÃO EM `domain/ports/`
 *
 * Há duas escolas. Evans trata Repository como padrão de domínio, porque a
 * interface fala o vocabulário dele. Ports & Adapters coloca os driven ports junto
 * de quem os consome. As duas respeitam a regra da dependência, então a convenção
 * não decide nada sozinha.
 *
 * O critério que decide é QUEM CHAMA. Uma port precisa morar em `domain/` quando o
 * próprio domínio a chama para garantir um invariante — aí colocá-la em
 * `application/` inverteria a seta. Nenhuma destas é assim: o agregado nunca salva,
 * nunca gera id, nunca sanitiza. Deixá-las no domínio significava o domínio declarar
 * cinco interfaces que ele mesmo nunca usa.
 *
 * A REGRA, para as próximas: port em `domain/` só se o domínio a invocar. Caso
 * contrário, `application/`.
 */

export interface DiagramRepository {
  load(id: DiagramId): Promise<Diagram | undefined>;
  save(diagram: Diagram): Promise<void>;
  list(): Promise<readonly DiagramId[]>;
}

export interface IdGenerator {
  next(): string;
}

/** Hash do conteúdo, base da identidade dos assets. */
export interface ContentHasher {
  hash(content: string): Promise<string>;
}

/**
 * Limpa SVG de origem externa ANTES de ele entrar no documento.
 *
 * O renderer é DOM: SVG não sanitizado é XSS de verdade. Sanitizar na entrada, e
 * não no render, faz o invariante valer para o documento guardado — o que está na
 * tabela já está limpo.
 *
 * Origem externa inclui o `.json` importado, não só o upload: documento recebido de
 * outra pessoa é entrada não confiável.
 */
export interface SvgSanitizer {
  /** Devolve o SVG limpo, ou lança se o conteúdo não for recuperável. */
  sanitize(svg: string): string;
}

/**
 * `"brand"` é logo de tecnologia (Postgres, Redis, …) — marca registrada de outra
 * empresa, cor própria. `"generic"` é símbolo de arquitetura (servidor, banco de
 * dados, fila, …) — não representa nenhuma empresa, então não carrega a mesma
 * restrição de uso de marca. `"uml"` é notação de diagrama de classes/casos de uso
 * (ator, classe, interface, …) — mesma ausência de marca do genérico, categoria
 * separada só porque é outro vocabulário visual, que a pessoa quer achar junto. A
 * paleta agrupa por esta categoria; o resto do app (asset, sanitização, undo) trata
 * as três o mesmo jeito — um nó de ícone é um nó de ícone, `category` é só metadado
 * de exibição.
 */
export type IconCategory = "brand" | "generic" | "uml";

export interface CatalogIcon {
  readonly slug: string;
  readonly name: string;
  readonly svg: string;
  readonly category: IconCategory;
}

export interface IconCatalog {
  search(query: string): readonly CatalogIcon[];
  bySlug(slug: string): CatalogIcon | undefined;
}
