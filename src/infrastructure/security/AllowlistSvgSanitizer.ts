import type { SvgSanitizer } from "../../application/ports/index.js";

/**
 * Sanitizador de SVG por allowlist.
 *
 * O renderer é DOM: SVG não sanitizado é XSS de verdade. Este adaptador roda ANTES
 * de o asset entrar no documento, para que o invariante valha para o arquivo
 * guardado — o que está na tabela já está limpo.
 *
 * É allowlist, e não blocklist, de propósito: a lista de coisas perigosas em SVG
 * cresce com cada versão de browser, e uma blocklist só protege do que já se
 * conhece. Aqui, o que não está listado sai. Sanitizador que recusa conteúdo
 * legítimo é aceitável; permissivo, não.
 *
 * DECISÃO EM ABERTO (ver spec de assets): trocar por DOMPurify com
 * `USE_PROFILES: { svg: true }`. Esta implementação é deliberadamente restritiva e
 * cobre o catálogo embutido e logos comuns; antes de liberar upload de SVG
 * arbitrário para usuário final, revise ou troque.
 */

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "title",
  "desc",
]);

/**
 * Índice em minúsculas de `ALLOWED_ELEMENTS` — mesmo motivo do índice de atributos
 * logo abaixo: `linearGradient`, `radialGradient` e `clipPath` têm maiúscula no
 * meio do nome (é a grafia real do elemento SVG), mas `tagName.toLowerCase()`
 * chega em minúsculas puras. Comparar contra o Set original os removia sempre —
 * um gradiente nunca sobrevivia à sanitização, mesmo vindo do catálogo confiável.
 */
const ALLOWED_ELEMENTS_LOWER = new Set([...ALLOWED_ELEMENTS].map((name) => name.toLowerCase()));

const ALLOWED_ATTRIBUTES = new Set([
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
  "points",
  "viewBox",
  "fill",
  "fill-rule",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-opacity",
  "opacity",
  "transform",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "clip-path",
  "clip-rule",
  "id",
  "xmlns",
]);

/**
 * A comparação é sempre em minúsculas — nunca contra `ALLOWED_ATTRIBUTES` direto.
 *
 * `ALLOWED_ATTRIBUTES` guarda a grafia real do SVG (`viewBox`, `gradientUnits`, com
 * maiúsculas no meio), porque é assim que se lê a spec e se reconhece o atributo.
 * Mas o nome do atributo chega em minúsculas (`attr.name.toLowerCase()`), e
 * comparar `"viewbox"` contra um `Set` que contém `"viewBox"` nunca bate — o
 * atributo era removido em silêncio, e um `<image>` sem `viewBox` não sabe escalar
 * o desenho: ele aparece no tamanho intrínseco, plantado no canto. Índice à parte
 * resolve isso sem abrir mão da grafia legível na lista acima.
 */
const ALLOWED_ATTRIBUTES_LOWER = new Set(
  [...ALLOWED_ATTRIBUTES].map((name) => name.toLowerCase()),
);

/** `url(#id)` e valores simples passam; `javascript:`, `data:` e `http:` não. */
const SAFE_VALUE = /^(?!.*(?:javascript:|data:|https?:|<))[\s\S]*$/i;

export class AllowlistSvgSanitizer implements SvgSanitizer {
  sanitize(svg: string): string {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");

    if (doc.querySelector("parsererror")) {
      throw new Error("SVG inválido: não foi possível interpretar o arquivo");
    }

    const root = doc.documentElement;
    if (root.tagName.toLowerCase() !== "svg") {
      throw new Error("Arquivo não é um SVG");
    }

    this.clean(root);
    return new XMLSerializer().serializeToString(root);
  }

  private clean(element: Element): void {
    // Cópia da lista: remover durante a iteração pula elementos.
    for (const child of [...element.children]) {
      if (!ALLOWED_ELEMENTS_LOWER.has(child.tagName.toLowerCase())) {
        child.remove();
        continue;
      }
      this.clean(child);
    }

    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const allowed =
        ALLOWED_ATTRIBUTES_LOWER.has(name) &&
        !name.startsWith("on") &&
        SAFE_VALUE.test(attr.value);
      if (!allowed) element.removeAttribute(attr.name);
    }
  }
}
