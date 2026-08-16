/**
 * O FORMATO DE ARQUIVO do produto — a forma serializada de um diagrama.
 *
 * Estes tipos descrevem bytes, não o modelo: são objetos planos, sem comportamento,
 * espelhando exatamente o que vai para o `.json` e para o IndexedDB. O modelo rico
 * (`Diagram`, `DiagramNode`) fica do outro lado do codec.
 *
 * Separar os dois é o que permite mudar o modelo sem quebrar arquivos salvos, e
 * versionar o arquivo sem arrastar o modelo junto. Enquanto forem o mesmo objeto,
 * todo refactor de entidade é uma migração de dados não declarada.
 *
 * O `id` do asset é a CHAVE do mapa, e não um campo dentro do valor: dois lugares
 * guardando a mesma identidade é um lugar para eles discordarem.
 *
 * CAMPO NOVO NEM SEMPRE SOBE `SCHEMA_VERSION`. `EdgeDoc.dashed`/`.bidirectional` e
 * `ContentDoc.align` (na variante `text`) são exemplo: têm um valor padrão seguro
 * (`false`/`false`; centro/meio, o alinhamento de sempre), e um documento v1 salvo
 * ANTES de eles existirem continua abrindo — o codec preenche o padrão na leitura,
 * mesma técnica já usada em `label`/`z` de `NodeDoc`. Reservar a versão para mudança
 * que QUEBRA leitura antiga (campo obrigatório novo, campo que muda de forma,
 * semântica que muda) é o que mantém a migração um evento raro e sério, em vez de
 * disparar a cada campo opcional.
 */

export const SCHEMA_VERSION = 1;

export interface RectDoc {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface TextAlignDoc {
  readonly horizontal: string;
  readonly vertical: string;
}

export type ContentDoc =
  | { readonly kind: "icon"; readonly assetId: string }
  | { readonly kind: "shape"; readonly shape: string }
  | { readonly kind: "text"; readonly align: TextAlignDoc };

export interface NodeDoc {
  readonly id: string;
  readonly rect: RectDoc;
  readonly content: ContentDoc;
  readonly label: string;
  readonly z: number;
}

export interface EdgeDoc {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly dashed: boolean;
  readonly bidirectional: boolean;
}

export interface AssetDoc {
  readonly kind: "svg";
  readonly name: string;
  readonly source: string;
  /** Markup SVG já sanitizado — ver a regra de sanitização na spec de assets. */
  readonly data: string;
}

export interface DiagramDocument {
  readonly schemaVersion: number;
  readonly id: string;
  readonly assets: Readonly<Record<string, AssetDoc>>;
  readonly nodes: readonly NodeDoc[];
  readonly edges: readonly EdgeDoc[];
}
