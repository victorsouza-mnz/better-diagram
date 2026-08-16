# Spec: Canvas — navegação, seleção e arrasto

**Domínio:** editor  
**Status:** implemented

## Objetivo

A interação base do editor: navegar pelo plano, selecionar nós e movê-los. É o que
todo o resto assume pronto. Navegar inclui três caminhos: `Ctrl`/`Cmd`+scroll (zoom
no cursor), o minimapa (canto inferior esquerdo, arrastando o retângulo da câmera)
e os botões de zoom (centro inferior) — os três mexem no mesmo `viewport`, nenhum
sabe da existência dos outros.

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

- Pan com espaço+arrasto, botão do meio, ou arrasto no vazio com a ferramenta mão.
- Zoom com `Ctrl`/`Cmd` + scroll, centrado no cursor; scroll puro faz pan vertical.
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
  selecionar — ver `editor/formas-e-texto.md`.
- **Feedback durante**: os nós arrastados seguem o cursor numa camada de preview; o
  retângulo de seleção é desenhado tracejado enquanto arrasta, e o que já está dentro
  dele fica destacado em tempo real — a pessoa vê o que vai ser selecionado antes de
  soltar, não só depois.
- **Cancela**: `Esc` durante o arrasto de mover devolve os nós à posição original;
  `Esc` durante o arrasto de seleção descarta o retângulo sem alterar a seleção.
  Arrastar no minimapa e clicar nos botões de zoom não têm o que cancelar — não são
  gesto de duas fases (começa/decide), são a mudança de uma vez.
- **Atalhos**: `V` seleção · `H` mão · `Esc` limpar · `Delete`/`Backspace` apagar ·
  `Ctrl/Cmd+A` selecionar tudo · `Ctrl/Cmd+0` zoom 100% · `Ctrl/Cmd+1` ajustar à tela.
  Minimapa e botões de zoom não têm atalho de teclado próprio — são alternativa ao
  mouse, não um caminho novo de teclado.
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
- Zoom limitado entre 10% e 400%, pelos três caminhos de navegação (roda,
  minimapa não zoom, botões zoom sim) — todos passam pelo mesmo `zoomAt`/clamp.
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
  um tamanho de canvas zerado).
- Performance: durante o arrasto só a camada de preview muda, via `transform`.
  Nada de reescrever atributo de geometria por frame. O minimapa recalcula a
  própria janela a cada render dele — é aritmética de poucos retângulos, não pesa
  mesmo em diagramas de centenas de nós.

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
- [ ] Trackpad: pinça de zoom e pan de dois dedos precisam de tratamento distinto do
      scroll de mouse.
