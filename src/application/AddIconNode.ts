import type { Diagram } from "../domain/diagram/Diagram.js";
import { DiagramNode } from "../domain/diagram/Node.js";
import { iconContent } from "../domain/diagram/NodeContent.js";
import type { Asset } from "../domain/diagram/Asset.js";
import { rect, type Point } from "../domain/shared/geometry.js";
import { AssetId, NodeId } from "../domain/shared/ids.js";
import type {
  ContentHasher,
  IconCatalog,
  IdGenerator,
  SvgSanitizer,
} from "./ports/index.js";

/** Tamanho padrão de um logo recém-solto no canvas. */
const DEFAULT_ICON_SIZE = 64;

/**
 * Arrastar um logo da paleta para o canvas.
 *
 * O ponto da spec que este caso de uso materializa: isso cria UM nó, num gesto.
 * Não existe "criar caixa e depois associar ícone" — ícone é uma variante de
 * conteúdo do nó, não um enfeite pendurado numa forma.
 *
 * Repare na divisão de trabalho: sanitizar e hashear acontecem AQUI, na borda,
 * porque dependem de DOM e WebCrypto. O agregado recebe um `Asset` já limpo e já
 * identificado, e continua puro.
 */
export class AddIconNode {
  constructor(
    private readonly catalog: IconCatalog,
    private readonly sanitizer: SvgSanitizer,
    private readonly hasher: ContentHasher,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: {
    diagram: Diagram;
    slug: string;
    at: Point;
  }): Promise<Diagram> {
    const icon = this.catalog.bySlug(input.slug);
    if (!icon) throw new Error(`Ícone não encontrado no catálogo: ${input.slug}`);

    // O catálogo é embutido no build e portanto confiável, mas passa pelo
    // sanitizador do mesmo jeito: um caminho de entrada que dispensa a limpeza é o
    // caminho que alguém reaproveita depois para conteúdo de fora.
    const data = this.sanitizer.sanitize(icon.svg);
    const asset: Asset = {
      id: AssetId(await this.hasher.hash(data)),
      kind: "svg",
      name: icon.name,
      source: `catalog:${icon.slug}`,
      data,
    };

    const node = new DiagramNode(
      NodeId(this.ids.next()),
      // O ponto de soltar vira o CENTRO do nó, não o canto: é onde o cursor está,
      // e é o que a pessoa acha que está posicionando.
      rect(
        input.at.x - DEFAULT_ICON_SIZE / 2,
        input.at.y - DEFAULT_ICON_SIZE / 2,
        DEFAULT_ICON_SIZE,
        DEFAULT_ICON_SIZE,
      ),
      iconContent(asset.id),
      icon.name,
    );

    // Se o asset já existir na tabela (mesmo hash), `addNode` mantém a entrada
    // única — a deduplicação é consequência do id ser o conteúdo.
    return input.diagram.addNode(node, asset);
  }
}
