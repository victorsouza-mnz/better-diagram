import { useState } from "react";

import type { CatalogIcon } from "../../application/ports/index.js";
import type { EditorSession } from "../session/useEditorSession.js";
import { screenToWorld } from "../canvas/viewport.js";

/**
 * Paleta de ícones — logos de marca, símbolos genéricos de arquitetura e notação
 * básica de UML, agrupados em DUAS seções: "UML" e "Ícones".
 *
 * "Ícones" funde marca e genérico — as duas categorias continuam existindo em
 * `CatalogIcon.category` (a distinção importa pra licenciamento: logo é marca de
 * terceiro, símbolo genérico não é — ver `docs/specs/assets/catalogo-e-logos.md`),
 * só não viram MAIS uma seção na paleta: pra quem está montando um diagrama, "Redis"
 * e "banco de dados" são a mesma pergunta ("o que eu arrasto pra representar
 * armazenamento?"), e forçar a pessoa a olhar duas listas pra responder uma pergunta
 * só era o problema, não a marca em si. A ORDEM dentro de "Ícones" continua marca
 * primeiro (é o diferencial declarado do produto — `docs/overview.md`): o catálogo
 * já devolve nessa ordem, e o filtro abaixo preserva.
 *
 * Arrastar um ícone daqui para o canvas cria UM nó, num gesto — não existe passo de
 * criar uma forma e depois associar o ícone. É a spec de assets em código.
 *
 * Buscando, a lista fica achatada: agrupar por seção só ajuda quando se está
 * navegando o catálogo inteiro; com um filtro digitado, a pessoa já reduziu a lista
 * sozinha, e uma seção vazia entre duas com resultado só atrapalha.
 */
export const IconPalette = ({ session }: { session: EditorSession }) => {
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState<{ slug: string; x: number; y: number } | null>(
    null,
  );

  const icons = session.catalog.search(query);
  const isBrowsing = query.trim() === "";
  const uml = icons.filter((icon) => icon.category === "uml");
  const others = icons.filter((icon) => icon.category !== "uml");

  const startDrag = (slug: string) => (event: React.PointerEvent) => {
    // Pegar um ícone da paleta larga qualquer ferramenta de forma armada: as duas
    // formas de criar nó (desenhar vs. arrastar um logo) não ficam ativas ao mesmo
    // tempo — senão o próximo clique no canvas, depois de soltar o ícone, desenharia
    // uma forma que a pessoa não pediu.
    session.actions.setTool("select");
    setDragging({ slug, x: event.clientX, y: event.clientY });

    const onMove = (move: PointerEvent) =>
      setDragging((current) =>
        current ? { ...current, x: move.clientX, y: move.clientY } : null,
      );

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

      const at = screenToWorld(session.viewport, {
        x: up.clientX - box.left,
        y: up.clientY - box.top,
      });
      void session.actions.addIcon(slug, at);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <aside className="palette">
      <input
        className="palette-search"
        placeholder="Buscar tecnologia…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="palette-body">
        {isBrowsing ? (
          <>
            <IconGroup label="UML" icons={uml} onStartDrag={startDrag} />
            <IconGroup label="Ícones" icons={others} onStartDrag={startDrag} />
          </>
        ) : (
          <div className="palette-grid">
            {icons.map((icon) => (
              <PaletteItem key={icon.slug} icon={icon} onStartDrag={startDrag} />
            ))}
          </div>
        )}
        {icons.length === 0 && <p className="palette-empty">Nenhum ícone com esse nome.</p>}
      </div>

      {dragging && (
        <img
          className="palette-ghost"
          src={dataUri(session.catalog.bySlug(dragging.slug)?.svg ?? "")}
          alt=""
          style={{ left: dragging.x, top: dragging.y }}
        />
      )}
    </aside>
  );
};

interface DragStarter {
  (slug: string): (event: React.PointerEvent) => void;
}

const IconGroup = ({
  label,
  icons,
  onStartDrag,
}: {
  label: string;
  icons: readonly CatalogIcon[];
  onStartDrag: DragStarter;
}) => {
  if (icons.length === 0) return null;
  return (
    <section className="palette-group">
      <h2 className="palette-group-title">{label}</h2>
      <div className="palette-grid">
        {icons.map((icon) => (
          <PaletteItem key={icon.slug} icon={icon} onStartDrag={onStartDrag} />
        ))}
      </div>
    </section>
  );
};

const PaletteItem = ({ icon, onStartDrag }: { icon: CatalogIcon; onStartDrag: DragStarter }) => (
  <button className="palette-item" title={icon.name} onPointerDown={onStartDrag(icon.slug)}>
    <img src={dataUri(icon.svg)} alt="" width={28} height={28} draggable={false} />
    <span>{icon.name}</span>
  </button>
);

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
