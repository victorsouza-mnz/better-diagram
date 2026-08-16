import type { ShapeKind } from "../domain/diagram/NodeContent.js";

/**
 * Glifo, rótulo e atalho por `ShapeKind` — fonte única para os três lugares que
 * precisam dizer a mesma coisa sobre uma forma: a barra de ferramentas
 * (`Toolbar.tsx`), o grupo "Geometria" da paleta (`palette/Palette.tsx`, arrastável)
 * e o fantasma que segue o cursor durante esse arrasto. Cada um com a própria cópia
 * do glifo é como o `▭` do retângulo desincroniza de um lugar pro outro sem
 * ninguém notar — aqui só existe um `▭`.
 *
 * São glifos Unicode do bloco "Geometric Shapes" (U+25A0–U+25FF), não SVG: a
 * mesma família visual do resto da barra, sem precisar desenhar nem embutir nada.
 */
export const SHAPE_GLYPH: Record<ShapeKind, string> = {
  rect: "▭",
  ellipse: "◯",
  diamond: "◇",
  umlClass: "▤",
  umlPackage: "◰",
};

export const SHAPE_LABEL: Record<ShapeKind, string> = {
  rect: "Retângulo",
  ellipse: "Elipse",
  diamond: "Losango",
  umlClass: "Classe UML",
  umlPackage: "Pacote UML",
};

/** A tecla que arma a mesma forma na barra de ferramentas. */
export const SHAPE_KEY: Record<ShapeKind, string> = {
  rect: "R",
  ellipse: "O",
  diamond: "D",
  umlClass: "C",
  umlPackage: "P",
};
