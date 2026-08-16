import type { ShapeKind } from "../../domain/diagram/NodeContent.js";
import { SHAPE_KEY, SHAPE_LABEL } from "../shapeGlyphs.js";

/**
 * As cinco formas, como entradas de PALETA — arrastáveis pro canvas, igual a um
 * ícone, mas produzindo um nó de FORMA (`content.kind === "shape"`), não de ícone.
 *
 * Fica em `presentation/`, e não em `infrastructure/` como `IconCatalog`: forma não
 * tem asset, não tem SVG de terceiro pra sanitizar, não tem licenciamento — é um
 * `ShapeKind` fixo e fechado (`NodeContent.ts`), não um catálogo plugável. Dar a ela
 * o mesmo aparato de porta+adaptador do ícone seria isolar uma dependência que não
 * existe.
 *
 * Não é a mesma lista de `IconCatalog`: os DOIS grupos aparecem juntos na paleta
 * (`palette/Palette.tsx` busca nos dois e mostra "Geometria" + "Ícones"), mas cada
 * um com a própria fonte de dados — a busca combinada é responsabilidade de quem
 * monta a tela, não de um catálogo unificado artificial.
 */
export interface GeometryEntry {
  readonly shape: ShapeKind;
  readonly label: string;
  /** Atalho que arma a mesma forma na barra de ferramentas — mostrado no `title`. */
  readonly key: string;
  /** Termos além do nome que também devem achar esta forma na busca. */
  readonly keywords: readonly string[];
}

/** Mesma ordem da barra de ferramentas — a pessoa já reconhece essa sequência. */
const GEOMETRIES: readonly GeometryEntry[] = [
  { shape: "rect", label: SHAPE_LABEL.rect, key: SHAPE_KEY.rect, keywords: ["quadrado", "caixa"] },
  { shape: "ellipse", label: SHAPE_LABEL.ellipse, key: SHAPE_KEY.ellipse, keywords: ["círculo", "oval", "caso de uso"] },
  { shape: "diamond", label: SHAPE_LABEL.diamond, key: SHAPE_KEY.diamond, keywords: ["decisão", "losango"] },
  { shape: "umlClass", label: SHAPE_LABEL.umlClass, key: SHAPE_KEY.umlClass, keywords: ["class", "uml"] },
  { shape: "umlPackage", label: SHAPE_LABEL.umlPackage, key: SHAPE_KEY.umlPackage, keywords: ["package", "uml", "módulo"] },
];

/** Mesma regra de substring de `SimpleIconsCatalog`/`GenericIconCatalog`. */
export const searchGeometry = (query: string): readonly GeometryEntry[] => {
  const term = query.trim().toLowerCase();
  if (term === "") return GEOMETRIES;
  return GEOMETRIES.filter((entry) => {
    if (entry.label.toLowerCase().includes(term) || entry.shape.toLowerCase().includes(term)) {
      return true;
    }
    return entry.keywords.some((keyword) => keyword.toLowerCase().includes(term));
  });
};
