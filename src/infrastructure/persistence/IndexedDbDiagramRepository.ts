import type { Diagram } from "../../domain/diagram/Diagram.js";
import { fromDocument, toDocument } from "../../domain/document/codec.js";
import type { DiagramDocument } from "../../domain/document/types.js";
import type { DiagramId } from "../../domain/shared/ids.js";
import { DiagramId as toDiagramId } from "../../domain/shared/ids.js";
import type { DiagramRepository } from "../../application/ports/index.js";

/**
 * Persistência local em IndexedDB.
 *
 * Guarda o DOCUMENTO serializado, não o agregado. Duas razões: o structured clone
 * não preserva classe nenhuma, e gravar o formato versionado significa que ler do
 * IndexedDB passa exatamente pelo mesmo caminho de validação e migração que abrir
 * um arquivo. Um segundo caminho de leitura seria um segundo lugar para o
 * `schemaVersion` ser esquecido.
 *
 * O que está aqui já foi sanitizado quando entrou no documento, então a leitura não
 * re-sanitiza — este storage é nosso, não é entrada de terceiro.
 */

const DB_NAME = "uml";
const DB_VERSION = 1;
const STORE = "diagrams";

interface StoredRow {
  readonly id: string;
  readonly document: DiagramDocument;
}

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB indisponível"));
  });

/** IndexedDB é orientado a eventos; isto envolve uma requisição numa promise. */
const run = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao acessar o IndexedDB"));
  });

export class IndexedDbDiagramRepository implements DiagramRepository {
  private db: Promise<IDBDatabase> | undefined;

  private connection(): Promise<IDBDatabase> {
    // Uma conexão só, reaproveitada: abrir por operação custa caro e, com autosave
    // debounced, seriam várias aberturas por minuto.
    this.db ??= openDatabase();
    return this.db;
  }

  async load(id: DiagramId): Promise<Diagram | undefined> {
    const db = await this.connection();
    const row = await run<StoredRow | undefined>(
      db.transaction(STORE, "readonly").objectStore(STORE).get(id),
    );
    return row ? fromDocument(row.document) : undefined;
  }

  async save(diagram: Diagram): Promise<void> {
    const db = await this.connection();
    const row: StoredRow = { id: diagram.id, document: toDocument(diagram) };
    await run(db.transaction(STORE, "readwrite").objectStore(STORE).put(row));
  }

  async list(): Promise<readonly DiagramId[]> {
    const db = await this.connection();
    const keys = await run(db.transaction(STORE, "readonly").objectStore(STORE).getAllKeys());
    return keys.map((key) => toDiagramId(String(key)));
  }
}
