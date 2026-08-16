import type { Diagram } from "../../domain/diagram/Diagram.js";
import type { DiagramNode } from "../../domain/diagram/Node.js";
import {
  RESIZE_HANDLES,
  handlePosition,
  type ResizeHandle,
} from "../../domain/diagram/services/resizeGeometry.js";
import type { Rect } from "../../domain/shared/geometry.js";
import { NodeLabel } from "./NodeLabel.js";

interface Props {
  node: DiagramNode;
  diagram: Diagram;
  selected: boolean;
  /**
   * O retângulo a DESENHAR — nem sempre é o do nó: durante um arrasto ou um
   * redimensionamento, é a prévia. O documento só muda ao soltar.
   */
  rect: Rect;
  /**
   * Alças de redimensionamento renderizam quando não há outro gesto em curso
   * (arrastar, conectar, marquee) — a VISIBILIDADE de fato é CSS: aparecem no
   * hover de qualquer nó, e continuam à mostra sem hover quando o nó é a
   * SELEÇÃO ÚNICA (`soloSelected`), para não sumirem assim que o cursor sai
   * depois de um clique de seleção.
   */
  handles: boolean;
  /**
   * Este nó é o ÚNICO selecionado — não apenas "está no conjunto". Com dois ou
   * mais selecionados, `selected` vale `true` para os dois, mas nenhum é
   * `soloSelected`: as alças ficam ausentes por padrão, só voltando no hover de
   * cada um. Confundir os dois sinais faria TODOS os nós de uma seleção múltipla
   * mostrarem alça o tempo todo, sem precisar de hover.
   */
  soloSelected: boolean;
  /** Escala do viewport: as alças têm tamanho de tela, não de mundo. */
  scale: number;
  onPointerDown: (event: React.PointerEvent) => void;
  onStartConnect: (event: React.PointerEvent) => void;
  onEditLabel: () => void;
  onStartResize: (handle: ResizeHandle, event: React.PointerEvent) => void;
  hidden: boolean;
}

/** Lado da alça, em pixels de TELA. */
const HANDLE_SCREEN_SIZE = 9;

/**
 * Quanto a FAIXA DE CLIQUE do ponto de conexão avança para fora do nó, em pixels de
 * TELA. Ela começa ENCOSTADA na borda (x=0 no grupo, que já está transladado até lá)
 * — não num círculo isolado mais adiante — porque `.node-connect` só aparece via
 * `.node:hover`, e esse `:hover` desliga assim que o ponteiro sai de QUALQUER parte
 * clicável do nó. Um vão entre a borda e o alvo de clique é o cursor saindo do
 * `:hover` no meio do caminho: a seta desaparece antes de a pessoa alcançá-la. A
 * faixa mantém o `:hover` do grupo por toda a travessia.
 */
const CONNECT_REACH_SCREEN = 26;

/**
 * Desenha um nó.
 *
 * Três decisões de spec ficam visíveis aqui:
 *
 * 1. A ÁREA DE CLIQUE É O RETÂNGULO, nunca o traço do vetor. O logo do Redis tem
 *    vãos transparentes, e clicar num deles precisa selecionar o nó — não o que
 *    está atrás. Por isso o desenho leva `pointer-events: none` e um `<rect>`
 *    invisível por cima recebe o ponteiro.
 *
 * 2. O SVG do asset entra como `<image>` com data URI, e não injetado no DOM. Fica
 *    nítido em qualquer zoom (continua vetor) e o conteúdo do `<image>` é
 *    isolado — script ali não executa. É defesa em profundidade: o sanitizador já
 *    limpou na entrada, e este caminho não devolve a capacidade de executar.
 *
 * 3. CONECTAR tem UM ponto de partida fixo — a setinha no lado direito, visível no
 *    hover — e não quatro (um por lado), como havia antes. `Alt`+arrastar de
 *    qualquer lugar do nó cobre os outros lados sem precisar de mais alças (ver
 *    `DiagramCanvas`); um ponto só, sempre no mesmo lugar, é mais fácil de mirar de
 *    cor do que acertar um de quatro círculos pequenos.
 */
