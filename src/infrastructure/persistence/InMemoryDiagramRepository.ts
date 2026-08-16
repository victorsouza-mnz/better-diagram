import type { Diagram } from "../../domain/diagram/Diagram.js";
import type { DiagramRepository } from "../../application/ports/index.js";
import type { DiagramId } from "../../domain/shared/ids.js";

/**
 * Repositório em memória.
 *
 * Serve aos testes de caso de uso e ao desenvolvimento antes do adaptador de
 * IndexedDB existir. Que a aplicação inteira funcione com ele é a prova de que a
 * regra da dependência está de pé: nada acima da infraestrutura sabe onde o
 * documento é gravado.
 */
export class InMemoryDiagramRepository implements DiagramRepository {
  private readonly store = new Map<DiagramId, Diagram>();

  async load(id: DiagramId): Promise<Diagram | undefined> {
    return this.store.get(id);
  }

  async save(diagram: Diagram): Promise<void> {
    this.store.set(diagram.id, diagram);
  }

  async list(): Promise<readonly DiagramId[]> {
    return [...this.store.keys()];
  }
}
