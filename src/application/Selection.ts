import type { EdgeId, NodeId } from "../domain/shared/ids.js";

/**
 * O que está selecionado no editor.
 *
 * Nós e arestas num objeto só, e não em dois estados separados: seleção é UM
 * conceito, e `Delete` age sobre os dois de uma vez. Duas variáveis paralelas
 * seriam duas chances de esquecer uma delas — e a esquecida seria sempre a de
 * arestas, que é a mais nova.
 *
 * É estado de sessão: não entra no documento. Mas cada entrada do histórico guarda
 * a sua, para desfazer devolver o que estava selecionado naquele estado.
 */
export interface Selection {
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlySet<EdgeId>;
}

export const EMPTY_SELECTION: Selection = { nodes: new Set(), edges: new Set() };

export const isEmpty = (selection: Selection): boolean =>
  selection.nodes.size === 0 && selection.edges.size === 0;

export const size = (selection: Selection): number =>
  selection.nodes.size + selection.edges.size;

export const onlyNodes = (nodes: Iterable<NodeId>): Selection => ({
  nodes: new Set(nodes),
  edges: new Set(),
});

export const onlyEdge = (edge: EdgeId): Selection => ({
  nodes: new Set(),
  edges: new Set([edge]),
});

/** Nós e arestas de uma vez — o que uma seleção retangular produz. */
export const of = (nodes: Iterable<NodeId>, edges: Iterable<EdgeId>): Selection => ({
  nodes: new Set(nodes),
  edges: new Set(edges),
});

/**
 * União de duas seleções — o que `Shift`+arrasto faz: soma ao que já estava
 * selecionado, em vez de substituir.
 */
export const union = (a: Selection, b: Selection): Selection => ({
  nodes: new Set([...a.nodes, ...b.nodes]),
  edges: new Set([...a.edges, ...b.edges]),
});

const toggled = <T>(set: ReadonlySet<T>, value: T): Set<T> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

export const toggleNode = (selection: Selection, node: NodeId): Selection => ({
  ...selection,
  nodes: toggled(selection.nodes, node),
});

export const withNode = (selection: Selection, node: NodeId): Selection => ({
  ...selection,
  nodes: new Set(selection.nodes).add(node),
});

export const withoutNode = (selection: Selection, node: NodeId): Selection => {
  const nodes = new Set(selection.nodes);
  nodes.delete(node);
  return { ...selection, nodes };
};

export const toggleEdge = (selection: Selection, edge: EdgeId): Selection => ({
  ...selection,
  edges: toggled(selection.edges, edge),
});
