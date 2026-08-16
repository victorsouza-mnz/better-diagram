/**
 * Identidades tipadas.
 *
 * `string` crua não circula como identidade: `moveNode(edgeId)` compila e falha
 * em runtime, enquanto `moveNode(EdgeId)` nem compila. O custo é uma conversão
 * explícita nas bordas — que é exatamente onde se quer olhar duas vezes.
 *
 * A GERAÇÃO de id não mora aqui: depende de aleatoriedade, que é impura. Ela é o
 * port `IdGenerator`, e o caso de uso entrega o id pronto ao domínio.
 */

declare const brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [brand]: B };

export type DiagramId = Branded<string, "DiagramId">;
export type NodeId = Branded<string, "NodeId">;
export type EdgeId = Branded<string, "EdgeId">;

/** Hash do conteúdo do SVG já sanitizado — ver `Asset`. */
export type AssetId = Branded<string, "AssetId">;

const nonEmpty = (value: string, kind: string): string => {
  if (value.trim() === "") throw new Error(`${kind} não pode ser vazio`);
  return value;
};

export const DiagramId = (value: string): DiagramId =>
  nonEmpty(value, "DiagramId") as DiagramId;
export const NodeId = (value: string): NodeId => nonEmpty(value, "NodeId") as NodeId;
export const EdgeId = (value: string): EdgeId => nonEmpty(value, "EdgeId") as EdgeId;
export const AssetId = (value: string): AssetId =>
  nonEmpty(value, "AssetId") as AssetId;
