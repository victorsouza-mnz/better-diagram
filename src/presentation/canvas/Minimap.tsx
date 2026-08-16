import type { Diagram } from "../../domain/diagram/Diagram.js";
import { boundingBox, center as centerOf, rect, type Point, type Rect } from "../../domain/shared/geometry.js";
import { minimapWindow } from "./minimapGeometry.js";
import { screenToWorld, type Viewport } from "./viewport.js";

/**
 * Minimapa — canto inferior esquerdo do canvas.
 *
 * Mostra o retângulo de cada nó em miniatura e um retângulo maior representando a
 * CÂMERA (o que está visível na tela agora). Arrastar o retângulo da câmera navega
 * pelo plano — mesma ação de um pan, só que pelo mapa em vez do canvas direto.
 * Clicar em qualquer outro ponto do mapa também navega pra lá — sai arrastando na
 * hora, sem precisar soltar e pegar de novo no retângulo certo.
 *
 * Só ESTADO DE SESSÃO (`viewport`) muda aqui — nunca o documento. Mesma regra de
 * qualquer pan/zoom (`editor/canvas-selecao-e-arrasto.md`): não é undo-ável.
 */

const WIDTH = 180;
const HEIGHT = 130;
/** Respiro nas bordas do mapa — conteúdo e câmera nunca colam nelas. */
const PADDING = 8;
/** Tamanho mínimo do retângulo da câmera na tela, mesmo se o mundo real for maior
 *  que o mapa inteiro (muito zoom) — abaixo disso não dá pra pegar pra arrastar. */
const MIN_CAMERA_PX = 8;

interface Props {
  diagram: Diagram;
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  onPanBy: (dx: number, dy: number) => void;
}

export const Minimap = ({ diagram, viewport, canvasSize, onPanBy }: Props) => {
  // A câmera em coordenadas de MUNDO — exatamente o que `screenToWorld` já usa
  // para converter clique, só que nos dois cantos da tela em vez de um ponto.
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, { x: canvasSize.w || 1, y: canvasSize.h || 1 });
  const cameraWorld = rect(
    topLeft.x,
    topLeft.y,
    Math.max(bottomRight.x - topLeft.x, 1),
    Math.max(bottomRight.y - topLeft.y, 1),
  );

  // A janela de mundo que o mapa mostra — `minimapWindow` é função pura e testada
  // à parte; o porquê da conta (centro fixo no conteúdo, nunca na câmera) está lá.
  const contentWorld = boundingBox(diagram.nodes.map((node) => node.rect));
  const window_ = minimapWindow(cameraWorld, contentWorld);
  const padded = expand(window_, Math.max(window_.w, window_.h) * 0.1);

  const innerW = WIDTH - PADDING * 2;
  const innerH = HEIGHT - PADDING * 2;
  // Escala ÚNICA nos dois eixos — um retângulo não pode parecer mais "gordo" ou
  // "magro" no mapa do que é no mundo.
  const mapScale = Math.min(innerW / padded.w, innerH / padded.h);
  const offset = {
    x: PADDING + (innerW - padded.w * mapScale) / 2,
    y: PADDING + (innerH - padded.h * mapScale) / 2,
  };

  const toMap = (p: Point): Point => ({
    x: offset.x + (p.x - padded.x) * mapScale,
    y: offset.y + (p.y - padded.y) * mapScale,
  });
  const fromMap = (p: Point): Point => ({
    x: padded.x + (p.x - offset.x) / mapScale,
    y: padded.y + (p.y - offset.y) / mapScale,
  });

  const cameraTopLeft = toMap({ x: cameraWorld.x, y: cameraWorld.y });
  const cameraSize = {
    w: Math.max(cameraWorld.w * mapScale, MIN_CAMERA_PX),
    h: Math.max(cameraWorld.h * mapScale, MIN_CAMERA_PX),
  };

  /**
   * Arrasta a partir de QUALQUER ponto do mapa (não só do retângulo da câmera):
   * um clique num ponto qualquer já centraliza a câmera nele, e o arrasto que
   * segue continua pelo mesmo gesto — não precisa soltar e mirar de novo no
   * retângulo pra só então arrastar.
   */
  const beginPan = (event: React.PointerEvent) => {
    event.stopPropagation();
    let last = { x: event.clientX, y: event.clientY };

    const onMove = (move: PointerEvent) => {
      const dxMap = move.clientX - last.x;
      const dyMap = move.clientY - last.y;
      last = { x: move.clientX, y: move.clientY };
      // px do mapa → mundo (divide pela escala do mapa) → tela (multiplica pela
      // escala da câmera de verdade) — a mesma unidade que `panBy` já espera.
      // Negativo: arrastar a câmera pra DIREITA no mapa move o que se vê pra
      // direita no mundo, e isso desloca o conteúdo pra ESQUERDA na tela.
      onPanBy(-(dxMap / mapScale) * viewport.scale, -(dyMap / mapScale) * viewport.scale);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onBackgroundDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const clickWorld = fromMap({ x: event.clientX - box.left, y: event.clientY - box.top });
    const cameraCenter = centerOf(cameraWorld);
    onPanBy(
      -(clickWorld.x - cameraCenter.x) * viewport.scale,
      -(clickWorld.y - cameraCenter.y) * viewport.scale,
    );
    beginPan(event);
  };

  return (
    <svg
      className="minimap"
      width={WIDTH}
      height={HEIGHT}
      onPointerDown={onBackgroundDown}
    >
      <rect width={WIDTH} height={HEIGHT} className="minimap-background" />

      {diagram.nodes.map((node) => {
        const at = toMap({ x: node.rect.x, y: node.rect.y });
        return (
          <rect
            key={node.id}
            x={at.x}
            y={at.y}
            width={Math.max(node.rect.w * mapScale, 2)}
            height={Math.max(node.rect.h * mapScale, 2)}
            className="minimap-node"
          />
        );
      })}

      <rect
        x={cameraTopLeft.x}
        y={cameraTopLeft.y}
        width={cameraSize.w}
        height={cameraSize.h}
        className="minimap-camera"
        style={{ cursor: "grab" }}
        onPointerDown={(event) => {
          // Já é tratado pelo `onBackgroundDown` do `<svg>` (bubbling) — só evita
          // que o clique tente "pular" a câmera pra debaixo dela mesma primeiro.
          event.stopPropagation();
          beginPan(event);
        }}
      />
    </svg>
  );
};

/** Cresce o retângulo `by` em cada direção, mantendo o centro. */
const expand = (r: Rect, by: number): Rect =>
  rect(r.x - by, r.y - by, r.w + by * 2, r.h + by * 2);
