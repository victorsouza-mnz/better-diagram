# Spec: Tema claro/escuro

**Domínio:** ui  
**Status:** ready

## Objetivo

Deixar a pessoa escolher entre tema claro e escuro por um botão, além do app já
seguir o sistema operacional sozinho.

## Não-objetivos

- **Terceiro estado "seguir o sistema" com um jeito de voltar a ele.** A escolha é
  binária — claro ou escuro. Ver "Questões em aberto".
- **Paleta customizável.** Só os dois temas já existentes no CSS. Editor de cores é
  design system maior, outra spec.
- **Tema por documento.** É preferência de UI, a mesma em qualquer diagrama aberto.

## Contexto

O CSS já tem os dois temas como tokens (`--bg`, `--surface`, `--text`, …) em `:root`,
com um `@media (prefers-color-scheme: dark)` reescrevendo os mesmos tokens. Isso já
funciona hoje, mas só reage ao sistema operacional — não existe como escolher
manualmente, nem como fixar uma escolha que sobreviva a uma recarga.

## Comportamento esperado

- Sem nenhuma escolha feita, o tema é o do sistema operacional — exatamente o
  comportamento de hoje, sem mudança.
- Um botão na barra superior alterna entre claro e escuro. O ícone mostra o tema
  ATUAL (☀ quando claro, ☾ quando escuro), e o `title` diz o que o clique faz.
- A escolha feita no botão **sobrepõe** o sistema operacional — inclusive se o
  sistema mudar depois (virar a noite, por exemplo), o app não muda sozinho.
- A escolha persiste entre sessões: fechar e reabrir o navegador mantém o mesmo
  tema.

## Fluxo do usuário

1. Abre o app pela primeira vez: tema é o do sistema operacional.
2. Clica no botão de tema: a interface inteira troca na hora, sem recarregar.
3. Fecha a aba, abre de novo: o tema escolhido continua.
4. Alternativo: armazenamento local bloqueado (modo privado, por exemplo) — a troca
   ainda funciona na sessão atual, só não sobrevive à recarga.

## Regras de negócio

- **Escolha explícita sempre vence o sistema operacional**, e continua valendo
  mesmo que o sistema mude depois de escolhida.
- **É preferência de UI, não estado do diagrama.** Nunca entra no JSON exportado,
  nunca passa por caso de uso nem por `History` — trocar de tema não é uma ação
  desfazível.
- Falha ao gravar em `localStorage` não impede a troca de tema **nesta sessão** —
  só significa que a próxima recarga volta ao sistema operacional.

## Estados de UI

- Sem escolha: segue o sistema operacional.
- Claro: botão mostra ☀, título oferece trocar para escuro.
- Escuro: botão mostra ☾, título oferece trocar para claro.
- Erro: não se aplica — não há como a troca falhar de um jeito visível.

## Modelagem de domínio

Nenhuma. Tema é preferência de UI pura — não é entidade, não é VO, não toca o
agregado `Diagram` nem passa por caso de uso.

## Impacto no documento

- Campos: nenhum.
- `schemaVersion`: não sobe — tema nunca esteve, e continua não estando, no
  documento.

## Impacto por camada

- `domain/`: nada.
- `application/`: nada — não é caso de uso, não muda o diagrama.
- `infrastructure/`: `infrastructure/persistence/ThemePreference.ts` — leitura e
  escrita da escolha em `localStorage`, tolerante a falha (nunca lança).
- `presentation/`: hook `session/useTheme.ts` (resolve tema atual, expõe `toggle`),
  botão no cabeçalho (`App.tsx`), tokens `:root[data-theme="light"]` /
  `:root[data-theme="dark"]` em `styles.css`, e um script inline em `index.html`
  que aplica a escolha salva ANTES do primeiro paint — sem ele, a página pisca no
  tema do sistema por um instante antes de trocar para o escolhido.

## Restrições de implementação (guardrails)

- **Tema nunca passa por `useCases` nem por `History`.** Não é uma mudança no
  diagrama, e tratá-lo como caso de uso criaria uma entrada de undo para "troquei
  de tema", o que não faz sentido nenhum.
- **A prioridade "escolha explícita vence o sistema" é a especificidade do
  seletor CSS** (`:root[data-theme="dark"]` bate `:root` de dentro do
  `@media (prefers-color-scheme: dark)`, goste ou não da ordem no arquivo) — não
  depende de qual bloco vem primeiro no arquivo. Não inverter a ordem das regras
  achando que isso muda a prioridade; a prioridade já está garantida pela
  especificidade.
- `localStorage` é só uma chave pequena (`"light"` ou `"dark"`) — qualquer outro
  valor lido é tratado como "sem escolha", nunca lança erro.

## Critérios de aceite

- [x] Sem nunca ter clicado no botão, o tema segue `prefers-color-scheme`.
- [x] Clicar no botão alterna o tema imediatamente, sem recarregar.
- [x] O tema escolhido sobrevive a uma recarga da página.
- [x] Com uma escolha explícita já feita, mudar a preferência do sistema
      operacional não muda o tema do app.
- [x] Ícone e título do botão refletem o tema atual.
- [x] O `.json` exportado não tem nenhum campo de tema.

## Questões em aberto

- [ ] Terceiro estado "seguir o sistema", com um jeito de voltar a ele depois de
      uma escolha explícita — só se pedirem; hoje a escolha é binária e permanente
      até o próximo clique.
