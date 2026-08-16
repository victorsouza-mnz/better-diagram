# Spec: Canvas — navegação, seleção e arrasto

**Domínio:** editor  
**Status:** implemented

## Objetivo

A interação base do editor: navegar pelo plano, selecionar nós e movê-los. É o que
todo o resto assume pronto.

## Não-objetivos

- Criação de arestas por arrasto (spec própria).
- Redimensionar via handles (spec própria).
- Alinhamento automático, guias inteligentes e distribuição.
- Seleção por laço com forma livre — no v1 é retângulo.

## Comportamento esperado

- Pan com espaço+arrasto, botão do meio, ou arrasto no vazio com a ferramenta mão.
- Zoom com `Ctrl`/`Cmd` + scroll, centrado no cursor; scroll puro faz pan vertical.
- Clique seleciona um nó; `Shift`+clique adiciona ou remove da seleção.
- Arrasto no vazio, com a ferramenta de seleção ativa, desenha um retângulo e
  seleciona nós e arestas **inteiramente contidos** nele. `Shift`+arrasto soma ao
  que já estava selecionado, em vez de substituir.
- Arrastar um nó selecionado move a seleção inteira.
- `Esc` limpa a seleção; `Delete` apaga a seleção.

## Interação no canvas

- **Gatilho**: `pointerdown` no nó (mover) ou no vazio com a ferramenta de seleção
  (retângulo de seleção). Com uma ferramenta de forma ativa, o vazio cria em vez de
  selecionar — ver `editor/formas-e-texto.md`.
- **Feedback durante**: os nós arrastados seguem o cursor numa camada de preview; o
  retângulo de seleção é desenhado tracejado enquanto arrasta, e o que já está dentro
  dele fica destacado em tempo real — a pessoa vê o que vai ser selecionado antes de
  soltar, não só depois.
- **Cancela**: `Esc` durante o arrasto de mover devolve os nós à posição original;
  `Esc` durante o arrasto de seleção descarta o retângulo sem alterar a seleção.
- **Atalhos**: `V` seleção · `H` mão · `Esc` limpar · `Delete`/`Backspace` apagar ·
  `Ctrl/Cmd+A` selecionar tudo · `Ctrl/Cmd+0` zoom 100% · `Ctrl/Cmd+1` ajustar à tela.
- **Undo**: um arrasto inteiro é **uma** entrada, rotulada "Mover". Pan, zoom e
  seleção — **incluindo a seleção retangular** — **não** entram no histórico: não são
  mudança de documento, só de sessão.

## Regras de negócio

- **A área de clique é o `Rect` do nó, nunca o traço do vetor.** O logo do Redis tem
  regiões transparentes; clicar num vão seleciona o nó, não o que está atrás. Em SVG,
  um `<rect>` transparente de hit area sobre o ícone, com `pointer-events: none` no
  desenho do ícone.
- Empate de clique (nós sobrepostos) resolve pelo maior `z`.
- Pan e zoom são um único `transform` no `<g>` raiz — nunca recálculo posição a
  posição.
- Zoom limitado entre 10% e 400%.
- Arrasto sem deslocamento mínimo (~3px) é tratado como clique, não como mover —
  vale também para o retângulo de seleção: um arrasto curto demais é clique no vazio
  (limpa a seleção), não uma seleção retangular vazia.

### Seleção retangular: contenção inteira, nunca interseção

Um nó ou uma aresta entra na seleção quando está **inteiramente dentro** do
retângulo arrastado — tocar a borda sem estar todo dentro não conta. É a mesma
convenção do Excalidraw e do draw.io, e a razão é prever o resultado: com
interseção, encostar de raspão num elemento grande do lado de fora do que se queria
selecionar já o traz junto, e a pessoa não teve como antecipar isso olhando o
retângulo que desenhou. Com contenção inteira, o retângulo desenhado **é** a
resposta — o que está visualmente dentro é exatamente o que entra.

Uma **aresta** entra quando os dois nós que ela liga estão dentro do retângulo — não
o desenho da curva em si. Arrastar uma caixa ao redor de dois nós conectados também
seleciona a ligação entre eles; arrastar ao redor de só um dos dois não seleciona a
aresta, mesmo que o arco dela cruze o retângulo (o feixe pode arquear para fora da
linha reta entre os nós — computar a caixa exata dessa curva para uma regra de
seleção seria complexidade sem ganho perceptível).

## Estados de UI

- Vazio: canvas sem nós mostra chamada para abrir a paleta de logos.
- Seleção: contorno nos nós selecionados; um bounding box comum quando são vários.
- Selecionando por retângulo: o retângulo tracejado, e cada nó/aresta que já está
  contido nele destacado enquanto o arrasto continua.
- Erro: não se aplica — nenhuma operação aqui pode falhar.

## Impacto no documento

- Só `MoveNodes` grava: atualiza o `rect` dos nós movidos, ao soltar.
- **Zoom, pan, seleção, ferramenta ativa e o preview de arrasto não entram no
  documento.** São estado de sessão em `presentation/`.
- `schemaVersion`: sem mudança.

## Impacto por camada

- `domain/`: nada novo — `MoveNodes` opera sobre o agregado existente.
- `application/`: caso de uso `MoveNodes`, disparado **uma vez**, no fim do arrasto.
- `infrastructure/`: nada.
- `presentation/`: renderer SVG, estado de sessão, handlers de ponteiro e teclado.
- Performance: durante o arrasto só a camada de preview muda, via `transform`.
  Nada de reescrever atributo de geometria por frame.

## Restrições de implementação (guardrails)

- **Nunca chamar caso de uso dentro de `onPointerMove`.** Se aparecer essa
  necessidade, a modelagem está errada, não a performance.
- Conversão tela↔mundo mora numa função pura testável, não espalhada nos handlers.
- Acima de ~2000 nós, virtualizar por viewport. Abaixo disso, não otimizar antes.

## Critérios de aceite

- [ ] Zoom com Ctrl+scroll mantém sob o cursor o mesmo ponto do mundo.
- [ ] Clicar num vão transparente do logo seleciona o nó.
- [ ] Arrastar 5 nós selecionados gera **uma** entrada de undo.
- [ ] `Esc` no meio do arrasto devolve os nós à posição inicial e não grava nada.
- [ ] Pan e zoom não sujam o documento nem criam entrada de undo.
- [ ] Clique com deslocamento de 2px seleciona, não move.
- [ ] Arrastar um retângulo ao redor de vários nós seleciona só os inteiramente
      contidos — um nó que fica pela metade fora fica de fora.
- [ ] Arrastar ao redor de dois nós conectados também seleciona a aresta entre eles.
- [ ] `Shift`+arrastar soma à seleção existente, sem remover o que já estava.
- [ ] `Esc` durante o arrasto de seleção descarta o retângulo sem mudar a seleção.
- [ ] Selecionar por retângulo não cria entrada de histórico.
- [ ] Um arrasto de seleção menor que o limiar é tratado como clique no vazio.

## Questões em aberto

- [ ] Snap a grid no v1 ou depois? Se sim, qual passo (8px?).
- [ ] Trackpad: pinça de zoom e pan de dois dedos precisam de tratamento distinto do
      scroll de mouse.
