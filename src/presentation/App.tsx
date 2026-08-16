import { size as selectionSize } from "../application/Selection.js";
import { DiagramCanvas } from "./canvas/DiagramCanvas.js";
import { LabelEditor } from "./canvas/LabelEditor.js";
import { IconPalette } from "./palette/IconPalette.js";
import { PropertiesPanel } from "./panel/PropertiesPanel.js";
import { Toolbar } from "./Toolbar.js";
import { useEditorSession } from "./session/useEditorSession.js";
import type { SaveState } from "./session/useAutosave.js";

export const App = () => {
  const session = useEditorSession();
  const { diagram, selection, saveState, notice, editing, actions } = session;

  return (
    <div className="app">
      <IconPalette session={session} />

      <main className="workspace">
        <header className="toolbar">
          <Toolbar session={session} />
          <span className="toolbar-divider" />
          <button onClick={() => void actions.importFile()}>Importar</button>
          <button onClick={actions.exportFile}>Exportar</button>
          <SaveIndicator state={saveState} />
        </header>

        <div className="canvas-area">
          <DiagramCanvas session={session} />

          {/* A `key` faz o editor remontar ao trocar de nó: sem ela, o texto do nó
              anterior ficaria no campo. */}
          {editing && <LabelEditor key={editing} session={session} />}

          {diagram.nodes.length === 0 && (
            <p className="empty-state">
              Arraste um logo da paleta, ou aperte <kbd>R</kbd> para desenhar uma caixa.
            </p>
          )}
        </div>

        {notice && (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button onClick={actions.dismissNotice} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}

        <footer className="status">
          <span>{diagram.nodes.length} nós</span>
          <span>{diagram.edges.length} arestas</span>
          <span>{diagram.assets.length} logos no documento</span>
          <span>{selectionSize(selection)} selecionados</span>
          <span>{Math.round(session.viewport.scale * 100)}%</span>
        </footer>
      </main>

      <PropertiesPanel session={session} />
    </div>
  );
};

/**
 * Estado do autosave.
 *
 * Falha de gravação é o único caso que merece destaque: é quando a pessoa está
 * prestes a perder trabalho sem saber. "Salvo" fica discreto de propósito — avisar
 * o tempo todo que deu certo treina a pessoa a ignorar o indicador, e aí o aviso
 * que importa passa junto.
 */
const SaveIndicator = ({ state }: { state: SaveState }) => {
  if (state.status === "idle") return null;
  if (state.status === "saving") return <span className="save-state">salvando…</span>;
  if (state.status === "saved") return <span className="save-state">salvo</span>;

  return (
    <span className="save-state save-state--error" role="alert" title={state.message}>
      não foi possível salvar
    </span>
  );
};
