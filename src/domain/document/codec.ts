import { Diagram } from "../diagram/Diagram.js";
import { DiagramNode } from "../diagram/Node.js";
import { Edge } from "../diagram/Edge.js";
import type { Asset } from "../diagram/Asset.js";
import type { NodeContent, ShapeKind } from "../diagram/NodeContent.js";
import { DEFAULT_TEXT_ALIGN, type TextAlign } from "../diagram/TextAlign.js";
import { DEFAULT_TEXT_FORMAT, type TextFormat } from "../diagram/TextFormat.js";
import { rect } from "../shared/geometry.js";
import { AssetId, DiagramId, EdgeId, NodeId } from "../shared/ids.js";
import { DocumentInvalid, UnsupportedSchemaVersion } from "./errors.js";
import {
  SCHEMA_VERSION,
  type AssetDoc,
  type ContentDoc,
  type DiagramDocument,
  type EdgeDoc,
  type NodeDoc,
  type TextAlignDoc,
} from "./types.js";

/**
 * Codec do formato de arquivo.
 *
 * MORA NO DOMÍNIO, e não na infraestrutura, porque o formato É parte da linguagem
 * do produto: `schemaVersion`, migrações e invariantes do documento são conceitos
 * de domínio, especificados na spec. `JSON.parse` é ES puro, não API de plataforma,
 * então isto continua rodando em Node sem DOM — e portanto continua inteiramente
 * testável junto do modelo.
 *
 * O que fica na infraestrutura é a VIAGEM dos bytes: baixar um arquivo, ler do
 * IndexedDB, escolher um `.json` no disco.
 *
 * A leitura tem DOIS PASSOS de propósito:
 *
 *   parseDocument()  bytes  → estrutura validada (ainda não é agregado)
 *   fromDocument()   estrutura → agregado, com invariantes checados
 *
 * O intervalo entre eles é onde a aplicação sanitiza os SVGs recebidos. Fosse um
 * passo só, um documento de terceiro construiria o agregado com asset não
 * sanitizado dentro — e o invariante "o que está na tabela já está limpo" passaria
 * a ter uma exceção não escrita.
 */

// ------------------------------------------------------------------- escrita

export const toDocument = (diagram: Diagram): DiagramDocument => ({
  schemaVersion: SCHEMA_VERSION,
  id: diagram.id,
  assets: Object.fromEntries(
    diagram.assets.map((asset) => [
      asset.id,
      { kind: asset.kind, name: asset.name, source: asset.source, data: asset.data },
    ]),
  ),
  nodes: diagram.nodes.map((node) => ({
    id: node.id,
    rect: { x: node.rect.x, y: node.rect.y, w: node.rect.w, h: node.rect.h },
    content: node.content,
    label: node.label,
    z: node.z,
  })),
  edges: diagram.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    dashed: edge.style.dashed,
    bidirectional: edge.style.bidirectional,
  })),
});

export const stringify = (diagram: Diagram): string =>
  JSON.stringify(toDocument(diagram), null, 2);

// -------------------------------------------------------------------- leitura

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value === "") {
    throw new DocumentInvalid(`${path} precisa ser um texto não vazio`);
  }
  return value;
};

const num = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DocumentInvalid(`${path} precisa ser um número`);
  }
  return value;
};

const SHAPES: readonly string[] = ["rect", "ellipse", "diamond", "umlClass", "umlPackage"];
const HORIZONTAL_ALIGNS: readonly string[] = ["left", "center", "right"];
const VERTICAL_ALIGNS: readonly string[] = ["top", "middle", "bottom"];
const TEXT_FORMATS: readonly string[] = ["plain", "code"];

/**
 * Ausente, ou de um documento salvo antes de o alinhamento existir: cai no padrão
 * (centro/meio) — o mesmo visual de sempre, mesma técnica de `dashed`/`bidirectional`
 * em `parseEdge`. Valor presente mas fora do conjunto válido (documento adulterado
 * ou de uma versão futura com mais opções) também cai no padrão, em vez de rejeitar
 * o documento inteiro por um campo cosmético.
 */
const parseTextAlign = (raw: unknown): TextAlignDoc => {
  const obj = isObject(raw) ? raw : {};
  const horizontal =
    typeof obj["horizontal"] === "string" && HORIZONTAL_ALIGNS.includes(obj["horizontal"])
      ? obj["horizontal"]
      : DEFAULT_TEXT_ALIGN.horizontal;
  const vertical =
    typeof obj["vertical"] === "string" && VERTICAL_ALIGNS.includes(obj["vertical"])
      ? obj["vertical"]
      : DEFAULT_TEXT_ALIGN.vertical;
  return { horizontal, vertical };
};

/** Mesma técnica de `parseTextAlign`: ausente ou inválido cai no padrão. */
const parseTextFormat = (raw: unknown): string =>
  typeof raw === "string" && TEXT_FORMATS.includes(raw) ? raw : DEFAULT_TEXT_FORMAT;

const parseContent = (raw: unknown, path: string): ContentDoc => {
  if (!isObject(raw)) throw new DocumentInvalid(`${path} precisa ser um objeto`);

  switch (raw["kind"]) {
    case "icon":
      return { kind: "icon", assetId: str(raw["assetId"], `${path}.assetId`) };
    case "shape": {
      const shape = str(raw["shape"], `${path}.shape`);
      if (!SHAPES.includes(shape)) {
        throw new DocumentInvalid(`${path}.shape desconhecido: ${shape}`);
      }
      return { kind: "shape", shape };
    }
    case "text":
      return {
        kind: "text",
        align: parseTextAlign(raw["align"]),
        format: parseTextFormat(raw["format"]),
      };
    default:
      throw new DocumentInvalid(`${path}.kind desconhecido: ${String(raw["kind"])}`);
  }
};

