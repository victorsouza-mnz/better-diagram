import type { Diagram } from "../../domain/diagram/Diagram.js";
import type { Edge } from "../../domain/diagram/Edge.js";
import {
  attachPoints,
  controlPoint,
  parallelBow,
} from "../../domain/diagram/services/edgeGeometry.js";
import type { Point, Rect } from "../../domain/shared/geometry.js";
import type { EdgeId, NodeId } from "../../domain/shared/ids.js";

interface Props {
  diagram: Diagram;
  selected: ReadonlySet<EdgeId>;
  onSelect: (id: EdgeId, additive: boolean) => void;
  /** `Alt`+clique: avança um passo no ciclo de 4 estilos. */
  onCycleStyle: (id: EdgeId) => void;
  /**
   * O retângulo ATUAL de um nó — a prévia, quando ele está sendo arrastado ou
   * redimensionado. Sem passar por aqui, a aresta lê `diagram.node(id).rect` (só
   * atualizado no commit) e fica para trás enquanto o nó se move na tela: a linha
   * solta do desenho até a pessoa soltar o botão.
   */
  rectOf: (nodeId: NodeId) => Rect | undefined;
}

/**
 * As arestas, desenhadas ATRÁS dos nós — para o logo nunca aparecer cortado por
 * uma linha.
 *
 * A geometria toda vem do domain service: aqui só se monta o `d` do path. Calcular
 * interseção dentro do JSX é o começo do fim.
 */
export const EdgeLayer = ({ diagram, selected, onSelect, onCycleStyle, rectOf }: Props) => (
  <g className="edge-layer">
    {bundles(diagram.edges).flatMap((bundle) =>
      bundle.map((edge, index) => (
        <EdgeView
          key={edge.id}
          edge={edge}
          rectOf={rectOf}
          bow={parallelBow(index, bundle.length)}
          selected={selected.has(edge.id)}
          onSelect={onSelect}
          onCycleStyle={onCycleStyle}
        />
      )),
    )}
  </g>
);

/**
 * Agrupa as arestas por par de nós, ignorando a direção.
 *
 * Sem direção de propósito: A→B e B→A também se sobreporiam, e o problema que o
 * feixe resolve é visual, não semântico.
 */
const bundles = (edges: readonly Edge[]): Edge[][] => {
  const groups = new Map<string, Edge[]>();

  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join("::");
    const group = groups.get(key);
    if (group) group.push(edge);
    else groups.set(key, [edge]);
  }
  return [...groups.values()];
};

interface EdgeViewProps {
  edge: Edge;
  rectOf: (nodeId: NodeId) => Rect | undefined;
  bow: number;
  selected: boolean;
  onSelect: (id: EdgeId, additive: boolean) => void;
  onCycleStyle: (id: EdgeId) => void;
}

const EdgeView = ({ edge, rectOf, bow, selected, onSelect, onCycleStyle }: EdgeViewProps) => {
  const source = rectOf(edge.source);
  const target = rectOf(edge.target);
  if (!source || !target) return null; // o agregado impede, mas o render não adivinha

  const points = attachPoints(source, target);
  // Centros coincidentes: não há direção, então não há o que desenhar. Volta
  // sozinho quando os nós se separam.
  if (!points) return null;

  const [from, to] = points;
  const control = controlPoint(from, to, bow);
  const d = `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
  const arrow = selected ? "url(#arrow-selected)" : "url(#arrow)";
  const className = ["edge", selected && "edge--selected", edge.style.dashed && "edge--dashed"]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      onPointerDown={(event) => {
        event.stopPropagation();
        // `Alt`+clique cicla o estilo — troca de gesto por completo, não soma à
        // seleção: os dois juntos ficariam ambíguos (selecionou, ou mudou o
        // estilo, ou os dois?).
        if (event.altKey) {
          onCycleStyle(edge.id);
          return;
        }
        onSelect(edge.id, event.shiftKey);
      }}
    >
      {/* Área de clique: uma linha de 1,5px é impossível de acertar. */}
      <path d={d} className="edge-hit" />
      <path
        d={d}
        className={className}
        markerStart={edge.style.bidirectional ? arrow : undefined}
        markerEnd={arrow}
      />
      {edge.label !== "" && <EdgeLabel at={control} text={edge.label} />}
    </g>
  );
};

const EdgeLabel = ({ at, text }: { at: Point; text: string }) => (
  <text x={at.x} y={at.y - 6} className="edge-label">
    {text}
  </text>
);
