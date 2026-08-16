# Spec: Conectar nós — arestas

**Domínio:** editor  
**Status:** ready

## Objetivo

Ligar dois nós com uma seta. Metade de um diagrama de arquitetura são as ligações —
sem elas o app produz um mural de logos, não um diagrama.

## Não-objetivos

- **Roteamento ortogonal** com desvio de obstáculos. Ver a decisão abaixo.
- **Âncora fixa escolhida pelo usuário** ("sai sempre pela direita"). O ponto de
  encaixe é derivado da geometria; fixá-lo seria campo no documento e `schemaVersion`
  novo.
- **Editar o rótulo da aresta.** O modelo já tem `label` e ele é desenhado se
  existir, mas a edição no lugar chega junto com a de rótulo de nó (etapa 2).
- Pontos intermediários (waypoints), curvas editáveis, arestas ligando a arestas.
- **Estilo por trecho ou cor customizada da aresta.** O ciclo de Ctrl+clique cobre
  tracejado × direção — cor e espessura são "estilo por elemento" (roadmap, etapa
  própria), não desta spec.

## Contexto

O domínio já modela `Edge` e o caso de uso `ConnectNodes`, com os invariantes
testados: aresta referencia dois nós existentes, apagar um nó leva as arestas
incidentes, e nó não se liga a si mesmo. Falta a interação e o desenho.

A aresta **não guarda geometria** — só os dois ids. A rota é derivada na hora de
desenhar, a partir dos retângulos. Uma aresta que guardasse pontos ficaria
desatualizada no instante em que alguém movesse um nó.

## Decisão: reta com encaixe na borda

**A aresta é um segmento reto entre os dois nós, cortado na borda de cada
retângulo.** O ponto de encaixe é a interseção da linha centro-a-centro com a borda,
recalculada a cada render.

Ortogonal (segmentos em ângulo reto) foi avaliado e descartado **para esta entrega**.
É o visual clássico de diagrama de arquitetura, mas só fica bom com desvio de
obstáculos: sem isso, os cotovelos atravessam nós e o resultado fica pior que a
reta — e desvio de obstáculos é um algoritmo de busca em grade, com custo próprio de
performance e de ajuste fino. Reta com encaixe na borda é correto por construção,
não tem caso degenerado a não ser um (nós concêntricos), e não fecha a porta:
trocar a rota é trocar a função pura que produz os pontos.

### Arestas paralelas precisam se separar

O documento **permite** duas arestas entre o mesmo par, na mesma direção — dois
canais entre os mesmos serviços são caso real. Desenhadas iguais, elas ficam
exatamente uma sobre a outra e o diagrama mente: parecem uma só.

Arestas entre o mesmo par formam um **feixe espalhado simetricamente** em torno da
reta que as ligaria, de forma que a contagem visível bata com a contagem real. Com
duas, cada uma se arqueia para um lado; com três, a do meio fica reta. Espalhar em
torno do eixo, em vez de manter a primeira reta e desviar as outras, mantém o feixe
centrado onde a ligação de fato está.

## Comportamento esperado

- Passar o ponteiro sobre um nó revela uma seta de conexão no lado direito.
- Arrastar a partir dela até outro nó cria a aresta.
- `Alt`+arrastar a partir de **qualquer ponto** do corpo do nó também conecta — um
  atalho que não depende de mirar num ponto fixo, e cobre os outros lados sem
  precisar de mais pontos de conexão.
- Mover um nó faz as arestas incidentes acompanharem.
- Clicar numa aresta a seleciona; `Delete` apaga a selecionada.
- `Ctrl`+clicar (`Cmd` no Mac) numa aresta avança um passo no ciclo de 4 estilos (ver
  abaixo) — não seleciona.
- Apagar um nó leva as arestas incidentes junto (já garantido pelo agregado).
- Tudo isso é desfazível, inclusive um passo no ciclo de estilo.

## O ciclo de estilo

`Ctrl`+clique numa aresta percorre, em ordem, e volta ao início depois da quarta:

1. Sólida, unidirecional (o padrão de uma aresta recém-criada).
2. Sólida, bidirecional.
3. Tracejada, unidirecional.
4. Tracejada, bidirecional.

Os dois eixos — tracejado e direção — são **independentes**: dois booleanos, não
quatro nomes arbitrários. O ciclo é só a ORDEM em que Ctrl+clique os percorre; nada
no domínio exige que andem juntos.

**Era `Alt`+clique; passou a ser `Ctrl`+clique** para deixar `Alt` livre num gesto
diferente: `Alt`+clique (sem arrastar) num nó de TEXTO agora alterna entre texto
simples e código — ver "Alt+clique reaproveitado num nó de texto" abaixo e
`editor/formas-e-texto.md`. As duas mudanças saem da mesma decisão: cada modificador
faz UMA coisa por tipo de elemento (aresta → Ctrl cicla estilo; nó de texto → Alt
alterna formato), em vez de `Alt` acumular sentidos diferentes dependendo de onde
cai o clique.

