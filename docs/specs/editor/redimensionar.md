# Spec: Redimensionar por alças

**Domínio:** editor  
**Status:** ready

## Objetivo

Mudar o tamanho de um elemento arrastando alças na sua borda. O caso de uso e a regra
de proporção já existem e estão testados desde o começo — falta alcançá-los pela
interface.

## Não-objetivos

- **Redimensionar vários de uma vez.** Escalar um conjunto levanta perguntas próprias
  (o rótulo escala junto? o espaçamento entre eles?) que merecem a sua própria spec.
  Com mais de um selecionado, não aparecem alças.
- **Rotacionar.**
- **Espelhar** arrastando uma alça para além do lado oposto. A alça encosta no
  tamanho mínimo e para.

## Contexto

`ResizeNode` e `DiagramNode.resizedTo` existem e são testados, incluindo a regra de
que **ícone preserva a proporção**. Esta entrega é quase só apresentação.

## Comportamento esperado

- Passar o ponteiro sobre QUALQUER nó — forma, ícone ou texto, selecionado ou não —
  revela oito alças: quatro cantos e quatro meios de lado.
- Quando o nó é a **seleção única** (nada mais selecionado junto), as alças
  continuam visíveis mesmo sem o ponteiro em cima — não somem assim que o cursor
  sai depois de um clique de seleção.
- Numa seleção múltipla, nenhum nó tem alça visível sem hover — mas passar o mouse
  sobre um deles, mesmo sem selecioná-lo sozinho, mostra as dele.
- Arrastar uma alça move aquele lado ou canto; o lado oposto fica parado — inclusive
  no nó de ícone, mesmo quando a alça arrastada é lateral.
- Nó de ícone mantém a proporção em qualquer alça, canto ou lado.
- Nó de **texto** redimensiona livre em largura E altura, como uma forma — com um
  piso a mais: a altura nunca fica menor que as linhas que o rótulo ocupa na largura
  nova, recalculado ao vivo durante o próprio arrasto (ver `formas-e-texto.md`). Além
  desse piso, esticar é livre — é o espaço que o alinhamento vertical usa (spec
  [`painel-propriedades.md`](../ui/painel-propriedades.md)).
- A prévia durante o arrasto já mostra o tamanho final — nunca uma caixa livre (ou,
  no texto, uma altura abaixo do piso do conteúdo) que "salta" para o formato certo
  só ao soltar.
- O elemento nunca fica menor que o mínimo, e nunca vira do avesso.

## Fluxo do usuário

1. Passa o ponteiro sobre uma caixa: aparecem as oito alças, mesmo sem clicar nela.
2. Arrasta a alça do canto inferior direito: a caixa acompanha, o canto superior
   esquerdo fica onde está.
3. Solta: o novo tamanho é gravado, como uma entrada de histórico.
4. Alternativos:
   - `Esc` durante o arrasto devolve o tamanho original.
   - Clica na caixa antes (seleciona) e afasta o mouse: as alças continuam lá,
     porque é a seleção única — não precisa manter o hover para redimensionar.

## Interação no canvas

- **Gatilho:** `pointerdown` numa alça. Começa a redimensionar, não a mover — a alça
  fica sobre a borda, e sem essa distinção o gesto seria ambíguo.
- **Feedback:** o elemento acompanha o arrasto; o documento não é tocado até soltar.
  A prévia usa a mesma conta do commit — nunca uma geometria livre que o commit
  depois reinterpreta.
- **Cancela:** `Esc`.
- **Cursor:** o da direção da alça (`nwse-resize`, `ns-resize`, …).
- **Atalho de teclado: não tem.** Redimensionar por teclado precisa de um passo de
  incremento e de um alvo declarado, e nenhum dos dois está desenhado.
- **Undo:** uma alça arrastada é **uma** entrada, rotulada "Redimensionar".

## Regras de negócio

- **Nó de texto redimensiona livre, com um piso na altura.** Largura e altura mudam
  como numa forma; a única trava é a altura nunca ficar menor que o rótulo quebrado
  precisa na largura resultante — abaixo disso a alça para, mesma lógica do tamanho
  mínimo genérico (16px), só que o valor vem do conteúdo, não de uma constante.
  Esticar além do piso é sempre livre, em qualquer alça, inclusive `n`/`s`: é esse
  espaço que sobra que o alinhamento vertical usa para decidir onde o texto senta
  dentro da caixa (spec [`painel-propriedades.md`](../ui/painel-propriedades.md)).
- **Ícone preserva a proporção, em qualquer alça.** O lado oposto ao arrastado fica
  parado — nunca centralizado dentro de um retângulo livre. Numa alça de canto, o
  eixo que a pessoa moveu proporcionalmente mais decide o tamanho; numa alça lateral,
  só um eixo foi arrastado, e o outro é derivado da proporção e cresce **centrado**
  nele, porque a pessoa não indicou de que lado.
- **Tamanho mínimo de 16px** em cada eixo. Abaixo disso a alça para: um elemento de
  2px não é mais pegável, e o agregado recusa dimensão não positiva de qualquer
  forma.
- Arrastar para além do lado oposto **não espelha** — encosta no mínimo.
- **Visibilidade das alças é hover OU seleção única** — nunca as duas exigidas ao
  mesmo tempo. `soloSelected` (só este nó, nem edge junto) é um sinal DIFERENTE de
  "está selecionado": numa seleção múltipla, todos os nós estão "selecionados", mas
  nenhum é `soloSelected` — sem essa distinção, todos os nós de uma seleção
  múltipla mostrariam alça o tempo todo, sem precisar de hover.
