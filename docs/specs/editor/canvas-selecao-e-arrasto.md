# Spec: Canvas — navegação, seleção e arrasto

**Domínio:** editor  
**Status:** implemented

## Objetivo

A interação base do editor: navegar pelo plano, selecionar nós e movê-los. É o que
todo o resto assume pronto. Navegar inclui quatro caminhos: rolar o scroll (zoom no
cursor), arrastar com o botão do meio ou o direito (pan), o minimapa (canto
inferior esquerdo, arrastando o retângulo da câmera) e os botões de zoom (centro
inferior) — os quatro mexem no mesmo `viewport`, nenhum sabe da existência dos
outros.

## Não-objetivos

- Criação de arestas por arrasto (spec própria).
- Redimensionar via handles (spec própria).
- Alinhamento automático, guias inteligentes e distribuição.
- Seleção por laço com forma livre — no v1 é retângulo.
- **Clicar num nó no minimapa pra selecioná-lo.** O minimapa só navega (pan); os
  retângulos dos nós ali são só desenho, não têm `onClick` nem seleção.
- **Minimapa redimensionável ou arrastável de posição.** Tamanho e canto (inferior
  esquerdo) são fixos.

## Comportamento esperado

- **Pan com o botão do MEIO ou o DIREITO, arrastando** — funciona em cima de
  QUALQUER coisa (nó, aresta, vazio), independente da ferramenta ativa: os dois
  botões nunca disparam o gesto de esquerdo de baixo (mover nó, criar forma,
  marquee), então não há ambiguidade nem precisa soltar a ferramenta atual pra
  navegar. O botão direito não abre o menu de contexto do sistema enquanto estiver
  sobre o canvas. Espaço+arrasto e uma ferramenta "mão" dedicada (`H`) ainda não
  existem — ver "Questões em aberto".
- **Zoom com o scroll, centrado no cursor** — não precisa mais de `Ctrl`/`Cmd`
  (pinça de trackpad, que o browser reporta como `wheel` com `ctrlKey: true`,
  cai no mesmo caminho de qualquer jeito). Só o eixo vertical (`deltaY`) conta;
  scroll puramente horizontal não faz mais nada — o scroll já não faz pan (isso
  virou o arrasto de botão do meio/direito, acima).
- Clique seleciona um nó; `Shift`+clique adiciona ou remove da seleção.
- Arrasto no vazio, com a ferramenta de seleção ativa, desenha um retângulo e
  seleciona nós e arestas **inteiramente contidos** nele. `Shift`+arrasto soma ao
  que já estava selecionado, em vez de substituir.
- Arrastar um nó selecionado move a seleção inteira.
- `Esc` limpa a seleção; `Delete` apaga a seleção.
- **Minimapa**, canto inferior esquerdo: mostra cada nó em miniatura e um
  retângulo maior representando a câmera (o que está visível na tela agora).
  Arrastar esse retângulo faz pan; clicar em qualquer outro ponto do mapa também
  navega pra lá, e o arrasto pode continuar no mesmo gesto sem soltar.
- **Botões de zoom**, centro inferior: `−`/`+` (20% por clique, `MAX_SCALE`/
  `MIN_SCALE` desabilitam o botão correspondente) e o zoom atual em `%` entre eles.
  Zoom em torno do CENTRO da tela — um clique não tem "onde o cursor estava
  passando por cima do mundo" pra manter fixo, ao contrário da roda.

## Interação no canvas

- **Gatilho**: `pointerdown` no nó (mover) ou no vazio com a ferramenta de seleção
  (retângulo de seleção). Com uma ferramenta de forma ativa, o vazio cria em vez de
  selecionar — ver `editor/formas-e-texto.md`. Pan é um gatilho À PARTE, resolvido
  ANTES de qualquer um destes: botão do meio ou direito, capturado na fase de
  CAPTURA do `pointerdown` do `<svg>` raiz (`beginPan`, em `DiagramCanvas.tsx`) —
  chega antes que o evento alcance o nó/vazio por baixo e dispare mover/criar/
  selecionar. Sem isso, botão direito EM CIMA de um nó começaria a arrastar o nó
  (o handler dele não filtra por botão), não a câmera.
