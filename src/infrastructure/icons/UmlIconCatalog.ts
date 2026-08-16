import userRound from "lucide-static/icons/user-round.svg?raw";

import type { CatalogIcon, IconCatalog } from "../../application/ports/index.js";

/**
 * Catálogo de notação básica de UML — ator, interface, nota, componente.
 *
 * **Classe e pacote não estão aqui.** Não são ícone: são forma com contorno próprio
 * — a mesma família de `rect`/`ellipse`/`diamond`, não de logo arrastável:
 * - **Classe** tem conteúdo estruturado (nome / atributos / métodos, cada um seu
 *   compartimento).
 * - **Pacote** é caixa com aba no canto superior esquerdo — sem compartimento, mas
 *   ainda assim um CONTORNO, não um desenho fixo dentro de um `<image>` isolado; e
 *   um pacote de arquitetura é redimensionado com frequência (ele representa um
 *   módulo, não um símbolo pontual), então precisa do resize livre que só forma tem.
 *
 * Os dois vivem como `ShapeKind` em `NodeContent.ts` e ferramenta na barra (`C` e
 * `P`), não neste catálogo — ver `docs/specs/editor/formas-e-texto.md`.
 *
 * **Caso de uso não tem ícone aqui.** A elipse já é a notação — a ferramenta de
 * forma (`O`) cobre isso; duplicar como ícone arrastável só daria duas formas de
 * chegar no mesmo resultado.
 *
 * Os símbolos abaixo (fora o ator) não existem prontos no lucide com a notação
 * certa — são desenhados à mão, no mesmo estilo dos ícones do lucide ao lado
 * (`viewBox 0 0 24 24`, traço de 2px, `currentColor`), pra não destoar na paleta:
 *
 * - **Nota**: retângulo com o canto superior direito dobrado (dog-ear).
 * - **Componente**: retângulo com dois conectores salientes na borda esquerda —
 *   notação UML 1.x, mais reconhecível de bater o olho que o rótulo «component»
 *   do UML 2.0.
 * - **Interface**: notação "lollipop" — círculo com um traço curto, o mesmo símbolo
 *   usado em diagrama de componentes para uma interface provida.
 *
 * Ator continua o ícone de pessoa do lucide: já é a notação certa (o "bonequinho"
 * palito é estilização de silhueta — um contorno humano genérico já comunica o
 * mesmo, e evita desenhar uma segunda versão só por purismo de traço).
 *
 * Igual ao genérico: símbolo de conceito, não marca — nenhuma restrição de uso.
 */

interface RawIcon {
  readonly slug: string;
  readonly name: string;
  readonly svg: string;
  /** Sinônimo em inglês ou termo de notação — mesma regra de `GenericIconCatalog`. */
  readonly keywords?: readonly string[];
}

const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

/** Retângulo com o canto superior direito dobrado — notação de nota UML. */
const NOTE_SVG = svg(
  '<path d="M4 3h11l5 5v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v5h5"/>',
);

/** Retângulo com dois conectores na borda esquerda — notação de componente UML 1.x. */
const COMPONENT_SVG = svg(
  '<rect x="7" y="4" width="14" height="16"/><rect x="2" y="7" width="6" height="3"/><rect x="2" y="14" width="6" height="3"/>',
);

/** Círculo com um traço curto ("lollipop") — notação de interface provida. */
const INTERFACE_SVG = svg('<circle cx="12" cy="9" r="5"/><path d="M12 14v7"/>');

/** Ícones expostos na paleta, na ordem em que aparecem. */
const CURATED: readonly RawIcon[] = [
  { slug: "uml-actor", name: "Ator", svg: userRound, keywords: ["actor", "usuário", "papel"] },
  { slug: "uml-interface", name: "Interface", svg: INTERFACE_SVG, keywords: ["lollipop", "contrato"] },
  { slug: "uml-note", name: "Nota", svg: NOTE_SVG, keywords: ["comment", "comentário", "anotação"] },
  { slug: "uml-component", name: "Componente", svg: COMPONENT_SVG, keywords: ["component", "módulo"] },
];

/**
 * Cor fixa, e não `currentColor` — mesma razão do `GenericIconCatalog`: o ícone
 * entra num `<image>` isolado, onde `currentColor` cairia para preto. Reusa o
 * mesmo tom neutro do catálogo genérico: os dois são "símbolo, não marca", e o
 * contraste que importa na paleta é esse, contra as cores de marca ao lado — não
 * entre notação de UML e ícone de arquitetura.
 */
const NEUTRAL_COLOR = "#64748b";

const withColor = (svg: string): string => svg.replace("currentColor", NEUTRAL_COLOR);

export class UmlIconCatalog implements IconCatalog {
  private readonly icons: readonly CatalogIcon[] = CURATED.map((icon) => ({
    slug: icon.slug,
    name: icon.name,
    svg: withColor(icon.svg),
    category: "uml",
  }));

  private readonly bySlugIndex = new Map(this.icons.map((icon) => [icon.slug, icon]));

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
