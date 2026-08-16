/**
 * A viagem dos bytes entre o app e o disco do usuário.
 *
 * O formato é do domínio (`domain/document/codec.ts`); o que está aqui é só o
 * transporte — baixar e escolher arquivo, que são APIs de plataforma.
 */

/** Dispara o download de um `.json` com o conteúdo dado. */
export const downloadJson = (filename: string, content: string): void => {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  anchor.click();

  // Sem revogar, o Blob fica na memória até a aba fechar.
  URL.revokeObjectURL(url);
};

/**
 * Abre o seletor de arquivos e devolve o conteúdo do escolhido.
 *
 * Resolve `undefined` quando a pessoa cancela — cancelar não é erro, e tratar como
 * erro faria o app mostrar um aviso para quem simplesmente mudou de ideia.
 */
export const pickJsonFile = (): Promise<string | undefined> =>
  new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(undefined);
        return;
      }
      file
        .text()
        .then(resolve)
        .catch(() => reject(new Error("Não foi possível ler o arquivo")));
    };

    // O evento `cancel` não é disparado por todos os browsers; quando não vier, a
    // promise simplesmente não resolve e nada acontece na tela — que é o
    // comportamento certo para um cancelamento.
    input.oncancel = () => resolve(undefined);
    input.click();
  });
