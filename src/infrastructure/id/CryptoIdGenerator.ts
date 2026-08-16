import type { IdGenerator } from "../../application/ports/index.js";

/**
 * Ids aleatórios via `crypto.randomUUID`.
 *
 * Geração de id é impura, então é port: o domínio recebe o id pronto. O ganho
 * aparece nos testes, onde um gerador sequencial torna os ids previsíveis sem
 * mockar nada global.
 */
export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}

/** Gerador determinístico para testes: `n1`, `n2`, … */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix = "id") {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}${this.counter}`;
  }
}
