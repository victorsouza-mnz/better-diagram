import { AddIconNode } from "../application/AddIconNode.js";
import {
  ExportDocument,
  ImportDocument,
  LoadDiagram,
  SaveDiagram,
} from "../application/documentIO.js";
import {
  AddShapeNode,
  AddTextNode,
  ConnectNodes,
  CycleEdgeStyle,
  CycleShapeStyle,
  CycleTextFormat,
  DeleteSelection,
  MoveNodes,
  ResizeNode,
  SetEdgeStyle,
  SetNodeLabel,
  SetShapeStyle,
  SetTextAlign,
  SetTextFormat,
} from "../application/editing.js";
import { DiagramId } from "../domain/shared/ids.js";
import { SimpleIconsCatalog } from "../infrastructure/icons/SimpleIconsCatalog.js";
import { GenericIconCatalog } from "../infrastructure/icons/GenericIconCatalog.js";
import { UmlIconCatalog } from "../infrastructure/icons/UmlIconCatalog.js";
import { CompositeIconCatalog } from "../infrastructure/icons/CompositeIconCatalog.js";
import { CryptoIdGenerator } from "../infrastructure/id/CryptoIdGenerator.js";
import { IndexedDbDiagramRepository } from "../infrastructure/persistence/IndexedDbDiagramRepository.js";
import { AllowlistSvgSanitizer } from "../infrastructure/security/AllowlistSvgSanitizer.js";
import { WebCryptoContentHasher } from "../infrastructure/security/WebCryptoContentHasher.js";

/**
 * COMPOSITION ROOT — o único lugar do app que conhece implementações concretas.
 *
 * É aqui, e só aqui, que `IndexedDbDiagramRepository` encontra o port que ele
 * implementa. Caso de uso que construísse o próprio adaptador inverteria a seta de
 * dependência sem ninguém perceber, e o teste dele passaria a exigir um browser.
 *
 * Trocar o storage, o sanitizador ou o catálogo é editar este arquivo — nenhum
 * outro.
 */

// Marcas primeiro: é o diferencial declarado do produto (ver docs/overview.md).
// Genéricos completam o que a paleta de marcas não cobre. UML por último: notação
// de diagrama, não infraestrutura — mesmo status de "completa o que falta", outro
// vocabulário visual.
const catalog = new CompositeIconCatalog([
  new SimpleIconsCatalog(),
  new GenericIconCatalog(),
  new UmlIconCatalog(),
]);
const sanitizer = new AllowlistSvgSanitizer();
const hasher = new WebCryptoContentHasher();
const ids = new CryptoIdGenerator();
const repository = new IndexedDbDiagramRepository();

/**
 * O v1 tem UM diagrama. A port já prevê vários (`list()`), mas múltiplos pedem uma
 * tela de gerenciamento que não está specada — e id fixo é trivial de abandonar
 * depois, ao contrário de uma tela mal desenhada.
 */
export const CURRENT_DIAGRAM_ID = DiagramId("principal");

export const useCases = {
  addIconNode: new AddIconNode(catalog, sanitizer, hasher, ids),
  moveNodes: new MoveNodes(),
  resizeNode: new ResizeNode(),
  addShapeNode: new AddShapeNode(ids),
  addTextNode: new AddTextNode(ids),
  setNodeLabel: new SetNodeLabel(),
  setTextAlign: new SetTextAlign(),
  setTextFormat: new SetTextFormat(),
  cycleTextFormat: new CycleTextFormat(),
  setShapeStyle: new SetShapeStyle(),
  cycleShapeStyle: new CycleShapeStyle(),
  connectNodes: new ConnectNodes(ids),
  cycleEdgeStyle: new CycleEdgeStyle(),
  setEdgeStyle: new SetEdgeStyle(),
  deleteSelection: new DeleteSelection(),
  loadDiagram: new LoadDiagram(repository),
  saveDiagram: new SaveDiagram(repository),
  importDocument: new ImportDocument(sanitizer),
  exportDocument: new ExportDocument(),
} as const;

export { catalog };