## Fluxo do usuário

1. Passa o ponteiro sobre o nó do Nginx: aparece a seta de conexão no lado direito.
2. Pressiona e arrasta: uma linha segue o cursor.
3. Solta sobre o nó do Postgres: a aresta é criada, com seta apontando para o
   Postgres.
4. Alternativos:
   - `Alt`+arrasta a partir do meio do nó (não da seta fixa) → mesmo resultado,
     partindo de qualquer ponto do corpo.
   - Solta no vazio → nada é criado, sem aviso. Desistir é o caso comum.
   - Solta sobre o próprio nó de origem → nenhuma ARESTA é criada (nó não se liga a
     si mesmo) — mas se a origem é um nó de TEXTO, esse "soltar sobre si mesmo" É o
     formato de um `Alt`+clique sem arrastar, e o formato do texto (simples/código)
     alterna. Ver "Alt+clique reaproveitado num nó de texto" abaixo.
   - `Esc` durante o arrasto → cancela.
5. `Ctrl`+clique na aresta criada: ela fica bidirecional. Mais um: tracejada. Mais um:
   tracejada e bidirecional. Mais um: volta a sólida e unidirecional.

## Interação no canvas

- **Gatilho:** `pointerdown` na seta de conexão, ou `Alt`+`pointerdown` em qualquer
  ponto do corpo do nó. Os dois começam o modo "conectando", não "mover" — sem essa
  distinção, arrastar o corpo do nó ficaria ambíguo entre mover e conectar, e é por
  isso que o gatilho sem `Alt` continua sendo mover.
- **Feedback durante:** linha do ponto de origem até o cursor; o nó sob o cursor,
  quando é alvo válido, recebe destaque. Com `Alt` pressionado sobre um nó (antes de
  arrastar), o cursor já muda para uma seta, avisando que o próximo arrasto conecta.
- **Cancela:** `Esc`, ou soltar fora de um nó válido.
- **Atalho de teclado: não tem** para criar. Criar uma aresta exige apontar dois
  alvos, e um fluxo por teclado precisaria de navegação entre nós, que não existe.
  Mudar o estilo também não tem atalho de teclado — é `Ctrl`+clique, e só.
- Selecionar a aresta também mostra direção e traço como botões, no painel de
  propriedades (`ui/painel-propriedades.md`) — escolha direta, sem ciclar. Os dois
  caminhos chamam o mesmo `Diagram.setEdgeStyle`; nenhum sabe do outro.
- **Undo:** uma aresta criada é **uma** entrada, rotulada "Conectar". Apagar entra na
  entrada "Apagar", junto com os nós. Um passo no ciclo de estilo (ou um clique no
  painel) é **uma** entrada, rotulada "Mudar estilo da aresta" — desfazer volta um
  passo no ciclo, não reseta para sólida direto.

## Regras de negócio

- Aresta liga nó a nó. Não existe aresta solta nem aresta ligando a aresta.
- **Nó não se liga a ele mesmo** — o agregado já recusa.
- **Duas arestas entre o mesmo par são permitidas** e precisam ser visualmente
  distinguíveis (ver a decisão acima).
- A direção importa: a seta aponta para o `target`.
- **Nós concêntricos:** quando os centros coincidem não há direção definida, e a
  aresta não é desenhada. Ela reaparece assim que os nós se separam. Não é erro,
  não é aviso — é um estado transitório de arrasto.
- A aresta é desenhada **atrás** dos nós, para o logo nunca ficar cortado por uma
  linha.
- **Aresta nasce sólida e unidirecional.** `Ctrl`+clique muda o estilo; nada mais
  muda — clicar sem `Ctrl` numa aresta sempre seleciona, nunca cicla o estilo por
  acidente.
- **Bidirecional desenha seta nas duas pontas**, reaproveitando o mesmo marcador de
  seta do sentido único — não é uma segunda ponta com desenho diferente.

## Estados de UI

- Vazio: um diagrama sem arestas não mostra nada de diferente.
- Conectando: linha seguindo o cursor; alvo válido destacado.
- Selecionada: a aresta engrossa e muda de cor.
- Erro: não se aplica — o que não é ligação válida simplesmente não vira aresta.

## Modelagem de domínio

Um **domain service** de geometria, puro e testável:

- `attachPoints(source: Rect, target: Rect): [Point, Point] | undefined` — os dois
  pontos de encaixe nas bordas, ou `undefined` quando os centros coincidem.
