import { MAX_SCALE, MIN_SCALE, type Viewport } from "./viewport.js";

/**
 * Zoom in / zoom out, centro inferior do canvas.
 *
 * Mesmo caso de uso do zoom por `Ctrl`/`Cmd`+scroll (`actions.zoom`) — só o PONTO
 * em torno do qual o zoom acontece muda: a roda usa o cursor, o botão usa o centro
 * da tela, porque um clique não tem "onde o mouse estava passando por cima do
 * mundo" pra manter fixo.
 */

/** Passo por clique — maior que o da roda (1.1): um clique é um gesto deliberado,
 *  não uma sucessão de eventos pequenos, então pode avançar mais de uma vez. */
const STEP = 1.2;

interface Props {
  viewport: Viewport;
  canvasSize: { w: number; h: number };
  onZoom: (at: { x: number; y: number }, factor: number) => void;
}

export const ZoomControls = ({ viewport, canvasSize, onZoom }: Props) => {
  const center = { x: canvasSize.w / 2, y: canvasSize.h / 2 };

  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button
        type="button"
        className="zoom-button"
        aria-label="Diminuir zoom"
        disabled={viewport.scale <= MIN_SCALE}
        onClick={() => onZoom(center, 1 / STEP)}
      >
        −
      </button>
      <span className="zoom-value">{Math.round(viewport.scale * 100)}%</span>
      <button
        type="button"
        className="zoom-button"
        aria-label="Aumentar zoom"
        disabled={viewport.scale >= MAX_SCALE}
        onClick={() => onZoom(center, STEP)}
      >
        +
      </button>
    </div>
  );
};
