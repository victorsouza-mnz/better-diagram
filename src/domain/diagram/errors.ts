/**
 * Erros de domínio.
 *
 * São tipados porque a camada de cima decide o que fazer com cada um: violar
 * invariante ao abrir um arquivo vira mensagem para o usuário; a mesma violação
 * vinda de um caso de uso é bug. Um `Error` genérico apagaria essa diferença.
 */
export class DomainError extends Error {}

export class NodeNotFound extends DomainError {
  constructor(id: string) {
    super(`Nó não encontrado: ${id}`);
  }
}

export class EdgeNotFound extends DomainError {
  constructor(id: string) {
    super(`Aresta não encontrada: ${id}`);
  }
}

export class AssetNotFound extends DomainError {
  constructor(id: string) {
    super(`Asset não encontrado no documento: ${id}`);
  }
}

export class DuplicateId extends DomainError {
  constructor(id: string) {
    super(`Id já existe no documento: ${id}`);
  }
}

export class SelfLoopNotAllowed extends DomainError {
  constructor(id: string) {
    super(`Aresta não pode ligar um nó a ele mesmo: ${id}`);
  }
}

export class NotATextNode extends DomainError {
  constructor(id: string) {
    super(`Nó não é de texto, não tem alinhamento: ${id}`);
  }
}
