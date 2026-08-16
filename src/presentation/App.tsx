import { size as selectionSize } from "../application/Selection.js";
import { DiagramCanvas } from "./canvas/DiagramCanvas.js";
import { LabelEditor } from "./canvas/LabelEditor.js";
import { Palette } from "./palette/Palette.js";
import { PropertiesPanel } from "./panel/PropertiesPanel.js";
import { Toolbar } from "./Toolbar.js";
import { useEditorSession } from "./session/useEditorSession.js";
import { useTheme } from "./session/useTheme.js";
import type { SaveState } from "./session/useAutosave.js";
import type { Theme } from "../infrastructure/persistence/ThemePreference.js";

export const App = () => {
  const session = useEditorSession();
  const { diagram, selection, saveState, notice, editing, actions } = session;
  const theme = useTheme();

  return (
    <div className="app">
      <Palette session={session} />

      <main className="workspace">
        <header className="toolbar">
          <Toolbar session={session} />
          <span className="toolbar-divider" />
          <button onClick={() => void actions.importFile()}>Importar</button>
          <button onClick={actions.exportFile}>Exportar</button>
          {/* Grupo à direita num `div` próprio (não só o `margin-left: auto` do
              `.save-state`): o indicador de salvamento some (`display: none`, via
              `return null`) no estado ocioso, e sem um dono fixo da margem o botão
              de tema pularia de lugar toda vez que ele aparece e some. */}
          <div className="toolbar-trailing">
            <SaveIndicator state={saveState} />
            <ThemeToggle theme={theme.theme} onToggle={theme.toggle} />
          </div>
        </header>

        <div className="canvas-area">
          <DiagramCanvas session={session} />

          {/* A `key` faz o editor remontar ao trocar de nó: sem ela, o texto do nó
              anterior ficaria no campo. */}
          {editing && <LabelEditor key={editing} session={session} />}

          {diagram.nodes.length === 0 && (
            <p className="empty-state">
              Arraste um item da paleta, ou aperte <kbd>R</kbd> para desenhar uma caixa.
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

/**
 * Botão de tema (`ui/tema-claro-escuro.md`). O ícone mostra o tema ATUAL — ☀ quando
 * claro, ☾ quando escuro —, e o `title` diz o que o clique faz, a mesma convenção de
 * atalho-no-`title` do resto da barra (`Toolbar.tsx`).
 */
const ThemeToggle = ({ theme, onToggle }: { theme: Theme; onToggle: () => void }) => (
  <button
    className="theme-toggle"
    onClick={onToggle}
    title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
    aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
  >
    <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
  </button>
);