- **Feedback durante**: os nós arrastados seguem o cursor numa camada de preview; o
  retângulo de seleção é desenhado tracejado enquanto arrasta, e o que já está dentro
  dele fica destacado em tempo real — a pessoa vê o que vai ser selecionado antes de
  soltar, não só depois. Pan: o cursor vira `grabbing` (`.canvas--panning`) por toda
  a duração do arrasto.
- **Cancela**: `Esc` durante o arrasto de mover devolve os nós à posição original;
  `Esc` durante o arrasto de seleção descarta o retângulo sem alterar a seleção.
  Arrastar no minimapa e clicar nos botões de zoom não têm o que cancelar — não são
  gesto de duas fases (começa/decide), são a mudança de uma vez. Pan também não tem
  o que cancelar: cada `pointermove` já aplicou o deslocamento direto no
  `viewport` (nada fica pendente pra desfazer no meio do gesto), e soltar o botão
  simplesmente para de mover a câmera de onde ela já está.
- **Atalhos**: `V` seleção · `Esc` limpar · `Delete`/`Backspace` apagar. Pan não tem
  atalho de teclado — só os dois botões do mouse. Minimapa e botões de zoom também
  não têm atalho próprio — são alternativa ao mouse, não um caminho novo de
  teclado. `Ctrl/Cmd+A` (selecionar tudo), `Ctrl/Cmd+0` (zoom 100%), `Ctrl/Cmd+1`
  (ajustar à tela) e uma ferramenta "mão" dedicada (`H`) ainda não existem — ver
  `docs/specs/index.md`.
- **Undo**: um arrasto inteiro é **uma** entrada, rotulada "Mover". Pan, zoom e
  seleção — **incluindo a seleção retangular, o arrasto no minimapa e os cliques de
  zoom** — **não** entram no histórico: não são mudança de documento, só de sessão.

### Minimapa: gatilho, feedback e a regra que evita o retângulo "travado"

- **Gatilho**: `pointerdown` no retângulo da câmera, ou em qualquer outro ponto do
  mapa (nesse caso já pula a câmera pra lá primeiro, e o arrasto continua no mesmo
  gesto). Cada nó vira um retângulo em miniatura, só desenho — não clicável.
- **Feedback**: o canvas principal acompanha o arrasto ao vivo, quadro a quadro —
  mesmo `viewport` dos outros dois caminhos de navegação, sem prévia separada.
- **A janela de mundo que o mapa mostra nunca pode ter o CENTRO derivado da posição
  da câmera** — só do conteúdo (ou da origem do mundo, sem nó nenhum). Regra não
  óbvia, registrada aqui porque já quebrou na prática: se o centro reagisse à
  câmera, o mapa reCENTRALIZARIA nela a cada render (ou colapsaria pra ela sempre
  que fosse o maior dos dois retângulos — o caso comum, não a exceção), e a câmera
  passaria a parecer travada no mesmo lugar do mapa não importa pra onde a pessoa
  arrasta: o pan de verdade acontece, só que o mapa não teria como MOSTRAR isso. A
  conta mora em `minimapWindow` (`presentation/canvas/minimapGeometry.ts`), função
  pura e testada isolada — exatamente porque o bug só aparece rodando de verdade,
  nunca lendo o código.

## Regras de negócio

- **A área de clique é o `Rect` do nó, nunca o traço do vetor.** O logo do Redis tem
  regiões transparentes; clicar num vão seleciona o nó, não o que está atrás. Em SVG,
  um `<rect>` transparente de hit area sobre o ícone, com `pointer-events: none` no
  desenho do ícone.
- Empate de clique (nós sobrepostos) resolve pelo maior `z`.
- Pan e zoom são um único `transform` no `<g>` raiz — nunca recálculo posição a
  posição.
