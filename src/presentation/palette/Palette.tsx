import { useState } from "react";

import type { Point } from "../../domain/shared/geometry.js";
import type { ShapeKind } from "../../domain/diagram/NodeContent.js";
import type { CatalogIcon } from "../../application/ports/index.js";
import type { EditorSession } from "../session/useEditorSession.js";
import { screenToWorld, type Viewport } from "../canvas/viewport.js";
import { SHAPE_GLYPH } from "../shapeGlyphs.js";
import { searchGeometry, type GeometryEntry } from "./geometryCatalog.js";

/**
 * Paleta lateral esquerda — DOIS grupos, "Geometria" e "Ícones", e não três como
 * antes (Marcas/Genéricos/UML).
 *
 * A divisão não é estética: é o que a pessoa PRECISA saber pra prever como um item
 * se comporta depois de solto no canvas. `preservesAspectRatio` (`NodeContent.ts`)
 * já modela essa diferença no domínio — ícone preserva proporção ao redimensionar,
 * forma não — a paleta só torna essa regra VISÍVEL antes do arrasto, não só depois:
 *
 * - **"Geometria"**: as cinco formas (`ShapeKind`) — cresce "de forma inteligente"
 *   (largura e altura livres, sem travar proporção; caixa de classe reflui texto em
 *   compartimentos). Produz `content.kind === "shape"`.
 * - **"Ícones"**: logo de marca, símbolo genérico e notação básica de UML — os TRÊS
 *   já eram `content.kind === "icon"` (a antiga seção "UML" da paleta já era ícone,
 *   só chamada diferente; ver `docs/specs/assets/catalogo-e-logos.md`). Cresce só de
 *   TAMANHO, mantendo a proporção do desenho. Ícone de notação UML carrega uma
 *   etiqueta "UML" na pré-visualização — continua achável como notação, mesmo
 *   dentro do grupo maior.
 *
 * A busca filtra os DOIS catálogos (`session.catalog` para ícone,
 * `searchGeometry` para forma) e mantém a mesma divisão em dois grupos, nunca uma
 * lista achatada — é exatamente essa divisão que ajuda a pessoa prever o
 * comportamento de escala ANTES de arrastar, e escondê-la na busca seria escondê-la
 * bem no momento em que ela mais importa (decidir qual dos dois resultados pegar).
 *
 * Arrastar um item daqui pro canvas cria UM nó, num gesto — não existe passo de
 * criar forma vazia e depois preencher, nem de criar nó e depois associar ícone.
 */
export const Palette = ({ session }: { session: EditorSession }) => {
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<Dragging | null>(null);

  const icons = session.catalog.search(query);
  const geometries = searchGeometry(query);
  const isEmpty = icons.length === 0 && geometries.length === 0;

  const startDragIcon = (slug: string) => (event: React.PointerEvent) => {
    armSelectTool(session);
    beginPaletteDrag(
      { kind: "icon", slug, x: event.clientX, y: event.clientY },
      setDragging,
      session.viewport,
      (at) => void session.actions.addIcon(slug, at),
    );
  };

  const startDragGeometry = (shape: ShapeKind) => (event: React.PointerEvent) => {
    armSelectTool(session);
    beginPaletteDrag(
      { kind: "geometry", shape, x: event.clientX, y: event.clientY },
      setDragging,
      session.viewport,
      (at) => session.actions.addShapeAt(shape, at),
    );
  };

  return (
    <aside className="palette">
      <input
        className="palette-search"
        placeholder="Buscar forma ou ícone…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="palette-body">
        <GeometryGroup entries={geometries} onStartDrag={startDragGeometry} />
        <IconGroup icons={icons} onStartDrag={startDragIcon} />
        {isEmpty && <p className="palette-empty">Nada com esse nome.</p>}
      </div>

      {dragging && <PaletteGhost dragging={dragging} catalog={session.catalog} />}
    </aside>
  );
};

// -------------------------------------------------------------- arrasto

type Dragging =
  | { readonly kind: "icon"; readonly slug: string; readonly x: number; readonly y: number }
  | { readonly kind: "geometry"; readonly shape: ShapeKind; readonly x: number; readonly y: number };

