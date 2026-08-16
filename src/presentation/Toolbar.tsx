import type { EditorSession } from "./session/useEditorSession.js";
import type { Tool } from "./session/useEditorSession.js";

/**
 * Ferramentas do editor.
 *
 * O atalho fica visível no `title` de cada botão: um editor de canvas se usa pelo
 * teclado depois da primeira semana, e atalho que não se descobre não existe.
 */
const TOOLS: readonly { tool: Tool; label: string; key: string; glyph: string }[] = [
  { tool: "select", label: "Selecionar", key: "V", glyph: "▲" },
  { tool: "rect", label: "Retângulo", key: "R", glyph: "▭" },
  { tool: "ellipse", label: "Elipse", key: "O", glyph: "◯" },
  { tool: "diamond", label: "Losango", key: "D", glyph: "◇" },
  { tool: "text", label: "Texto", key: "T", glyph: "T" },
  { tool: "umlClass", label: "Classe UML", key: "C", glyph: "▤" },
];

export const Toolbar = ({ session }: { session: EditorSession }) => (
  <div className="tools" role="toolbar" aria-label="Ferramentas">
    {TOOLS.map(({ tool, label, key, glyph }) => (
      <button
        key={tool}
        className={session.tool === tool ? "tool tool--active" : "tool"}
        title={`${label} (${key})`}
        aria-pressed={session.tool === tool}
        onClick={() => session.actions.setTool(tool)}
      >
        <span aria-hidden>{glyph}</span>
        <span className="tool-key">{key}</span>
      </button>
    ))}
  </div>
);