- Zoom limitado entre 10% e 400%, pelos caminhos que fazem zoom (roda, botões de
  zoom — minimapa não muda o zoom, só pan) — todos passam pelo mesmo
  `zoomAt`/clamp.
- **Pan por arrasto (botão do meio ou direito) usa o MESMO `panBy` do minimapa** —
  um pixel de deslocamento na tela move um pixel de `viewport`, sem escalar pelo
  zoom atual (a translação do `<g>` raiz já está FORA da escala — `translate(...)
  scale(...)`, nessa ordem — então mover em pixel de tela é sempre 1:1, em
  qualquer nível de zoom).
- **Pan por arrasto funciona sobre QUALQUER coisa, não só o vazio** — o botão do
  meio/direito é capturado antes de o evento alcançar nó, aresta ou alça de
  redimensionar (ver "Interação no canvas"), então nunca compete com mover um nó,
  redimensionar ou conectar, mesmo que o cursor esteja em cima de um deles.
- Arrasto sem deslocamento mínimo (~3px) é tratado como clique, não como mover —
  vale também para o retângulo de seleção: um arrasto curto demais é clique no vazio
  (limpa a seleção), não uma seleção retangular vazia.
- **Escala ÚNICA nos dois eixos do minimapa** — um nó ou a câmera nunca aparecem
  mais "gordos" ou "magros" no mapa do que são no mundo, mesmo com o canvas numa
  proporção de tela diferente da proporção do mapa (180×130 fixos). A dimensão que
  sobra fica de respiro, centralizada — nunca distorce a outra pra preencher.

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

- Vazio: canvas sem nós mostra chamada para abrir a paleta de logos. O minimapa
  continua aparecendo mesmo assim — mostra só o retângulo da câmera, sem nó nenhum.
- Seleção: contorno nos nós selecionados; um bounding box comum quando são vários.
- Selecionando por retângulo: o retângulo tracejado, e cada nó/aresta que já está
  contido nele destacado enquanto o arrasto continua.
- Botões de zoom no limite: o `−` desabilita em 10%, o `+` desabilita em 400% —
  cinza, sem hover, sem clique.
- Câmera longe de todo conteúdo: o retângulo dela sai da área visível do minimapa
  (a `<svg>` recorta sozinha) — ainda dá pra voltar clicando em qualquer ponto dele.
- Erro: não se aplica — nenhuma operação aqui pode falhar.

## Impacto no documento

- Só `MoveNodes` grava: atualiza o `rect` dos nós movidos, ao soltar.
- **Zoom, pan, seleção, ferramenta ativa e o preview de arrasto não entram no
  documento.** São estado de sessão em `presentation/` — inclusive o pan pelo
  minimapa e o zoom pelos botões: os dois só chamam `panBy`/`zoom`, os mesmos que a
  roda já chamava.
- `schemaVersion`: sem mudança.

## Impacto por camada

- `domain/`: nada novo — `MoveNodes` opera sobre o agregado existente.
- `application/`: caso de uso `MoveNodes`, disparado **uma vez**, no fim do arrasto.
- `infrastructure/`: nada.
- `presentation/`: renderer SVG, estado de sessão, handlers de ponteiro e teclado.
  Minimapa e zoom: `canvas/Minimap.tsx`, `canvas/ZoomControls.tsx`,
  `canvas/minimapGeometry.ts` (a única parte com lógica não trivial, por isso
  função pura à parte, testada isolada — ver "Minimapa" acima). `DiagramCanvas`
  passa a medir o próprio tamanho em tela (`ResizeObserver`, com uma leitura
  síncrona inicial via `getBoundingClientRect` — o primeiro disparo do observer
  pode demorar mais que um frame, e até lá minimapa/zoom calculariam a câmera com
  um tamanho de canvas zerado). Pan por arrasto: `beginPan`/`panningRef` e o
  `onPointerDownCapture`/`onContextMenu` do `<svg>`, todos em `DiagramCanvas.tsx` —
  nenhum caso de uso novo, só chama o `panBy` que já existia (mesmo action do
  minimapa e da roda antiga).
