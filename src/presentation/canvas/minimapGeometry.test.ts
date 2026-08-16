import { describe, expect, it } from "vitest";

import { containsRect, rect } from "../../domain/shared/geometry.js";
import { EMPTY_WORLD_HALF, minimapWindow } from "./minimapGeometry.js";

describe("minimapWindow", () => {
  it("sem conteúdo, centra na origem do mundo — não na câmera", () => {
    const camera = rect(1000, 2000, 800, 600); // bem longe da origem
    const window_ = minimapWindow(camera, undefined);

    expect(window_.x + window_.w / 2).toBeCloseTo(0);
    expect(window_.y + window_.h / 2).toBeCloseTo(0);
    expect(window_.w).toBeGreaterThanOrEqual(EMPTY_WORLD_HALF * 2);
  });

  /**
   * O bug de verdade: câmera bem maior que o conteúdo (comum — uma forma solta,
   * zoom padrão) não pode fazer a janela "colapsar" pra câmera. Se colapsasse,
   * arrastar a câmera manteria sua posição relativa na janela sempre a mesma —
   * ela pareceria travada no mapa, mesmo com o pan de verdade acontecendo.
   */
  it("câmera bem maior que o conteúdo: o centro da janela continua no conteúdo, não na câmera", () => {
    const content = rect(100, 100, 20, 20);
    const cameraA = rect(0, 0, 1000, 800);
    const cameraB = rect(500, 300, 1000, 800); // mesma câmera, só que arrastada

    const windowA = minimapWindow(cameraA, content);
    const windowB = minimapWindow(cameraB, content);

    // As duas janelas continuam centradas no CONTEÚDO — não migraram para
    // acompanhar a câmera 1:1 (esse é exatamente o bug: `window.x` variando junto
    // com `camera.x`, mantendo a posição relativa da câmera sempre igual).
    const contentCenterX = content.x + content.w / 2;
    expect(windowA.x + windowA.w / 2).toBeCloseTo(contentCenterX);
    expect(windowB.x + windowB.w / 2).toBeCloseTo(contentCenterX);
  });

  it("a janela sempre contém a câmera inteira, mesmo quando ela é maior que o conteúdo", () => {
    const content = rect(100, 100, 20, 20);
    const camera = rect(-400, -200, 1000, 800);

    const window_ = minimapWindow(camera, content);

    expect(containsRect(window_, camera)).toBe(true);
  });

  it("a janela sempre contém o conteúdo inteiro, mesmo quando ele é maior que a câmera", () => {
    const content = rect(0, 0, 5000, 4000);
    const camera = rect(2000, 1500, 200, 150);

    const window_ = minimapWindow(camera, content);

    expect(containsRect(window_, content)).toBe(true);
  });

  it("conteúdo já contém a câmera inteira: a janela é só o conteúdo (sem sobra por causa da câmera)", () => {
    const content = rect(0, 0, 2000, 2000);
    const camera = rect(900, 900, 100, 100); // dentro do conteúdo

    const window_ = minimapWindow(camera, content);

    expect(window_).toEqual(content);
  });
});