- `parallelBow(index: number, total: number): number` — o desvio lateral de uma
  aresta dentro de um feixe entre o mesmo par.

Em `domain/diagram/services/`. É geometria pura: entra retângulo, sai ponto. Não
conhece SVG, evento nem zoom.

### Estilo é um VO na própria `Edge`, mais um ciclo puro

```ts
interface EdgeStyle {
  readonly dashed: boolean;
  readonly bidirectional: boolean;
}
```

`Edge.style: EdgeStyle`, padrão `{ dashed: false, bidirectional: false }`. Dois
booleanos, não um enum de 4 nomes: os eixos são ortogonais de verdade, e um enum
encobriria essa independência atrás de rótulos arbitrários.

`nextEdgeStyle(current: EdgeStyle): EdgeStyle`, em `domain/diagram/EdgeStyle.ts`, é
a ÚNICA fonte da ordem do ciclo — testada isoladamente. O caso de uso
`CycleEdgeStyle` só busca a aresta, chama `nextEdgeStyle` e comete; a ordem em si
nunca é decidida na apresentação.

### A seleção passa a ter dois tipos

Hoje a seleção é um `Set<NodeId>`. Com arestas selecionáveis, ela vira:

```ts
interface Selection {
  readonly nodes: ReadonlySet<NodeId>;
  readonly edges: ReadonlySet<EdgeId>;
}
```

Um objeto só, e não dois estados separados: seleção é **um** conceito, e `Delete`
precisa agir sobre os dois de uma vez. Duas variáveis paralelas seriam duas chances
de esquecer uma delas — e a esquecida seria sempre a de arestas, que é a nova.

Isso atravessa o `History` (a entrada guarda a seleção inteira) e o `commit`.

### O ponto de conexão e o `Alt`+arrasto não são âncoras do documento

A seta que aparece no hover, e o `Alt`+arrasto do corpo, são **affordance de
interação** — existem para dar onde pegar. Nenhum dos dois é gravado, e a aresta
criada a partir de um ou de outro não "sai por aquele lado" para sempre: o encaixe
continua sendo derivado da geometria dos retângulos, a cada render (`attachPoints`).
Confundir os dois é o caminho para um campo de âncora no documento que ninguém pediu.

### Alt+clique reaproveitado num nó de texto

`beginConnect` dispara no `pointerdown`, então um `Alt`+CLIQUE sem arrastar é, por
construção, o mesmo gesto que um `Alt`+arrasto — só que solta exatamente onde
começou. `endConnect` já tratava esse caso (`target === current.from`) como
"desistiu, nada é criado"; esta entrega ACRESCENTA um efeito colateral a esse mesmo
ramo, só quando a origem é um nó de **texto**: alterna o formato entre simples e
código (`CycleTextFormat`, mesmo formato de caso de uso que `CycleEdgeStyle`, só que
um toggle de dois valores em vez de um ciclo de quatro — ver
`editor/formas-e-texto.md`).

Não é um `pointerdown`/gesto novo — é o MESMO `Alt`+clique em nó que já existia,
lido pelo código que já distinguia "clicou" de "arrastou pra outro nó". Nas outras
variantes (forma, ícone) o ramo continua sem efeito nenhum, exatamente como antes.

### Por que UM ponto de conexão, não quatro

A primeira versão desta spec tinha um ponto em cada lado do nó (`N`/`E`/`S`/`W`).
Trocado por um ponto fixo (leste) mais `Alt`+arrasto de qualquer lugar do corpo,
por duas razões:

- **Um alvo memorizável bate mais rápido que quatro pequenos.** Depois da primeira
  vez, a pessoa sabe que a seta está sempre à direita — não precisa mirar em qual
  dos quatro está mais perto do destino.
- **`Alt`+arrasto não tem "lado errado".** Para conectar saindo pela esquerda ou por
  cima, não é preciso um ponto ali — é preciso segurar `Alt` e arrastar de qualquer
  lugar do nó. Cobre os outros três lados sem precisar desenhar mais nada.

O custo é exigir a tecla modificadora para o caso "não é o lado direito" — aceitável
porque o caso comum (conectar por qualquer lado, sem se importar de onde exatamente)
já está coberto pelo ponto fixo, e o `Alt`+arrasto existe exatamente para quem quer
outro lado.

## Impacto no documento

- Campos: `edges[].dashed` e `edges[].bidirectional` (booleanos), além de `id`,
  `source`, `target`, `label`, que já existiam.
- `schemaVersion`: **não sobe**. Os dois campos têm padrão seguro (`false`, o
  estilo de sempre) e um documento salvo antes de eles existirem continua abrindo —
  mesma técnica já usada em `label`/`z` de `NodeDoc`. Subir a versão é reservado
  para mudança que quebra leitura antiga; ver `docs/architecture.md`.
