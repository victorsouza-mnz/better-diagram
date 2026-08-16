import { describe, expect, it } from "vitest";

import { tokenizeJsLine } from "./jsHighlight.js";

/** Achata pra `[texto, tipo][]` — mais fácil de ler numa asserção que o objeto. */
const kinds = (line: string) => tokenizeJsLine(line).map((t) => [t.text, t.kind] as const);

describe("tokenizeJsLine", () => {
  it("reconhece palavra-chave", () => {
    expect(kinds("const x")).toEqual([
      ["const", "keyword"],
      [" ", "plain"],
      ["x", "plain"],
    ]);
  });

  it("reconhece string com aspas duplas, simples e crase", () => {
    expect(tokenizeJsLine('"a"').map((t) => t.kind)).toEqual(["string"]);
    expect(tokenizeJsLine("'a'").map((t) => t.kind)).toEqual(["string"]);
    expect(tokenizeJsLine("`a`").map((t) => t.kind)).toEqual(["string"]);
  });

  it("string com aspas escapadas dentro continua uma única string", () => {
    const tokens = tokenizeJsLine('"a\\"b"');
    expect(tokens).toEqual([{ text: '"a\\"b"', kind: "string" }]);
  });

  it("uma palavra-chave DENTRO de uma string não vira palavra-chave", () => {
    const tokens = tokenizeJsLine('"return"');
    expect(tokens).toEqual([{ text: '"return"', kind: "string" }]);
  });

  it("comentário de linha cobre até o fim, mesmo com palavra-chave dentro", () => {
    const tokens = tokenizeJsLine("x // const 1");
    expect(tokens).toEqual([
      { text: "x", kind: "plain" },
      { text: " ", kind: "plain" },
      { text: "// const 1", kind: "comment" },
    ]);
  });

  it("reconhece número inteiro e decimal", () => {
    expect(tokenizeJsLine("42").map((t) => t.kind)).toEqual(["number"]);
    expect(tokenizeJsLine("3.14").map((t) => t.kind)).toEqual(["number"]);
  });

  it("identificador com dígito no meio não vira número", () => {
    expect(tokenizeJsLine("x1").map((t) => t.kind)).toEqual(["plain"]);
  });

  it("junta os tokens de volta reproduz a linha original — nenhum caractere se perde", () => {
    const line = 'function ok(msg) { return "sim: " + msg; } // 42';
    const joined = tokenizeJsLine(line)
      .map((t) => t.text)
      .join("");
    expect(joined).toBe(line);
  });

  it("linha vazia não produz token nenhum", () => {
    expect(tokenizeJsLine("")).toEqual([]);
  });
});
