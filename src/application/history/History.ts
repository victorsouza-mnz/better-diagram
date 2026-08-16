import type { Diagram } from "../../domain/diagram/Diagram.js";
import { EMPTY_SELECTION, type Selection } from "../Selection.js";

/**
 * Histórico de desfazer/refazer.
 *
 * É de APLICAÇÃO, não de domínio: orquestra estados do agregado sem acrescentar
 * regra nenhuma a ele. Não conhece React — é uma classe imutável, testável em Node
 * puro.
 *
 * SNAPSHOT, e não comando inverso. O agregado já é imutável, então guardar o estado
 * anterior é guardar um ponteiro: o snapshot não copia nada. O que uma operação
 * copia são os três `Map` do agregado, e eles copiam *referências* — os `Asset`, que
 * são a parte pesada (o SVG é uma string de vários KB), ficam compartilhados entre
 * todas as entradas.
 *
 * Comando inverso economizaria uns poucos KB por entrada e cobraria uma inversa
 * correta para cada operação nova, para sempre. Uma inversa errada corrompe o
 * documento de um jeito que só aparece depois de dois undos — o pior tipo de bug
 * para reproduzir.
 */

export interface HistoryEntry {
  readonly diagram: Diagram;
  /** A seleção que existia quando este estado era o atual. */
  readonly selection: Selection;
  readonly label: string;
}

export const DEFAULT_LIMIT = 100;

/**
 * Constrói uma entrada descartando o que estiver selecionado e não existir no
 * diagrama — nós e arestas.
 *
 * Toda entrada nasce por aqui, então "a seleção sempre aponta para o que existe"
 * vale por construção, e não por cuidado de quem chama.
 */
const entry = (diagram: Diagram, selection: Selection, label: string): HistoryEntry => ({
  diagram,
  selection: {
    nodes: new Set([...selection.nodes].filter((id) => diagram.node(id) !== undefined)),
    edges: new Set([...selection.edges].filter((id) => diagram.edge(id) !== undefined)),
  },
  label,
});

export class History {
  private constructor(
    private readonly past: readonly HistoryEntry[],
    readonly present: HistoryEntry,
    private readonly future: readonly HistoryEntry[],
    private readonly limit: number,
  ) {}

  /**
   * Começa um histórico com este diagrama como base.
   *
   * Usado na carga inicial: o que veio do storage é o estado zero, sem nada para
   * desfazer. Não há "desfazer a abertura do app".
   */
  static of(diagram: Diagram, limit: number = DEFAULT_LIMIT): History {
    return new History([], entry(diagram, EMPTY_SELECTION, "Início"), [], limit);
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Profundidade atual — usado nos testes e num futuro painel de histórico. */
  get depth(): number {
    return this.past.length;
  }

  /**
   * Registra uma mudança de documento.
   *
   * Descarta o refazer pendente: editar depois de desfazer abandona o caminho que
   * fora desfeito, como em qualquer editor.
   */
  commit(diagram: Diagram, selection: Selection, label: string): History {
    const past = [...this.past, this.present];

    // Estourou o limite: a entrada mais antiga sai. `slice` mantém a ordem, então o
    // refazer continua consistente.
    const trimmed = past.length > this.limit ? past.slice(past.length - this.limit) : past;

    return new History(trimmed, entry(diagram, selection, label), [], this.limit);
  }

  /**
   * Troca a seleção do estado ATUAL sem criar entrada.
   *
   * Selecionar não é mudança de documento e não deve ser desfeito. Mas a seleção
   * precisa ficar registrada na entrada, porque é ela que volta quando alguém
   * desfaz a operação seguinte: apagar três nós e desfazer devolve os três já
   * selecionados, em vez de obrigar a pessoa a caçar o que reapareceu.
   */
  withSelection(selection: Selection): History {
    return new History(
      this.past,
      entry(this.present.diagram, selection, this.present.label),
      this.future,
      this.limit,
    );
  }

  undo(): History {
    const previous = this.past[this.past.length - 1];
    if (!previous) return this;

    return new History(
      this.past.slice(0, -1),
      previous,
      [this.present, ...this.future],
      this.limit,
    );
  }

  redo(): History {
    const [next, ...rest] = this.future;
    if (!next) return this;

    return new History([...this.past, this.present], next, rest, this.limit);
  }
}
