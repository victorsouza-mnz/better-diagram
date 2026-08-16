import { Diagram } from "../domain/diagram/Diagram.js";
import { fromDocument, parseDocument, stringify } from "../domain/document/codec.js";
import type { DiagramDocument } from "../domain/document/types.js";
import type { DiagramId } from "../domain/shared/ids.js";
import type { DiagramRepository, SvgSanitizer } from "./ports/index.js";

/**
 * Abrir e salvar arquivos `.json`, e a carga do diagrama ao abrir o app.
 */

export class ExportDocument {
  execute(diagram: Diagram): string {
    return stringify(diagram);
  }
}

/**
 * Importar um `.json`.
 *
 * `.json` de outra pessoa é ENTRADA NÃO CONFIÁVEL, igual a um upload. Por isso os
 * assets recebidos passam pelo sanitizador entre o parse e a construção do
 * agregado: assim o invariante "o que está na tabela já está limpo" continua valendo
 * para o documento importado, sem exceção escondida.
 *
 * Quem chama trata a falha SEM substituir o diagrama aberto — perder o trabalho da
 * pessoa porque ela escolheu o arquivo errado seria punição desproporcional.
 */
export class ImportDocument {
  constructor(private readonly sanitizer: SvgSanitizer) { }

  execute(raw: string): Diagram {
    const doc = parseDocument(raw);
    return fromDocument(this.sanitize(doc));
  }

  private sanitize(doc: DiagramDocument): DiagramDocument {
    return {
      ...doc,
      assets: Object.fromEntries(
        Object.entries(doc.assets).map(([id, asset]) => [
          id,
          { ...asset, data: this.sanitizer.sanitize(asset.data) },
        ]),
      ),
    };
  }
}

/**
 * Carrega o diagrama do storage local, ou entrega um vazio.
 *
 * Não achar nada é o caso normal da primeira visita, não erro: o app abre com um
 * diagrama novo, sem diálogo nem pergunta.
 */
export class LoadDiagram {
  constructor(private readonly repository: DiagramRepository) { }

  async execute(id: DiagramId): Promise<Diagram> {
    const found = await this.repository.load(id);
    return found ?? Diagram.empty(id);
  }
}

export class SaveDiagram {
  constructor(private readonly repository: DiagramRepository) { }

  async execute(diagram: Diagram): Promise<void> {
    await this.repository.save(diagram);
  }
}
