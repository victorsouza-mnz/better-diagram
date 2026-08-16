import { useEffect, useRef, useState } from "react";

import type { Diagram } from "../../domain/diagram/Diagram.js";
import { useCases } from "../composition.js";

export type SaveState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "saved" }
  | { readonly status: "error"; readonly message: string };

/** Espera de digitação/arrasto antes de gravar. */
const DEBOUNCE_MS = 500;

/**
 * Autosave.
 *
 * Grava com DEBOUNCE, e não a cada operação: uma sequência rápida de edições vira
 * uma gravação. (Arrastar já é uma operação só — ver `useEditorSession` — mas
 * digitar um rótulo não seria.)
 *
 * O diagrama recém-CARREGADO não é regravado: `persisted` começa apontando para ele,
 * e só muda quando uma gravação nossa conclui. Sem isso, abrir o app escreveria de
 * volta o que acabou de ler, a cada visita.
 *
 * Falha de gravação vira estado visível. Persistência que falha em silêncio é a que
 * custa o trabalho da pessoa — ela só descobre quando reabre e não está lá.
 */
export const useAutosave = (diagram: Diagram, ready: boolean): SaveState => {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const persisted = useRef<Diagram | null>(null);

  useEffect(() => {
    if (!ready) return;

    // Primeira passada depois da carga: o que está na tela é o que está no disco.
    if (persisted.current === null) {
      persisted.current = diagram;
      return;
    }
    // Um undo pode voltar exatamente ao estado já gravado. O documento fica limpo
    // sem passar por gravação nenhuma, então é aqui que o indicador volta para
    // "salvo" — senão ele fica preso em "salvando…" com tudo já no disco.
    if (persisted.current === diagram) {
      setState((current) => (current.status === "saved" ? current : { status: "saved" }));
      return;
    }

    // Marca "salvando" JÁ, e não quando a gravação começa. Durante o debounce existe
    // alteração pendente, e um indicador dizendo "salvo" nesse intervalo mente
    // justamente para quem está decidindo se pode fechar a aba.
    setState({ status: "saving" });

    const timer = setTimeout(() => {
      useCases.saveDiagram
        .execute(diagram)
        .then(() => {
          persisted.current = diagram;
          setState({ status: "saved" });
        })
        .catch((error: unknown) => {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Não foi possível salvar no navegador",
          });
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [diagram, ready]);

  /**
   * Descarga ao sair.
   *
   * O debounce cria uma janela de meio segundo em que a última edição existe só na
   * memória da aba. Fechar, recarregar ou trocar de aba nesse intervalo perdia o que
   * a pessoa acabou de fazer — e ela não tem como saber que existe essa janela.
   *
   * `visibilitychange` é o gatilho confiável: `beforeunload` não dispara em várias
   * situações de mobile, e `pagehide` chega tarde demais em alguns browsers.
   */
  useEffect(() => {
    if (!ready) return;

    const flush = () => {
      if (persisted.current === null || persisted.current === diagram) return;
      const pending = diagram;
      void useCases.saveDiagram.execute(pending).then(() => {
        persisted.current = pending;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [diagram, ready]);

  return state;
};
