import { DomainError } from "../diagram/errors.js";

/**
 * Erros de leitura de arquivo.
 *
 * Separados dos erros de invariante porque a camada de cima os trata de forma
 * diferente: violar invariante vindo de um caso de uso é bug nosso, enquanto
 * arquivo malformado é entrada do usuário e vira mensagem na tela.
 *
 * As mensagens são escritas para serem lidas por quem abriu o arquivo, não por
 * quem depura o parser.
 */

export class DocumentInvalid extends DomainError {
  constructor(detail: string) {
    super(`Arquivo de diagrama inválido: ${detail}`);
  }
}

export class UnsupportedSchemaVersion extends DomainError {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(
      found > supported
        ? `Este arquivo foi criado numa versão mais nova do app (formato ${found}; esta versão lê até ${supported}). Atualize para abri-lo.`
        : `Formato de arquivo não suportado: ${found}.`,
    );
  }
}