- Assets: sem efeito.

## Impacto por camada

- `domain/`: `diagram/services/edgeGeometry.ts`; `EdgeStyle.ts` (VO + ciclo);
  `Edge.withStyle`; `Diagram.setEdgeStyle`.
- `application/`: `ConnectNodes` já existia; `CycleEdgeStyle` e `SetEdgeStyle`
  (escolha direta, usada pelo painel de propriedades) novos;
  `DeleteSelection` já recebe ids de aresta.
- `infrastructure/`: nada.
- `presentation/`: render das arestas (incluindo tracejado e seta dupla), a seta de
  conexão única, o `Alt`+arrasto do corpo, o cursor de `Alt`+hover, seleção de
  aresta, `Ctrl`+clique para ciclo de estilo, o `Alt`+clique reaproveitado em nó de
  texto (`useEditorSession.endConnect`), e os botões de direção/traço no painel de
  propriedades (`ui/painel-propriedades.md`).
- Performance: as arestas são recalculadas a cada render. Com centenas de arestas é
  aritmética trivial; se um dia pesar, memoiza por par de retângulos.

## Restrições de implementação (guardrails)

- **A área de clique da aresta não é a linha.** Uma linha de 1,5px é impossível de
  acertar. Vai um traço transparente e largo (~12px) por baixo, recebendo o ponteiro.
  É o mesmo princípio da área de clique do nó ser o retângulo, e não o vetor.
- Geometria fica no domain service, não no componente. Nada de calcular interseção
  dentro do JSX.
- Conectar passa pelo caso de uso e pelo ponto único de commit — como tudo que muda
  o documento.
- Nada de guardar pontos da aresta no documento.
- **A área de clique do ponto de conexão ENCOSTA na borda do nó, sem vão até a
    seta.** A seta só aparece via `.node:hover`, e esse `:hover` desliga assim que o
    ponteiro sai de toda parte clicável do nó — um círculo de alvo isolado mais
    adiante (a primeira versão desta entrega) cria um vão sem nada clicável entre a
    borda e o alvo: o cursor atravessa esse vão, o `:hover` cai, a seta some antes
    de a pessoa alcançá-la. A área de clique é uma FAIXA que começa em `x=0` (a
    própria borda) e vai até a ponta da seta — mantém o `:hover` ligado por toda a
    travessia. Onde essa faixa se sobrepõe à alça leste de `redimensionar.md`, quem
    decide é a ORDEM NO DOM (alça renderiza depois, fica por cima), não separação
    geométrica — as duas áreas de clique PODEM se sobrepor.

## Critérios de aceite

- [x] Arrastar da seta de conexão até outro nó cria a aresta, com seta na ponta
      certa.
- [x] `Alt`+arrastar de qualquer ponto do corpo do nó também cria a aresta.
- [x] Mover qualquer um dos dois nós faz a aresta acompanhar.
- [x] Soltar no vazio, ou no próprio nó de origem, não cria nada.
- [x] `Esc` durante o arrasto de conexão cancela.
- [x] Duas arestas entre o mesmo par são visíveis como duas.
- [x] Clicar na aresta seleciona; `Delete` apaga só ela, sem tocar nos nós.
- [x] Apagar um nó apaga as arestas incidentes.
- [x] Conectar, e depois desfazer, remove a aresta — uma entrada de histórico.
- [x] A aresta é desenhada atrás dos nós.
- [x] Sobrepor completamente dois nós conectados não quebra o render.
- [x] `Ctrl`+clique percorre sólida-uni → sólida-bi → tracejada-uni → tracejada-bi →
      volta ao início.
- [x] `Ctrl`+clique numa aresta não a seleciona — é uma ação distinta de clicar sem
      `Ctrl`; `Alt`+clique numa aresta também não cicla mais (virou seleção comum).
- [x] Um passo no ciclo de estilo é desfazível como **uma** entrada.
- [x] Documento salvo antes de `dashed`/`bidirectional` existirem continua abrindo,
      com o estilo padrão.
- [x] `Alt`+clique (sem arrastar) num nó de texto alterna entre simples e código;
      `Alt`+arrastar do mesmo nó até outro continua conectando, sem regressão.
- [x] `Alt`+clique num nó de forma ou ícone não faz nada — mesmo comportamento de
      antes desta entrega.

## Questões em aberto

- [ ] Estilo da ponta: hoje é sempre uma seta cheia (o mesmo triângulo, dobrado nas
      duas pontas quando bidirecional). Ponta aberta, ou variação por tipo de
      relação, fica para quando houver pedido.
- [ ] Roteamento ortogonal como opção por aresta, mais adiante — vira campo no
      documento e `schemaVersion` novo.