const parseNode = (raw: unknown, index: number): NodeDoc => {
  const path = `nodes[${index}]`;
  if (!isObject(raw)) throw new DocumentInvalid(`${path} precisa ser um objeto`);

  const rawRect = raw["rect"];
  if (!isObject(rawRect)) throw new DocumentInvalid(`${path}.rect precisa ser um objeto`);

  return {
    id: str(raw["id"], `${path}.id`),
    rect: {
      x: num(rawRect["x"], `${path}.rect.x`),
      y: num(rawRect["y"], `${path}.rect.y`),
      w: num(rawRect["w"], `${path}.rect.w`),
      h: num(rawRect["h"], `${path}.rect.h`),
    },
    content: parseContent(raw["content"], `${path}.content`),
    label: typeof raw["label"] === "string" ? raw["label"] : "",
    z: typeof raw["z"] === "number" ? raw["z"] : 0,
  };
};

const parseEdge = (raw: unknown, index: number): EdgeDoc => {
  const path = `edges[${index}]`;
  if (!isObject(raw)) throw new DocumentInvalid(`${path} precisa ser um objeto`);

  return {
    id: str(raw["id"], `${path}.id`),
    source: str(raw["source"], `${path}.source`),
    target: str(raw["target"], `${path}.target`),
    label: typeof raw["label"] === "string" ? raw["label"] : "",
    // Ausentes num documento salvo antes de existirem: o padrão é o estilo de
    // sempre, sólida e unidirecional — não uma versão nova de arquivo.
    dashed: typeof raw["dashed"] === "boolean" ? raw["dashed"] : false,
    bidirectional: typeof raw["bidirectional"] === "boolean" ? raw["bidirectional"] : false,
  };
};

const parseAsset = (raw: unknown, id: string): AssetDoc => {
  const path = `assets["${id}"]`;
  if (!isObject(raw)) throw new DocumentInvalid(`${path} precisa ser um objeto`);
  if (raw["kind"] !== "svg") throw new DocumentInvalid(`${path}.kind precisa ser "svg"`);

  return {
    kind: "svg",
    name: typeof raw["name"] === "string" ? raw["name"] : "",
    source: typeof raw["source"] === "string" ? raw["source"] : "",
    data: str(raw["data"], `${path}.data`),
  };
};

/**
 * Passo 1: texto → estrutura validada.
 *
 * A `schemaVersion` é lida ANTES de qualquer outra coisa. Um arquivo de versão
 * futura precisa dar mensagem clara, e não erro de campo faltando — que é o que
 * acontece quando se tenta parsear primeiro e conferir a versão depois.
 */
export const parseDocument = (raw: string): DiagramDocument => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DocumentInvalid("o conteúdo não é JSON válido");
  }

  if (!isObject(parsed)) throw new DocumentInvalid("o conteúdo não é um objeto");

  const version = parsed["schemaVersion"];
  if (typeof version !== "number") {
    throw new DocumentInvalid("falta o campo schemaVersion");
  }
  if (version !== SCHEMA_VERSION) {
    // Quando existir um v2, é aqui que a cadeia de migração entra: versões
    // ANTERIORES passam a ser migradas, e só as futuras seguem recusadas.
    throw new UnsupportedSchemaVersion(version, SCHEMA_VERSION);
  }

  const rawAssets = parsed["assets"];
  if (rawAssets !== undefined && !isObject(rawAssets)) {
    throw new DocumentInvalid("assets precisa ser um objeto");
  }
  const rawNodes = parsed["nodes"];
  const rawEdges = parsed["edges"];
  if (!Array.isArray(rawNodes)) throw new DocumentInvalid("nodes precisa ser uma lista");
  if (rawEdges !== undefined && !Array.isArray(rawEdges)) {
    throw new DocumentInvalid("edges precisa ser uma lista");
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    id: str(parsed["id"], "id"),
    assets: Object.fromEntries(
      Object.entries(rawAssets ?? {}).map(([id, asset]) => [id, parseAsset(asset, id)]),
    ),
    nodes: rawNodes.map(parseNode),
    edges: (rawEdges ?? []).map(parseEdge),
  };
};

/**
 * Passo 2: estrutura → agregado.
 *
 * `Diagram.restore` é quem checa os invariantes (aresta apontando para nó que não
 * existe, ícone sem asset, id duplicado). Documento que os viola é REJEITADO, nunca
 * carregado "quase certo".
 */
export const fromDocument = (doc: DiagramDocument): Diagram => {
  const assets: Asset[] = Object.entries(doc.assets).map(([id, asset]) => ({
    id: AssetId(id),
    kind: asset.kind,
    name: asset.name,
    source: asset.source,
    data: asset.data,
  }));

  const nodes = doc.nodes.map(
    (node) =>
      new DiagramNode(
        NodeId(node.id),
        rect(node.rect.x, node.rect.y, node.rect.w, node.rect.h),
        toContent(node.content),
        node.label,
        node.z,
      ),
  );

  const edges = doc.edges.map(
    (edge) =>
      new Edge(EdgeId(edge.id), NodeId(edge.source), NodeId(edge.target), edge.label, {
        dashed: edge.dashed,
        bidirectional: edge.bidirectional,
      }),
  );

  return Diagram.restore({ id: DiagramId(doc.id), nodes, edges, assets });
};

const toContent = (content: ContentDoc): NodeContent =>
  content.kind === "icon"
    ? { kind: "icon", assetId: AssetId(content.assetId) }
    : content.kind === "shape"
      ? { kind: "shape", shape: content.shape as ShapeKind }
      : {
          kind: "text",
          align: content.align as TextAlign,
          format: content.format as TextFormat,
        };
