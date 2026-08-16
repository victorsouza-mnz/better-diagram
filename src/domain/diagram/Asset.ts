import type { AssetId } from "../shared/ids.js";

/**
 * Um logo guardado dentro do documento.
 *
 * `id` é o HASH DO CONTEÚDO do SVG já sanitizado. Duas consequências que valem a
 * escolha: o mesmo logo inserido 20 vezes ocupa uma entrada só, e a deduplicação
 * continua funcionando ao importar ou mesclar documentos de origens diferentes,
 * mesmo com versões diferentes do catálogo.
 *
 * `name` e `source` são metadado de UI — NÃO entram na identidade. O mesmo desenho
 * vindo do catálogo e de um upload é o mesmo asset.
 *
 * O hash é calculado fora do domínio (port `ContentHasher`, WebCrypto). O `data`
 * que chega aqui já passou pelo `SvgSanitizer`: o invariante é que o que está na
 * tabela já está limpo.
 */
export interface Asset {
  readonly id: AssetId;
  readonly kind: "svg";
  readonly name: string;
  /** Procedência, ex.: `catalog:simple-icons/postgresql` ou `upload`. */
  readonly source: string;
  /** Markup SVG já sanitizado. */
  readonly data: string;
}
