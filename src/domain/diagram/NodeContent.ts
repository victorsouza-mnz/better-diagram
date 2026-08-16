import type { AssetId } from "../shared/ids.js";
import { DEFAULT_TEXT_ALIGN, type TextAlign } from "./TextAlign.js";

/**
 * O conteúdo de um nó — o coração do modelo.
 *
 * Ícone é uma VARIANTE IRMÃ da forma geométrica, não um atributo dela. O modelo
 * `{ shape, icon?: IconRef }` está explicitamente rejeitado: obrigava a criar uma
 * caixa antes de usar um logo, e fazia todo código de render e estilo ramificar em
 * "tem ícone ou não".
 *
 * O `Rect` NÃO mora aqui — pertence ao nó. Estar num plano é ter posição e tamanho,
 * e isso vale igual para ícone, forma e texto. O `content` decide só o que se
 * desenha dentro — é por isso que `align` (onde o texto senta dentro da caixa) mora
 * na variante `text`, e não como campo solto do nó: só faz sentido ali.
 */
export type NodeContent =
  | { readonly kind: "icon"; readonly assetId: AssetId }
  | { readonly kind: "shape"; readonly shape: ShapeKind }
  | { readonly kind: "text"; readonly align: TextAlign };

/**
 * `umlClass` é uma forma como as outras — mesmo redimensionar livre, mesmo resto do
 * pipeline (undo, persistência, export) — só o DESENHO é diferente: três
 * compartimentos (nome / atributos / métodos) em vez de uma caixa lisa. Os
 * compartimentos vêm do `label`, quebrado por linha em branco — não é campo
 * estruturado novo, é a apresentação (`NodeLabel.tsx`) interpretando o mesmo texto
 * que qualquer forma já tinha. Ver `docs/specs/editor/formas-e-texto.md`.
 */
export type ShapeKind = "rect" | "ellipse" | "diamond" | "umlClass";

export const iconContent = (assetId: AssetId): NodeContent => ({
  kind: "icon",
  assetId,
});

export const shapeContent = (shape: ShapeKind): NodeContent => ({
  kind: "shape",
  shape,
});

export const textContent = (align: TextAlign = DEFAULT_TEXT_ALIGN): NodeContent => ({
  kind: "text",
  align,
});

/**
 * Redimensionar ícone preserva a proporção; forma e texto, não.
 *
 * A regra mora aqui, junto da variante que a motiva, e não no handle de resize da
 * apresentação: logo esticado é a marca registrada de outra pessoa, deformada.
 */
export const preservesAspectRatio = (content: NodeContent): boolean =>
  content.kind === "icon";

/** Assets alcançáveis a partir deste conteúdo. Base do invariante de asset órfão. */
export const referencedAsset = (content: NodeContent): AssetId | undefined =>
  content.kind === "icon" ? content.assetId : undefined;
