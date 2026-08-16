/**
 * Destaque de sintaxe JS — MÍNIMO de propósito: palavra-chave, string, comentário
 * de linha, número. Sem parser de verdade (sem AST, sem noção de escopo) — um
 * tokenizador por regex, função pura, testável sem browser.
 *
 * "Mínimo" é a decisão de produto, não limitação técnica: o rótulo de um nó é um
 * trecho curto de código pra ilustrar um diagrama, não um arquivo fonte — cobrir
 * template string aninhada, regex literal ou JSX corretamente pediria um parser de
 * verdade por um ganho que ninguém vai notar num diagrama.
 */

export type TokenKind = "keyword" | "string" | "comment" | "number" | "plain";

export interface Token {
  readonly text: string;
  readonly kind: TokenKind;
}

/**
 * Só as palavras mais comuns — declaração, controle de fluxo, classe/módulo,
 * literais. Suficiente pro trecho curto que cabe num nó; não é a lista completa
 * da especificação (não tem, por exemplo, `enum` ou `interface`, que são TS).
 */
const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while", "do",
  "switch", "case", "break", "continue", "class", "extends", "new", "this", "super",
  "import", "export", "default", "from", "async", "await", "try", "catch", "finally",
  "throw", "typeof", "instanceof", "in", "of", "null", "undefined", "true", "false",
  "void", "delete", "yield", "static", "get", "set",
]);

/**
 * Ordem do regex é a ordem de prioridade: comentário cobre o resto da linha antes
 * de qualquer outra coisa tentar casar dentro dele; string (as três aspas) antes de
 * palavra, pra `"const"` dentro de uma string não virar palavra-chave; número e
 * identificador por último, com "qualquer outro caractere" como rede de segurança
 * (pontuação, espaço) — sem isso, um caractere fora do alfabeto travaria o laço.
 */
const TOKEN_PATTERN =
  /\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][A-Za-z0-9_$]*|[^]/g;

const classify = (text: string): TokenKind => {
  if (text.startsWith("//")) return "comment";
  if (text.startsWith('"') || text.startsWith("'") || text.startsWith("`")) return "string";
  if (/^\d/.test(text)) return "number";
  if (KEYWORDS.has(text)) return "keyword";
  return "plain";
};

/** Tokeniza UMA linha — comentário de linha (`//`) não atravessa quebra de linha. */
export const tokenizeJsLine = (line: string): Token[] => {
  const tokens: Token[] = [];
  for (const match of line.matchAll(TOKEN_PATTERN)) {
    tokens.push({ text: match[0], kind: classify(match[0]) });
  }
  return tokens;
};
