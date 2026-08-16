/**
 * Preferência de tema (claro/escuro), guardada em `localStorage`.
 *
 * É preferência de UI, não estado do diagrama — por isso mora fora de
 * `IndexedDbDiagramRepository` e nunca passa por `application/`. `localStorage` é
 * síncrono, pequeno e só string, exatamente o perfil que `docs/architecture.md`
 * reserva para isto (`Persistência`).
 *
 * Tolerante a falha de propósito: modo privado, quota esgotada ou qualquer outro
 * bloqueio de `localStorage` não pode quebrar a troca de tema — só faz a escolha
 * não sobreviver à próxima recarga.
 */

export type Theme = "light" | "dark";

const KEY = "uml.theme";

export const readStoredTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

export const writeStoredTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Sem persistência, mas a troca já aconteceu na sessão atual — ver doc do módulo.
  }
};
