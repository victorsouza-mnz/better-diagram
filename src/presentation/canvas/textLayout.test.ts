import { describe, expect, it } from "vitest";

import { widestLine, wrapText } from "./textLayout.js";

// Medidor falso: 10px por caractere. Testar a REGRA de quebra sem depender de fonte
// nem de browser é o motivo de o medidor ser injetado.
const measure = (text: string) => text.length * 10;
const wrap = (text: string, maxWidth: number) => wrapText(text, maxWidth, measure);

describe("wrapText", () => {
  it("mantém numa linha o que cabe", () => {
    expect(wrap("api gateway", 200)).toEqual(["api gateway"]);
  });

  it("quebra por espaço quando não cabe", () => {
    // "api gateway" = 110px e não cabe em 80px; "gateway" sozinho tem 70px e cabe.
    expect(wrap("api gateway", 80)).toEqual(["api", "gateway"]);
  });

  it("respeita as quebras digitadas pela pessoa", () => {
    expect(wrap("API Gateway\n(Kong)", 500)).toEqual(["API Gateway", "(Kong)"]);
  });

  it("preserva linha em branco entre parágrafos", () => {
    expect(wrap("a\n\nb", 500)).toEqual(["a", "", "b"]);
  });

  it("corta palavra que não cabe nem sozinha", () => {
    // Sem isso, um nome longo vazaria para fora da caixa.
    expect(wrap("authentication_service", 50)).toEqual([
      "authe",
      "ntica",
      "tion_",
      "servi",
      "ce",
    ]);
  });

  it("continua a linha depois de cortar uma palavra longa", () => {
    // A palavra é cortada de 5 em 5; o último pedaço ("o") ainda recebe "ok".
    const linhas = wrap("supercalifragilistico ok", 50);
    expect(linhas[linhas.length - 1]).toBe("o ok");
  });

  it("nunca produz linha mais larga que o limite, exceto caractere único", () => {
    const texto = "orquestrador de filas assíncronas com retentativa exponencial";
    for (const linha of wrap(texto, 120)) {
      expect(measure(linha)).toBeLessThanOrEqual(120);
    }
  });

  it("texto vazio vira uma linha vazia", () => {
    expect(wrap("", 100)).toEqual([""]);
  });

  it("largura zero devolve o texto sem quebrar, em vez de laçar para sempre", () => {
    expect(wrap("abc", 0)).toEqual(["abc"]);
  });
});

describe("widestLine", () => {
  it("mede a linha mais larga", () => {
    expect(widestLine(["ab", "abcd", "a"], measure)).toBe(40);
  });

  it("é zero para lista vazia", () => {
    expect(widestLine([], measure)).toBe(0);
  });
});