- Performance: durante o arrasto só a camada de preview muda, via `transform`.
  Nada de reescrever atributo de geometria por frame. O minimapa recalcula a
  própria janela a cada render dele — é aritmética de poucos retângulos, não pesa
  mesmo em diagramas de centenas de nós.

## Restrições de implementação (guardrails)

- **Nunca chamar caso de uso dentro de `onPointerMove`.** Se aparecer essa
  necessidade, a modelagem está errada, não a performance.
- Conversão tela↔mundo mora numa função pura testável, não espalhada nos handlers.
- Acima de ~2000 nós, virtualizar por viewport. Abaixo disso, não otimizar antes.
- **Gesto de botão do meio/direito só pode nascer na fase de CAPTURA do
  `pointerdown` do `<svg>` raiz, nunca na de borbulhamento.** Um handler de
  borbulhamento roda DEPOIS que o evento já passou pelo nó/aresta por baixo — e
  esses handlers não filtram por botão, então já teriam começado a mover o nó ou
  selecionar antes do pan ter a chance de agir. A captura intercepta antes disso
  existir.

## Critérios de aceite

- [x] Zoom com o scroll (sem precisar de `Ctrl`/`Cmd`) mantém sob o cursor o mesmo
      ponto do mundo.
- [x] Scroll puramente horizontal (`deltaY === 0`) não faz zoom nem pan — não tem
      mais o que fazer, e não deve "zoom out por acidente".
- [x] Arrastar com o botão do meio ou o direito faz pan, EM CIMA de qualquer coisa
      (nó, aresta, alça, vazio) — sem mover o nó, sem abrir o menu de contexto do
      sistema, sem soltar a ferramenta ativa.
- [x] Pan por arrasto move a câmera 1:1 em pixel de tela, em qualquer nível de
      zoom.
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
- [x] Arrastar o retângulo da câmera no minimapa faz o canvas principal fazer pan,
      ao vivo, quadro a quadro do arrasto.
- [x] Clicar em outro ponto do minimapa (fora do retângulo da câmera) navega pra lá
      e o arrasto continua no mesmo gesto.
- [x] Arrastar a câmera COM conteúdo no diagrama continua funcionando quando a
      câmera é maior que o conteúdo (caso comum) — não só quando é menor.
- [x] Sem nó nenhum no diagrama, arrastar a câmera no minimapa ainda funciona —
      a janela usa a origem do mundo como referência, não trava na câmera.
- [x] Cada nó aparece como um retângulo em miniatura no mapa, na posição relativa
      certa.
- [x] Clicar `+`/`−` muda o zoom em torno do centro da tela; o `%` mostrado bate
      com o rodapé de status.
- [x] Nos limites de zoom (10%/400%), o botão correspondente fica desabilitado.
- [x] Nada do minimapa nem dos botões de zoom cria entrada de undo.

## Questões em aberto

- [ ] Snap a grid no v1 ou depois? Se sim, qual passo (8px?).
- [ ] **Trackpad: dois dedos rolando (sem pinçar) agora dá ZOOM, não pan.** Decisão
      consciente desta entrega — "rolar o scroll = zoom" não distingue mouse físico
      de trackpad, porque o browser entrega os dois como o mesmo `wheel`, sem sinal
      confiável de qual foi (heurísticas por `deltaMode`/magnitude existem, mas não
      foram implementadas). Quem usa trackpad tem o arrasto de botão do meio/direito
      como alternativa pra pan; se isso for uma queixa recorrente, a resposta é
      tratamento distinto por heurística, não voltar o scroll a fazer pan por padrão
      (isso reabriria a ambiguidade que motivou a mudança).
- [ ] Espaço+arrasto e uma ferramenta "mão" dedicada (`H`) continuam não
      implementados (ver `docs/specs/index.md`) — ficariam como um TERCEIRO gatilho
      de pan, ao lado do botão do meio e do direito.
