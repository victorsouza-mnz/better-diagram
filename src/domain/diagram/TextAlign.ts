/**
 * Alinhamento do rótulo dentro da caixa de um nó de TEXTO — dois eixos
 * independentes, cada um com três posições.
 *
 * Só existe dentro de `NodeContent` de `kind: "text"` (ver `NodeContent.ts`): forma
 * e ícone continuam com o texto sempre centralizado ou sempre abaixo, sem esse
 * controle. Não é atributo do nó — é o `content` que decide o que se desenha dentro.
 */
export interface TextAlign {
  readonly horizontal: "left" | "center" | "right";
  readonly vertical: "top" | "middle" | "bottom";
}

/**
 * O alinhamento de um nó de texto recém-criado — e de qualquer nó de texto salvo
 * antes deste controle existir (o codec preenche este padrão na leitura). É
 * EXATAMENTE o visual de sempre: centralizado nos dois eixos. Mudar este padrão
 * mudaria a aparência de diagramas já salvos sem a pessoa ter pedido nada.
 */
export const DEFAULT_TEXT_ALIGN: TextAlign = { horizontal: "center", vertical: "middle" };