export const NodeView = ({
  node,
  diagram,
  selected,
  rect,
  handles,
  soloSelected,
  scale,
  onPointerDown,
  onStartConnect,
  onEditLabel,
  onStartResize,
  hidden,
}: Props) => {
  const { x, y, w, h } = rect;
  const content = node.content;
  // Uma alça de 8px do mundo vira 2px a 25% de zoom, e ninguém acerta.
  const handleSize = HANDLE_SCREEN_SIZE / scale;
  // Mesma ideia para o ponto de conexão: o grupo inteiro (faixa de clique + seta)
  // escala como um bloco, então tudo dentro dele já pode ser escrito direto em
  // pixels de tela — não precisa dividir cada número por `scale` de novo.
  const connectScale = 1 / scale;

  return (
    <g
      className="node"
      transform={`translate(${x} ${y})`}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onEditLabel();
      }}
    >
      {content.kind === "icon" && (
        <image
          href={dataUri(diagram.asset(content.assetId)?.data ?? "")}
          width={w}
          height={h}
          style={{ pointerEvents: "none" }}
        />
      )}

      {content.kind === "shape" && <Shape shape={content.shape} w={w} h={h} />}

      {/* Área de clique: cobre o retângulo inteiro, inclusive os vãos do logo. */}
      <rect width={w} height={h} fill="transparent" className="node-hit" />

      {selected && (
        <rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          className="node-selection"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Durante a edição o rótulo some e o editor sobreposto toma o lugar, alinhado
          ao mesmo ponto — sem isso o texto apareceria duas vezes, e "pularia" ao
          entrar e sair da edição. */}
      {!hidden && <NodeLabel node={node} rect={rect} />}

      {/* Ponto de conexão: aparece no hover (via CSS), no lado direito. NÃO é
          gravado no documento — o encaixe da aresta continua sendo derivado da
          geometria dos retângulos, não de onde a pessoa pegou para arrastar.

          O grupo é transladado só até a BORDA (x=0 local = borda direita do nó) —
          a faixa de clique é que avança a partir daí, encostada, sem vão. */}
      <g
        className="node-connect"
        transform={`translate(${w} ${h / 2}) scale(${connectScale})`}
        onPointerDown={(event) => {
          event.stopPropagation(); // não é para começar a mover o nó
          onStartConnect(event);
        }}
      >
        {/* Faixa de clique: começa ENCOSTADA na borda (x=0) e vai até um pouco além
            da ponta da seta — mantém `.node:hover` ligado por toda a travessia do
            ponteiro, e não só num círculo isolado no fim do caminho. */}
        <rect x={0} y={-10} width={CONNECT_REACH_SCREEN} height={20} className="node-connect-hit" />
        {/* Uma seta de verdade — haste + ponta — não só um triângulo solto. */}
        <path
          d="M 6 -2.2 L 13 -2.2 L 13 -5.5 L 22 0 L 13 5.5 L 13 2.2 L 6 2.2 Z"
          className="node-connect-arrow"
        />
      </g>

      {handles && (
        <g className={soloSelected ? "node-handles node-handles--selected" : "node-handles"}>
          {RESIZE_HANDLES.map((handle) => {
            const { fx, fy } = handlePosition(handle);
            return (
              <rect
                key={handle}
                x={w * fx - handleSize / 2}
                y={h * fy - handleSize / 2}
                width={handleSize}
                height={handleSize}
                className={`node-handle node-handle--${handle}`}
                onPointerDown={(event) => {
                  event.stopPropagation(); // não é para mover o nó
                  onStartResize(handle, event);
                }}
              />
            );
          })}
        </g>
      )}
    </g>
  );
};

const dataUri = (svg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const Shape = ({ shape, w, h }: { shape: string; w: number; h: number }) => {
  const style = { pointerEvents: "none" } as const;
  if (shape === "ellipse") {
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} className="node-shape" style={style} />;
  }
  if (shape === "diamond") {
    return (
      <polygon
        points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
        className="node-shape"
        style={style}
      />
    );
  }
  if (shape === "umlClass") {
    // Sem `rx`: canto reto é a convenção da caixa de classe — arredondado é o
    // resto das formas, e as duas nunca deveriam se confundir de longe.
    return <rect width={w} height={h} className="node-shape" style={style} />;
  }
  if (shape === "umlPackage") {
    // Aba no canto superior esquerdo + corpo — notação de pacote UML. Dois
    // retângulos ADJACENTES (não sobrepostos: o corpo começa exatamente onde a aba
    // termina), cada um com o mesmo preenchimento/contorno de qualquer forma — a
    // borda inferior da aba e a borda superior do corpo caem na mesma linha, e o
    // efeito visual é um contorno só, sem costura visível. Sem `rx`, mesma razão da
    // classe: notação UML é de canto reto.
    const tabWidth = Math.min(w * 0.45, 64);
    const tabHeight = Math.min(h * 0.3, 22);
    return (
      <g style={style}>
        <rect width={tabWidth} height={tabHeight} className="node-shape" />
        <rect y={tabHeight} width={w} height={h - tabHeight} className="node-shape" />
      </g>
    );
  }
  return <rect width={w} height={h} rx={6} className="node-shape" style={style} />;
};
