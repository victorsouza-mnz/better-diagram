// @vitest-environment jsdom
//
// Único arquivo de `infrastructure/` que precisa de DOM de verdade: o sanitizador
// usa `DOMParser`/`XMLSerializer`, que não existem em Node puro. `domain/` continua
// proibido de precisar disso — ver a regra em `docs/architecture.md`.

import { describe, expect, it } from "vitest";

import serverIcon from "lucide-static/icons/server.svg?raw";
import { AllowlistSvgSanitizer } from "./AllowlistSvgSanitizer.js";

const sanitizer = new AllowlistSvgSanitizer();

describe("AllowlistSvgSanitizer — atributos camelCase", () => {
  it("preserva viewBox — regressão do bug em que o ícone ficava preso no canto", () => {
    // O `viewBox` é o que faz o <image> saber escalar o desenho para o w/h pedido.
    // Removê-lo por engano faz o SVG renderizar no tamanho intrínseco, no canto
    // superior esquerdo — foi exatamente o bug: a comparação da allowlist
    // lowercased o nome do atributo ("viewbox") mas o Set guardava "viewBox".
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000"><path d="M1 1"/></svg>';
    expect(sanitizer.sanitize(svg)).toContain('viewBox="0 0 24 24"');
  });

  it("preserva gradientUnits e gradientTransform", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
      '<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" gradientTransform="rotate(45)">' +
      '<stop offset="0" stop-color="#fff"/></linearGradient></defs>' +
      '<path d="M0 0" fill="url(#g)"/></svg>';

    const limpo = sanitizer.sanitize(svg);
    expect(limpo).toContain('gradientUnits="userSpaceOnUse"');
    expect(limpo).toContain('gradientTransform="rotate(45)"');
  });

  it("preserva um ícone de traço real (lucide) — rect, line e stroke-linecap intactos", () => {
    // Os logos de marca são um <path> preenchido só; os genéricos são traço, com
    // vários primitivos (rect/line) e atributos de traço. É uma forma de SVG
    // diferente da que motivou o catálogo original, e vale garantir que o
    // sanitizador não tem um segundo ponto cego específico dela.
    const limpo = sanitizer.sanitize(serverIcon);
    expect(limpo).toContain("<rect");
    expect(limpo).toContain("<line");
    expect(limpo).toContain('stroke-linecap="round"');
    expect(limpo).toContain('viewBox="0 0 24 24"');
  });
});

describe("AllowlistSvgSanitizer — remove o perigoso", () => {
  it("remove <script>", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>';
    expect(sanitizer.sanitize(svg)).not.toContain("script");
  });

  it("remove handler onload", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>';
    expect(sanitizer.sanitize(svg)).not.toContain("onload");
  });

  it("remove foreignObject", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>';
    expect(sanitizer.sanitize(svg)).not.toContain("foreignObject");
  });

  it("remove href com javascript:", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>';
    expect(sanitizer.sanitize(svg)).not.toContain("javascript:");
  });

  it("recusa entrada que não é SVG válido", () => {
    expect(() => sanitizer.sanitize("não é xml <<<")).toThrow();
  });
});