- Aresta nunca tem alça — redimensionar é conceito de nó.

## Estados de UI

- Hover (qualquer nó): oito alças na borda, interativas.
- Seleção única, sem hover: as oito alças continuam visíveis.
- Seleção múltipla, sem hover em nenhum: nenhuma alça visível — hover em um
  deles revela as dele.
- Redimensionando: o elemento acompanha; nada mais muda.
- Erro: não se aplica.

## Modelagem de domínio

Nada novo no agregado. `ResizeNode` já existe.

Entra um **domain service** de geometria, puro e testável, com duas funções:

```ts
resizedRect(original: Rect, handle: ResizeHandle, dx: number, dy: number): Rect

resizedRectPreservingAspect(
  original: Rect, handle: ResizeHandle, dx: number, dy: number, aspect: number
): Rect
```

A primeira resolve qual borda se move, qual fica parada, e o mínimo — usada por
forma e como base do nó de texto. A segunda é a versão para ícone: mesma regra de
borda parada, mas força a proporção `aspect` em qualquer alça, inclusive lateral. As
duas são aritmética de retângulo — não conhecem ponteiro, zoom nem SVG, e por isso
são testáveis linha a linha em Node.

Nó de texto usa `resizedRect` livre (largura e altura, como forma) e DEPOIS aplica um
piso: se a altura resultante for menor que `wrapText` do rótulo exige na largura
resultante, trava nesse piso em vez do valor arrastado. Essa parte não é geometria
pura (depende de medir texto), então fica em `presentation/canvas/measureText.ts`
(`textHeightFor`) e é aplicada em `presentation/session/useEditorSession.ts`
(`previewResize`), não no domain service. É o único dos três casos que consulta o
CONTEÚDO do nó, não só a geometria — e o único com um piso em vez de um valor travado.

`presentation/session/useEditorSession.ts` chama a mesma função, com o mesmo
deslocamento, tanto para desenhar a prévia quanto para montar o `target` do commit —
é o que garante que a prévia **é** o resultado final, nunca uma aproximação que o
commit corrige depois. Vale para os três casos, inclusive o piso do texto: ele já
reflui ao vivo durante o arrasto, não só ao soltar.

## Impacto no documento

- Campos: nenhum. Só o `rect` do nó muda, e ele já existe.
- `schemaVersion`: não sobe.

## Impacto por camada

- `domain/`: `diagram/services/resizeGeometry.ts` + testes.
- `application/`: nada — `ResizeNode` já existe.
- `infrastructure/`: nada.
- `presentation/`: alças, arrasto de redimensionamento, cursores.
- Performance: durante o arrasto só o nó afetado é redesenhado.

## Restrições de implementação (guardrails)

- **As alças têm tamanho de tela, não de mundo.** Uma alça de 8px do mundo vira 2px
  a 25% de zoom, e ninguém acerta. O tamanho é dividido pela escala do viewport.
- **Invisível não é o mesmo que inerte.** `opacity: 0` não desliga o hit-test em
  SVG — um grupo escondido só por opacidade continua capturando clique e duplo
  clique por baixo do que deveria estar ali. As alças (e o ponto de conexão de
  `conectar-nos.md`) precisam de `pointer-events: none` no estado invisível e
  `auto` só quando `opacity: 1`, ou a área de clique deles (maior que o desenho,
  de propósito) rouba eventos de qualquer coisa perto da borda do nó.
- **`soloSelected` não é `selected`.** Um nó "está selecionado" mesmo dentro de uma
  seleção múltipla; só é `soloSelected` quando é o único. Usar o sinal errado para
  decidir "mostra alça mesmo sem hover" faz uma seleção de vários nós exibir alça
  em todos eles ao mesmo tempo.
- Nada de caso de uso dentro do `onPointerMove` — o commit é um só, ao soltar.
- A geometria fica no domain service, não no componente.

## Critérios de aceite

- [x] Hover em qualquer nó mostra oito alças, selecionado ou não.
- [x] Seleção única continua mostrando as alças sem precisar de hover.
- [x] Seleção múltipla, sem hover em nenhum nó, não mostra alça nenhuma.
- [x] Hover num nó de uma seleção múltipla mostra as alças dele, sem selecioná-lo
      sozinho.
- [ ] Arrastar a alça sudeste muda largura e altura, mantendo o canto noroeste
      parado — e vice-versa para as outras.
- [ ] Arrastar a alça leste muda só a largura.
- [ ] Redimensionar um nó de ícone preserva a proporção.
- [ ] Arrastar a alça leste de um nó de texto estreita a largura; se as linhas
      resultantes não couberem mais na altura atual, ela cresce ao vivo, durante o
      mesmo arrasto — nunca uma correção só ao soltar.
- [ ] Arrastar a alça sul de um nó de texto aumenta a altura livremente, além do que
      o conteúdo precisa — é esse espaço que o alinhamento vertical usa.
- [ ] Arrastar a alça sul de um nó de texto para ENCOLHER trava na altura mínima que
      o conteúdo atual exige — não fica menor, e o texto nunca some por trás da
      caixa sem aviso.
- [ ] Arrastar muito para dentro para no tamanho mínimo, sem espelhar.
- [ ] `Esc` durante o arrasto devolve o tamanho original e não grava nada.
- [ ] Redimensionar é **uma** entrada de undo.
- [ ] As alças continuam pegáveis com zoom em 25% e em 400%.
- [ ] O novo tamanho sobrevive à recarga.

## Questões em aberto

- [ ] `Shift` para forçar proporção também em formas, e `Alt` para redimensionar a
      partir do centro — convenções de editores gráficos que valem depois.