/**
 * Pegar um item da paleta larga qualquer ferramenta armada — as formas de criar nó
 * (desenhar na barra vs. soltar da paleta, ícone ou geometria) não ficam ativas ao
 * mesmo tempo. Sem isso, um clique no canvas logo depois de soltar o item desenharia
 * uma forma que a pessoa não pediu.
 */
const armSelectTool = (session: EditorSession) => session.actions.setTool("select");

/**
 * A mecânica de arrasto — fantasma seguindo o cursor, teste de "soltou dentro do
 * canvas", conversão pra coordenada de mundo — é IDÊNTICA para ícone e geometria;
 * só o que acontece ao soltar (`onDrop`) diverge (`addIcon`, assíncrono por causa do
 * hash do asset, vs. `addShapeAt`, síncrono). Extrair evita duas cópias da mesma
 * lógica de evento divergirem com o tempo.
 */
const beginPaletteDrag = (
  initial: Dragging,
  setDragging: React.Dispatch<React.SetStateAction<Dragging | null>>,
  viewport: Viewport,
  onDrop: (at: Point) => void,
) => {
  setDragging(initial);

  const onMove = (move: PointerEvent) =>
    setDragging((current) => (current ? { ...current, x: move.clientX, y: move.clientY } : null));

  const onUp = (up: PointerEvent) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    setDragging(null);

    const canvas = document.querySelector<SVGSVGElement>(".canvas");
    const box = canvas?.getBoundingClientRect();
    if (!box) return;

    const inside =
      up.clientX >= box.left &&
      up.clientX <= box.right &&
      up.clientY >= box.top &&
      up.clientY <= box.bottom;
    if (!inside) return; // soltou fora do canvas: nada acontece

    const at = screenToWorld(viewport, { x: up.clientX - box.left, y: up.clientY - box.top });
    onDrop(at);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
};

const PaletteGhost = ({
  dragging,
  catalog,
}: {
  dragging: Dragging;
  catalog: EditorSession["catalog"];
}) => {
  if (dragging.kind === "icon") {
    return (
      <img
        className="palette-ghost"
        src={dataUri(catalog.bySlug(dragging.slug)?.svg ?? "")}
        alt=""
        style={{ left: dragging.x, top: dragging.y }}
      />
    );
  }
  return (
    <span className="palette-ghost palette-ghost--glyph" style={{ left: dragging.x, top: dragging.y }} aria-hidden>
      {SHAPE_GLYPH[dragging.shape]}
    </span>
  );
};

// --------------------------------------------------------------- grupos

interface DragStarter<T> {
  (item: T): (event: React.PointerEvent) => void;
}

const GeometryGroup = ({
  entries,
  onStartDrag,
}: {
  entries: readonly GeometryEntry[];
  onStartDrag: DragStarter<ShapeKind>;
}) => {
  if (entries.length === 0) return null;
  return (
    <section className="palette-group">
      <h2 className="palette-group-title">Geometria</h2>
      <div className="palette-grid">
        {entries.map((entry) => (
          <button
            key={entry.shape}
            className="palette-item"
            title={`${entry.label} (${entry.key})`}
            onPointerDown={onStartDrag(entry.shape)}
          >
            <span className="palette-item-preview">
              <span className="palette-item-glyph" aria-hidden>
                {SHAPE_GLYPH[entry.shape]}
              </span>
            </span>
            <span className="palette-item-label">{entry.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

const IconGroup = ({
  icons,
  onStartDrag,
}: {
  icons: readonly CatalogIcon[];
  onStartDrag: DragStarter<string>;
}) => {
  if (icons.length === 0) return null;
  return (
    <section className="palette-group">
      <h2 className="palette-group-title">Ícones</h2>
      <div className="palette-grid">
        {icons.map((icon) => (
          <button
            key={icon.slug}
            className="palette-item"
            title={icon.name}
            onPointerDown={onStartDrag(icon.slug)}
          >
            <span className="palette-item-preview">
              <img src={dataUri(icon.svg)} alt="" width={28} height={28} draggable={false} />
              {/* Notação UML continua achável como notação, mesmo dentro do grupo
                  maior — sem isso, "Ator" e "Redis" ficariam visualmente
                  indistinguíveis até o próximo passo (arrastar e ver o resultado). */}
              {icon.category === "uml" && <span className="palette-item-tag">UML</span>}
            </span>
            <span className="palette-item-label">{icon.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
