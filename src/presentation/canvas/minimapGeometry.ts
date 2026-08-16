import { center as centerOf, rect, type Rect } from "../../domain/shared/geometry.js";

/**
 * A janela de mundo que o minimapa mostra — função pura, separada do componente
 * de propósito: é a conta mais fácil de errar de um jeito que só aparece na
 * prática (arrastar e o retângulo da câmera não se mexer), então precisa ser
 * testável isolada, sem SVG nem ponteiro.
 *
 * CENTRO fixo no conteúdo — nunca em `cameraWorld`. Reagir à posição da câmera faz
 * a janela reCENTRALIZAR nela a cada render (ou, com um `union` ingênuo entre
 * câmera e conteúdo, COLAPSAR pra câmera sempre que ela for o maior dos dois
 * retângulos — o caso comum, não a exceção): a câmera passa a parecer travada no
 * mesmo lugar do mapa não importa pra onde a pessoa arrasta, porque a própria
 * referência se realinhava com ela antes de se mexer visualmente.
 *
 * TAMANHO grande o bastante pra sempre incluir a câmera — sem isso, uma câmera bem
 * maior que o conteúdo (comum: 1-2 formas soltas, zoom padrão) cai fora da janela,
 * pequena demais pra conter as duas coisas, e o retângulo nem aparece pra arrastar.
 *
 * Sem nó nenhum no diagrama (`contentWorld` indefinido), o centro é a origem do
 * mundo — não depende de zoom nem de posição da câmera.
 */
export const EMPTY_WORLD_HALF = 500;

export const minimapWindow = (cameraWorld: Rect, contentWorld: Rect | undefined): Rect => {
  const anchor =
    contentWorld ??
    rect(-EMPTY_WORLD_HALF, -EMPTY_WORLD_HALF, EMPTY_WORLD_HALF * 2, EMPTY_WORLD_HALF * 2);
  const anchorCenter = centerOf(anchor);

  const halfW = Math.max(
    anchor.w / 2,
    Math.abs(cameraWorld.x - anchorCenter.x),
    Math.abs(cameraWorld.x + cameraWorld.w - anchorCenter.x),
  );
  const halfH = Math.max(
    anchor.h / 2,
    Math.abs(cameraWorld.y - anchorCenter.y),
    Math.abs(cameraWorld.y + cameraWorld.h - anchorCenter.y),
  );

  return rect(anchorCenter.x - halfW, anchorCenter.y - halfH, halfW * 2, halfH * 2);
};
