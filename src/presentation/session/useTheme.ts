import { useCallback, useEffect, useState } from "react";

import {
  readStoredTheme,
  writeStoredTheme,
  type Theme,
} from "../../infrastructure/persistence/ThemePreference.js";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)");

/**
 * Tema claro/escuro (`ui/tema-claro-escuro.md`).
 *
 * O CSS já segue `prefers-color-scheme` sozinho — este hook não desenha nada, só
 * decide se há uma ESCOLHA EXPLÍCITA (armazenada) que deve sobrepor o sistema
 * operacional, e mantém o atributo `data-theme` no `<html>` sincronizado com ela.
 * Sem escolha (`explicit === null`), não toca no atributo: o CSS resolve pelo
 * sistema, exatamente como antes deste hook existir.
 *
 * Índice de `main.tsx`/`index.html`: o script inline no `<head>` já aplica a
 * escolha salva antes do primeiro paint (evita o flash do tema errado); este hook
 * é quem mantém isso sincronizado depois, e quem grava uma escolha nova ao clicar.
 */
export const useTheme = () => {
  const [explicit, setExplicit] = useState<Theme | null>(() => readStoredTheme());
  // Só usada quando não há escolha explícita: o BOTÃO precisa saber que ícone
  // mostrar, mesmo que o próprio CSS já siga o sistema sem ajuda de JS nenhuma.
  const [system, setSystem] = useState<Theme>(() => (prefersDark().matches ? "dark" : "light"));

  useEffect(() => {
    const media = prefersDark();
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (explicit) document.documentElement.setAttribute("data-theme", explicit);
    else document.documentElement.removeAttribute("data-theme");
  }, [explicit]);

  const theme = explicit ?? system;

  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setExplicit(next);
    writeStoredTheme(next);
  }, [theme]);

  return { theme, toggle };
};
