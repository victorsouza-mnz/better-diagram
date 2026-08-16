import type { ContentHasher } from "../../application/ports/index.js";

/**
 * Hash de conteúdo com WebCrypto (SHA-256).
 *
 * Mora na infraestrutura porque `crypto.subtle` é API de plataforma e é assíncrona.
 * O domínio recebe o `AssetId` já pronto — é o que permite os testes de domínio
 * rodarem em Node puro.
 */
export class WebCryptoContentHasher implements ContentHasher {
  async hash(content: string): Promise<string> {
    const bytes = new TextEncoder().encode(content);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hex = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Prefixo explícito: se um dia o algoritmo mudar, ids antigos continuam
    // legíveis e distinguíveis em vez de virarem hashes ambíguos.
    return `sha256-${hex}`;
  }
}
