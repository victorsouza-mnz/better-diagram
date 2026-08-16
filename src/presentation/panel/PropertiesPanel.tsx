import alignLeft from "lucide-static/icons/align-left.svg?raw";
import alignCenter from "lucide-static/icons/align-center.svg?raw";
import alignRight from "lucide-static/icons/align-right.svg?raw";
import alignTop from "lucide-static/icons/align-vertical-justify-start.svg?raw";
import alignMiddle from "lucide-static/icons/align-vertical-justify-center.svg?raw";
import alignBottom from "lucide-static/icons/align-vertical-justify-end.svg?raw";
import arrowRight from "lucide-static/icons/arrow-right.svg?raw";
import arrowLeftRight from "lucide-static/icons/arrow-left-right.svg?raw";

import type { TextAlign } from "../../domain/diagram/TextAlign.js";
import type { EdgeStyle } from "../../domain/diagram/EdgeStyle.js";
import type { EditorSession } from "../session/useEditorSession.js";

/** Traço sólido — não existe em `lucide-static` como ícone à parte, então é a
 *  mesma linha desenhada à mão, no mesmo estilo (`stroke-width="2"`,
 *  `stroke-linecap="round"`) dos ícones do lucide ao lado — para não destoar. */
const LINE_SOLID = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16"/></svg>`;

/** Mesma linha, com `stroke-dasharray` — sem ícone pronto no lucide pra isto. */
const LINE_DASHED = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h16" stroke-dasharray="5 4.5"/></svg>`;

/**
 * Painel de propriedades, à direita do canvas.
 *
 * Aparece só com EXATAMENTE um item selecionado (nó ou aresta) — mesma regra das
 * alças de redimensionar: seleção múltipla não tem "a" propriedade de um conjunto
 * heterogêneo, e por isso não mostra o painel. Zero selecionados, idem.
 *
 * O que desenha dentro depende do que está selecionado: nó de texto mostra
 * alinhamento, aresta mostra direção e traço. Nó de forma ou ícone ainda não tem
 * controle nenhum — mostra que não há nada, não é vazio por engano. A condição só
 * cresce conforme mais controles chegam (cor, borda…), spec
 * `docs/specs/ui/painel-propriedades.md`.
 */
export const PropertiesPanel = ({ session }: { session: EditorSession }) => {
  const { diagram, selection, actions } = session;

  const totalSelected = selection.nodes.size + selection.edges.size;
  if (totalSelected !== 1) return null;

  const nodeId = selection.nodes.size === 1 ? [...selection.nodes][0] : undefined;
  const node = nodeId ? diagram.node(nodeId) : undefined;

  const edgeId = selection.edges.size === 1 ? [...selection.edges][0] : undefined;
  const edge = edgeId ? diagram.edge(edgeId) : undefined;

  return (
    <aside className="properties-panel">
      {node && node.content.kind === "text" ? (
        <TextAlignFields
          align={node.content.align}
          onChange={(align) => actions.setTextAlign(node.id, align)}
        />
      ) : edge ? (
        <EdgeStyleFields
          style={edge.style}
          onChange={(style) => actions.setEdgeStyle(edge.id, style)}
        />
      ) : (
        <p className="properties-empty">Nada para configurar neste elemento.</p>
      )}
    </aside>
  );
};

const HORIZONTAL_OPTIONS: readonly {
  value: TextAlign["horizontal"];
  label: string;
  svg: string;
}[] = [
  { value: "left", label: "Alinhar à esquerda", svg: alignLeft },
  { value: "center", label: "Centralizar horizontalmente", svg: alignCenter },
  { value: "right", label: "Alinhar à direita", svg: alignRight },
];

const VERTICAL_OPTIONS: readonly {
  value: TextAlign["vertical"];
  label: string;
  svg: string;
}[] = [
  { value: "top", label: "Alinhar ao topo", svg: alignTop },
  { value: "middle", label: "Centralizar verticalmente", svg: alignMiddle },
  { value: "bottom", label: "Alinhar à base", svg: alignBottom },
];

const TextAlignFields = ({
  align,
  onChange,
}: {
  align: TextAlign;
  onChange: (align: TextAlign) => void;
}) => (
  <section className="properties-section">
    <h2 className="properties-title">Alinhamento do texto</h2>

    <div className="option-group" role="group" aria-label="Alinhamento horizontal">
      {HORIZONTAL_OPTIONS.map((option) => (
        <FieldButton
          key={option.value}
          active={align.horizontal === option.value}
          label={option.label}
          svg={option.svg}
          onClick={() => onChange({ ...align, horizontal: option.value })}
        />
      ))}
    </div>

    <div className="option-group" role="group" aria-label="Alinhamento vertical">
      {VERTICAL_OPTIONS.map((option) => (
        <FieldButton
          key={option.value}
          active={align.vertical === option.value}
          label={option.label}
          svg={option.svg}
          onClick={() => onChange({ ...align, vertical: option.value })}
        />
      ))}
    </div>
  </section>
);

const DIRECTION_OPTIONS: readonly { value: boolean; label: string; svg: string }[] = [
  { value: false, label: "Unidirecional", svg: arrowRight },
  { value: true, label: "Bidirecional", svg: arrowLeftRight },
];

const STROKE_OPTIONS: readonly { value: boolean; label: string; svg: string }[] = [
  { value: false, label: "Traço sólido", svg: LINE_SOLID },
  { value: true, label: "Traço tracejado", svg: LINE_DASHED },
];

/**
 * Direção e traço são dois eixos independentes (o VO `EdgeStyle` já modela assim,
 * ver `EdgeStyle.ts`) — dois grupos, cada um de dois botões, escolha direta. O
 * Alt+clique no canvas continua existindo, ciclando os 4 combos; os dois caminhos
 * gravam a mesma entrada de undo ("Mudar estilo da aresta") porque são a mesma
 * mudança, só por gatilhos diferentes.
 */
const EdgeStyleFields = ({
  style,
  onChange,
}: {
  style: EdgeStyle;
  onChange: (style: EdgeStyle) => void;
}) => (
  <section className="properties-section">
    <h2 className="properties-title">Estilo da aresta</h2>

    <div className="option-group" role="group" aria-label="Direção">
      {DIRECTION_OPTIONS.map((option) => (
        <FieldButton
          key={String(option.value)}
          active={style.bidirectional === option.value}
          label={option.label}
          svg={option.svg}
          onClick={() => onChange({ ...style, bidirectional: option.value })}
        />
      ))}
    </div>

    <div className="option-group" role="group" aria-label="Traço">
      {STROKE_OPTIONS.map((option) => (
        <FieldButton
          key={String(option.value)}
          active={style.dashed === option.value}
          label={option.label}
          svg={option.svg}
          onClick={() => onChange({ ...style, dashed: option.value })}
        />
      ))}
    </div>
  </section>
);

/**
 * `dangerouslySetInnerHTML` é seguro aqui: o SVG vem do PRÓPRIO BUILD
 * (`lucide-static`, importado com `?raw`) ou é escrito à mão neste arquivo — nunca
 * de entrada do usuário nem do catálogo de ícones. Mesmo nível de confiança de
 * escrever o markup direto no JSX. Não tem relação com o SVG de ícone do catálogo,
 * que passa pelo `SvgSanitizer` antes de existir no documento; este aqui nunca
 * chega perto do documento.
 */
const FieldButton = ({
  active,
  label,
  svg,
  onClick,
}: {
  active: boolean;
  label: string;
  svg: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    className={active ? "option-button option-button--active" : "option-button"}
    title={label}
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    dangerouslySetInnerHTML={{ __html: svg }}
  />
);
