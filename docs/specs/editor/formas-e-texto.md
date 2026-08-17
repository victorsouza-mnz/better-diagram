# Spec: Formas, texto e edição de rótulo

**Domínio:** editor  
**Status:** ready

## Objetivo

Criar caixas e textos pela interface, e escrever o rótulo de qualquer elemento. Hoje
o modelo já tem as três variantes de nó e o caso de uso de criar forma existe — mas
não há como alcançá-los, então o app só monta diagrama de logos soltos.

## Não-objetivos

- **Cor livre e fonte.** Preenchimento/contorno de forma (três aparências fixas) já
  existe — ver "Estilo de preenchimento e contorno" abaixo. Cor à escolha e fonte
  continuam de fora: são design system, não um preset fechado, e ainda não têm spec.
- **Texto rico**: negrito por trecho, tamanhos diferentes na mesma caixa, links.
  Rótulo é texto simples com quebras de linha.
- **Fixar a ferramenta** para criar várias formas em sequência sem reselecionar.
- Alinhamento do texto configurável — por ora, centralizado na forma e abaixo do
  ícone.

## Contexto

O `NodeContent` já é uma união de três variantes e `AddShapeNode` já existe, testado.
O que falta é interação: uma barra de ferramentas, o gesto de criar, e um editor de
texto no lugar.

O rótulo é **o mesmo campo** nas três variantes: `label` do nó. Num nó de texto ele é
o conteúdo visível; numa forma, o texto dentro dela; num ícone, a legenda embaixo.
Um campo só significa um editor só, e nenhuma regra de "qual texto é qual".

## Comportamento esperado

- A barra de ferramentas oferece selecionar, retângulo, elipse, losango, texto,
  caixa de classe UML e caixa de pacote UML.
- Com uma ferramenta de forma ativa, arrastar no vazio desenha a forma no tamanho
  arrastado; um clique simples cria no tamanho padrão.
- A ferramenta volta para "selecionar" assim que o elemento é criado.
- Duplo clique em qualquer nó abre a edição do rótulo no lugar.
- O texto quebra em várias linhas, dentro da largura do elemento.
- Caixa de classe UML desenha três compartimentos (nome / atributos / métodos),
  separados por linha em branco no rótulo — ver "Caixa de classe UML" abaixo.
- Caixa de pacote UML desenha uma aba no canto superior esquerdo — ver "Caixa de
  pacote UML" abaixo.
- Ao final da barra, um botão **"+"** é um placeholder de extensibilidade: clicar
  mostra um alerta "ainda não implementado", não faz nada além disso — ver
  "Extensibilidade da barra (placeholder)" abaixo.
- As mesmas cinco formas também aparecem na seção "Geometria" da paleta lateral
  esquerda, arrastáveis pro canvas — mesmo gesto que já existia pra ícone. Ver
  "Geometria na paleta" abaixo.

## Fluxo do usuário

1. Aperta `R` (ou clica na ferramenta de retângulo).
2. Arrasta no canvas: aparece a prévia da caixa no tamanho que está sendo definido.
3. Solta: a caixa é criada, já selecionada, e a ferramenta volta para selecionar.
4. Dá duplo clique na caixa: o cursor entra no texto.
5. Digita "API Gateway", `Enter`, "(Kong)" — duas linhas.
6. Aperta `Esc`: o rótulo é gravado.

Alternativos:

- `Esc` durante o arrasto de criação: nada é criado.
- Ferramenta de texto: um clique cria o nó **já em edição** — a pessoa não precisa
  digitar nada para o nó existir; sai da edição sem escrever e ele fica, com um
  placeholder, do mesmo jeito que uma forma sem rótulo fica com a caixa vazia.
- Sair da edição com o texto vazio, num nó de **texto**: o nó **continua existindo**
  — mesma regra de forma e ícone com rótulo vazio. Um contorno tracejado com a dica
  "Texto" (ver Estados de UI) o mantém achável e selecionável.

## Interação no canvas

- **Criar por arrasto:** `pointerdown` no vazio com ferramenta de forma ativa →
  prévia seguindo o cursor → `pointerup` cria.
- **Criar por clique:** deslocamento menor que o mínimo (~5px) cria no tamanho
  padrão, em vez de criar uma forma de 2px que ninguém consegue pegar depois.
- **Editar:** duplo clique no nó, ou `Enter` com exatamente um nó selecionado.
- **Dentro da edição:** `Enter` quebra linha; `Esc` ou clicar fora **gravam**. É a
  convenção dos editores de canvas — e rótulo de diagrama quebra linha com
  frequência, então `Enter` gravando seria o atalho errado no gesto mais comum.
- **Atalhos:** `V` selecionar · `R` retângulo · `O` elipse · `D` losango ·
  `T` texto · `C` caixa de classe UML · `P` caixa de pacote UML · `Esc` volta para
  selecionar. Apertar a tecla é um toque, não precisa ficar segurada: a ferramenta
  fica armada até o próximo clique+arrasto criar o elemento, ou até `Esc`.
- **Iniciar o arrasto de um ícone da paleta cancela a ferramenta de forma ativa**,
  voltando para "selecionar" — as duas formas de criar nó (desenhar vs. soltar um
  logo) não ficam armadas ao mesmo tempo. Sem isso, um clique no canvas logo depois
  de soltar o ícone desenharia uma forma que ninguém pediu.
- **Undo:** criar é uma entrada ("Adicionar forma" / "Adicionar texto"). Editar
  rótulo é **uma** entrada ("Renomear"), gravada ao sair da edição — nunca uma por
  tecla digitada.

## Regras de negócio

- A ferramenta ativa é **estado de sessão**: não entra no documento, não entra no
  histórico.
- Elemento criado nasce **selecionado**. É quase sempre o que se vai mexer em
  seguida.
- Forma criada por arrasto respeita o retângulo arrastado, em qualquer direção
  (arrastar para cima e para a esquerda também vale).
- **Largura e altura são sempre positivas** — o agregado recusa o contrário. O
  arrasto normaliza antes de criar.
- Nó de **texto**: largura E altura são da pessoa — nasce com um tamanho padrão e
  muda pelas alças de redimensionar (spec [`redimensionar.md`](redimensionar.md)),
  igual a uma forma. A única trava é um PISO na altura: nunca fica menor que o
  necessário para as linhas que o rótulo forma na largura atual — recalculado tanto
  ao editar o rótulo quanto, ao vivo, durante o próprio arrasto de uma alça. Esticar
  além do piso é livre; é esse espaço sobrando que o alinhamento vertical (spec
  [`painel-propriedades.md`](../ui/painel-propriedades.md)) usa para decidir onde o
  texto senta. Nas outras variantes (forma, ícone), a caixa já existe e o texto se
  acomoda dentro dela — não é ela que muda de tamanho.
- Editar rótulo com vários nós selecionados não faz nada — não há qual editar.

## Estados de UI

- Ferramenta ativa destacada na barra; cursor vira cruz no canvas.
- Criando: prévia tracejada do tamanho que está sendo arrastado.
- Editando: o texto do nó some e dá lugar ao editor, alinhado exatamente sobre ele,
  para não haver "pulo" ao entrar e sair.
- Vazio: forma sem rótulo é uma caixa vazia — legítimo. Nó de texto sem rótulo
  mostra um contorno tracejado com a dica "Texto", centralizada — sem isso ele seria
  uma área em branco indistinguível do canvas vazio.
- Erro: não se aplica.

## Quebra de linha

`<text>` do SVG **não quebra linha sozinho**: a quebra é calculada e vira `<tspan>`.
`foreignObject` resolveria em uma linha de código e está descartado — ele atrapalha
no export para SVG, que é uma etapa da fila.

O algoritmo de quebra é uma **função pura** que recebe a função de medir como
parâmetro:

```ts
wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[]
```

Assim a regra de quebra é testável em Node com um medidor falso (ex.: 7px por
caractere), e a medição real — que depende de fonte e de canvas — fica na
apresentação. Testar quebra de linha sem browser é o que torna esse código confiável;
com browser, ninguém testa.

Regras: quebra por espaço; palavra maior que a largura é cortada no meio (senão ela
vaza para fora da caixa); quebras explícitas do usuário (`Enter`) são respeitadas.

## Caixa de classe UML

Notação padrão de classe em diagrama de classes UML: um retângulo com três
compartimentos empilhados — nome, atributos, operações — separados por uma linha.
Não é um ícone (a paleta não tem "Classe" — ver `assets/catalogo-e-logos.md`): é uma
`ShapeKind` a mais, `"umlClass"`, irmã de `rect`/`ellipse`/`diamond`. Ganha de graça
tudo que já vale para forma — redimensionar livre, arrastar, conectar, undo,
persistência — só o DESENHO é diferente.

**Os três compartimentos vêm do `label`, não de um campo estruturado novo.** Uma
linha em branco separa nome de atributos, e outra separa atributos de operações —
o mesmo texto simples que qualquer forma já guardava, só que este desenho o
interpreta em três pedaços:

```
NomeDaClasse

+atributo: tipo

+metodo()
```

Mais de duas linhas em branco não cria um quarto compartimento — tudo depois da
segunda quebra vira parte das operações. Menos de duas quebras: os compartimentos
que faltam ficam vazios (uma caixa só com o nome, por exemplo, é legítima).

- **Nasce com um exemplo preenchido**, não em branco: uma caixa vazia não tem como
  a pessoa adivinhar que uma linha em branco separa os campos. O exemplo mostra a
  convenção; a pessoa edita por cima.
- **Nome centralizado e em negrito**; atributos e operações alinhados à
  ESQUERDA — é como toda notação de classe UML desenha uma lista de membros, nunca
  centralizada.
- **A altura de cada compartimento vem só do que ele contém** — não é esticada para
  preencher a caixa nem encolhida para caber nela. Uma caixa redimensionada maior
  que o conteúdo sobra em branco embaixo do último compartimento; menor, o texto
  vaza por baixo — mesma regra de "sem corte automático" que já vale pra forma
  comum com texto demais.
- **Cantos retos, não arredondados** — única forma nesta lista que não arredonda; é
  o que distingue a caixa de classe de um retângulo comum ao olhar de longe.

## Caixa de pacote UML

Notação padrão de pacote em diagrama UML: um retângulo com uma aba menor no canto
superior esquerdo — a mesma "aba de pasta" que já existia como ÍCONE estático antes
desta entrega. Não é um ícone (a paleta não tem mais "Pacote" — ver
`assets/catalogo-e-logos.md`): é uma `ShapeKind` a mais, `"umlPackage"`, irmã de
`rect`/`ellipse`/`diamond`/`umlClass`. Ganha de graça tudo que já vale para forma —
redimensionar livre, arrastar, conectar, undo, persistência — só o CONTORNO é
diferente.

- **Sem compartimento — ao contrário da classe.** O rótulo é texto simples,
  centralizado no corpo da caixa, mesma regra de `rect`/`ellipse`/`diamond`. Um
  pacote de arquitetura representa um módulo ou um limite lógico, não uma lista de
  membros — não há convenção nenhuma pra codificar no texto, então não há nada a
  interpretar em pedaços.
- **Nasce vazio**, ao contrário da classe: sem convenção de campos separados por
  linha em branco, não há exemplo nenhum que valha a pena pré-preencher.
- **Cantos retos, não arredondados** — mesma razão da classe: notação UML não
  arredonda, e a única forma que arredondasse quebraria a leitura "isto é notação
  UML" ao olhar de longe.
- **A aba escala com a caixa, com um teto.** Largura da aba: até 45% da largura da
  caixa, no máximo 64px. Altura da aba: até 30% da altura da caixa, no máximo 22px.
  Sem o teto, uma caixa bem larga ou bem alta desenharia uma aba desproporcional
  (uma "meia caixa" em vez de uma aba pequena) — os dois `Math.min` mantêm a aba
  sempre reconhecível como aba, em qualquer tamanho que a pessoa redimensionar.

## Geometria na paleta

As cinco formas (`rect`, `ellipse`, `diamond`, `umlClass`, `umlPackage`) também
aparecem na paleta lateral esquerda, numa seção **"Geometria"** — arrastáveis pro
canvas, o mesmo gesto que já existia pra ícone. Não substitui a barra de
ferramentas (continua existindo, com os atalhos de sempre — ver "Extensibilidade da
barra" abaixo): são dois CAMINHOS pro mesmo resultado, e a redundância é aceita de
propósito.

### Por que a paleta divide em "Geometria" e "Ícones"

A pergunta que a divisão responde é **"como isto escala ao redimensionar?"**, não
"de onde vem o desenho":

- **Ícone preserva proporção.** `preservesAspectRatio(content)` (`NodeContent.ts`)
  já modelava isso no domínio antes desta entrega — arrastar uma alça de um logo
  mantém largura/altura no mesmo fator, porque um logo esticado é a marca de outra
  empresa deformada.
- **Forma escala livre.** As duas dimensões mudam independentes; caixa de classe
  reflui o texto entre compartimentos; caixa de pacote redesenha a aba proporcional
  (ver "Caixa de pacote UML" acima).

A REGRA já existia; o que faltava era torná-la visível ANTES do arrasto, não só
depois de a pessoa notar o resultado. Duas seções na paleta são a MESMA informação
que `preservesAspectRatio` já carregava, só que na hora que importa decidir.

**Notação básica de UML (ator, interface, nota, componente) é ícone, não
geometria** — vive na seção "Ícones", com uma etiqueta "UML" na pré-visualização
pra continuar achável como notação (ver `assets/catalogo-e-logos.md`, que é quem
documenta o catálogo de ícones). Só Classe e Pacote são geometria — os dois
precisam do resize livre que só forma tem (compartimento reflui, aba escala).

**Classe e Pacote também são notação UML, só que geometria — e carregam a MESMA
etiqueta.** `GeometryEntry.uml` (`geometryCatalog.ts`) marca as duas; o NOME delas
na paleta não leva mais o sufixo ("Classe", "Pacote", não "Classe UML"/"Pacote
UML") — é a etiqueta quem avisa, exatamente como já valia pro ícone. A barra de
ferramentas continua dizendo o nome por extenso (`SHAPE_LABEL`, em
`shapeGlyphs.ts`, ainda tem `"Classe UML"`/`"Pacote UML"` — só a paleta usa o nome
curto): o botão da barra tem espaço de sobra pro nome inteiro no `title`; o item de
28px da grade não, e a etiqueta já preenche esse papel ali.

### A busca mantém as duas seções — nunca achata

Buscar um termo filtra os dois catálogos (`session.catalog.search()` pra ícone,
`searchGeometry()` pra forma) e continua mostrando "Geometria" e "Ícones" como
cabeçalhos separados — ao contrário de outras buscas deste app (a da paleta, antes
desta entrega, achatava a lista). Aqui achatar esconderia exatamente a informação
que a pessoa mais precisa no momento da escolha: **qual dos dois resultados
escala como ela espera**. Buscar "uml", por exemplo, devolve Classe e Pacote em
"Geometria" (batem no `keywords: ["uml"]` de cada entrada) E os quatro ícones de
notação em "Ícones" (com a etiqueta) — a pessoa vê os dois tipos de resultado e
escolhe sabendo qual escala como o quê.

Uma seção sem nenhum resultado simplesmente não aparece (mesma regra de sempre —
`GeometryGroup`/`IconGroup` devolvem `null` se a lista está vazia); as duas vazias
mostram "Nada com esse nome."

### O mecanismo de arrasto

`presentation/palette/Palette.tsx` trata os dois grupos com a MESMA mecânica de
arrasto (fantasma seguindo o cursor, teste de "soltou dentro do canvas", conversão
pra coordenada de mundo — extraída em `beginPaletteDrag`, compartilhada) e só
diverge no que acontece ao soltar:

- Ícone: `session.actions.addIcon(slug, at)` — assíncrono (hash do asset).
- Geometria: `session.actions.addShapeAt(shape, at)` — síncrono, cria a forma
  centrada no ponto onde soltou, no tamanho padrão de sempre (`shapeDefaults`,
  compartilhado com `endCreate` — a mesma função decide o tamanho e o rótulo
  inicial não importa se a forma nasceu de um clique na barra ou de um arrasto da
  paleta).

**Soltar uma geometria NÃO força a seleção pro nó novo** — mesma regra de soltar um
ícone (`addIcon` também não seleciona). É o mesmo gesto (arrastar da paleta,
soltar no canvas) nos dois grupos; se um selecionasse e o outro não, a pessoa
aprenderia uma regra por grupo à toa. Isso DIFERE de criar pela barra de
ferramentas (`endCreate`), que seleciona — são gestos diferentes (arrastar vs.
clicar+posicionar), com resultado consistente dentro de cada um, não entre os
dois.

## Extensibilidade da barra (placeholder)

Um botão **"+"** ao final da barra de ferramentas, separado das ferramentas fixas
por um divisor visual. Clicar mostra `window.alert("Adicionar atalho: ainda não
implementado.")` — não cria nada, não abre formulário nenhum.

É intencionalmente um gancho sem função ainda: a barra vai crescer (mais notação
UML, mais formas) e cada entrega nova hoje significa mexer em `Toolbar.tsx` e nos
atalhos fixos. O botão marca ONDE a extensibilidade vai entrar quando a próxima
decisão de produto (cadastrar atalho próprio? escolher de uma lista maior?)
estiver tomada — sem fingir que a função já existe, e sem deixar a barra muda sobre
o que vem a seguir.

## O editor de rótulo

Um elemento HTML posicionado **sobre** o canvas, não um `foreignObject`:

- Fica no espaço de tela, alinhado ao nó pela mesma transformação de viewport.
- É um campo de texto de verdade: foco, seleção, IME, atalhos do sistema.
- Enquanto ele está aberto, os atalhos do editor não valem (o guard de digitação já
  existe, do undo/redo).

## Formato de texto: simples ou código

Um nó de **texto** (só ele — forma e ícone não têm) pode ser marcado como "código":
o rótulo passa a ser desenhado em fonte monoespaçada com destaque mínimo de sintaxe
JS (palavra-chave, string, comentário de linha, número). Três jeitos de ligar:

- O botão "Formato" no painel de propriedades — ver
  [`painel-propriedades.md`](../ui/painel-propriedades.md) para o controle.
- **`Ctrl`+clique direto no nó** (`Cmd` no Mac): alterna entre simples e código sem
  abrir o painel, sem selecionar — o MESMO gatilho que forma (`CycleShapeStyle`) e
  aresta (`CycleEdgeStyle`) já usam para ciclar o próprio estilo. É o caminho
  recomendado: um atalho só, consistente nos três tipos de elemento que têm
  "estilo".
- **`Alt`+clique direto no nó** (sem arrastar): faz a MESMA coisa. É o gesto mais
  antigo dos dois — reaproveita o `Alt`+arrasto que já existia para conectar
  (`Alt`+clique é a versão sem deslocamento dele; ver `editor/conectar-nos.md`,
  seção "Alt+clique reaproveitado num nó de texto") — e continua funcionando, não
  foi removido quando `Ctrl`+clique chegou. `Alt`+arrastar até OUTRO nó continua
  conectando normalmente, mesmo a partir de um nó de texto — só o clique parado é
  que muda de sentido.

Os dois atalhos de clique chamam o MESMO caso de uso (`CycleTextFormat`) por baixo,
então nunca divergem — ciclar por um e checar pelo outro (ou pelo painel) sempre
mostra o estado certo. Nas outras variantes (forma, ícone), nem `Alt`+clique nem
`Ctrl`+clique têm esse efeito — em forma, `Ctrl`+clique cicla o ESTILO DA FORMA
(seção acima), não o formato de texto, que ela nem tem.

Esta seção descreve o que o formato MUDA no desenho e na edição do nó de texto.

- **"Mínimo" é decisão de produto, não limitação técnica.** O rótulo de um nó é um
  trecho curto pra ilustrar um diagrama, não um arquivo fonte — cobrir template
  string aninhada, regex literal ou JSX corretamente pediria um parser de verdade
  (AST) por um ganho que ninguém nota num diagrama. O tokenizador é uma regex só
  (`jsHighlight.ts`), função pura, sem noção de escopo.
- **Código força alinhamento horizontal à esquerda**, ignorando o que estiver
  escolhido no painel — é a convenção de todo editor de código, e o desenho por
  token (cada palavra colorida é um `<tspan>` próprio, só o primeiro da linha carrega
  `x`) não teria posição previsível centralizado ou à direita sem medir a linha
  inteira de novo. O alinhamento VERTICAL continua funcionando normalmente — só o
  eixo horizontal é a exceção.
- **A quebra de linha usa a fonte monoespaçada para medir**, não a fonte padrão — a
  largura por caractere é diferente, e medir com a fonte errada vaza o texto da
  caixa (mesma função `textHeightFor`/`measureAt` de sempre, agora aceitando a
  família de fonte como parâmetro).
- **O destaque aparece AO VIVO, durante a digitação** — não só depois de sair da
  edição. Isso exige uma técnica diferente do editor de texto simples: o
  `<textarea>` continua a única fonte de foco/seleção/cursor/IME, mas o texto real
  dele é invisível (`color: transparent`) e um `<div>` por baixo, com a mesma fonte,
  padding e altura de linha, pixel a pixel, desenha o texto colorido por token — o
  `<textarea>` só entrega o cursor piscando (`caret-color`) por cima. Os dois rolam
  juntos (`scrollTop` sincronizado) quando o texto passa da altura visível da caixa.
  A alternativa mais simples — destacar só ao sair da edição — foi considerada e
  descartada: digitar um trecho de código sem ver a cor até terminar tira a única
  vantagem de ligar o modo código.

## Estilo de preenchimento e contorno

Um nó de **forma** (`rect`, `ellipse`, `diamond`, `umlClass`, `umlPackage` — não
ícone, não texto) tem três aparências: **preenchida** (fundo sólido — o visual de
sempre), **contorno** (só a borda, sem fundo) e **tracejada** (só a borda,
tracejada). Não são dois eixos independentes (preenchido × tracejado) — "tracejada
com fundo" nunca foi pedida, e as três aparências são um CICLO fechado, não um
cruzamento de opções. Dois jeitos de trocar:

- O grupo "Estilo da forma" no painel de propriedades — ver
  [`painel-propriedades.md`](../ui/painel-propriedades.md) para o controle.
- **`Ctrl`+clique direto na forma** (`Cmd` no Mac): avança um passo no ciclo
  (preenchida → contorno → tracejada → volta), sem abrir o painel e **sem
  selecionar** — mesmo gesto e mesma não-seleção que já vale para `Ctrl`+clique numa
  aresta (`conectar-nos.md`, "O ciclo de estilo"). Em ícone ou texto, `Ctrl`+clique
  não faz nada — nenhuma das duas variantes tem preenchimento/contorno próprio.

A caixa de classe e a caixa de pacote (que são `ShapeKind`, não um `kind` à parte —
ver "Caixa de classe UML"/"Caixa de pacote UML" acima) têm a MESMA propriedade: o
estilo se aplica ao contorno externo da caixa; os divisores internos da classe
continuam sólidos, sempre — só o contorno/fundo do retângulo (ou dos dois retângulos
adjacentes do pacote) muda.

## Modelagem de domínio

Nada novo no agregado. `SetNodeLabel` e `AddShapeNode` já existem.

- **Caso de uso novo:** `AddTextNode`.
- **`ResizeNode`** passa a ser usado tanto pela alça (largura, gesto do usuário)
  quanto pelo fim da edição de rótulo (altura, derivada do texto) — ver
  [`redimensionar.md`](redimensionar.md) para a regra completa da alça em nó de
  texto.
- **`ShapeKind`** ganha `"umlClass"` e `"umlPackage"` — mesmo tipo, dois valores a
  mais, não um `kind` de `NodeContent` novo (`NodeContent.ts`).
- **`AddShapeNode.execute`** ganha um `label` opcional (default `""`, o de sempre) —
  é o que permite a caixa de classe nascer com o exemplo preenchido sem virar um
  segundo caso de uso ou uma segunda entrada de undo. Pacote não usa esse parâmetro
  (nasce vazio, como forma comum) — o parâmetro existe pela classe, o pacote só se
  aproveita dele já existir.
- Nenhum invariante novo.
- **`shapeDefaults(shape)`**, em `useEditorSession.ts` — tamanho e rótulo inicial
  de uma forma nova, extraído de dentro de `endCreate` pra ser reaproveitado por
  `addShapeAt` (arrasto da paleta) sem duplicar o `if` de caixa de classe duas
  vezes. Não é caso de uso nem domínio — é a MESMA decisão de sempre
  (`DEFAULT_SHAPE_SIZE`/`DEFAULT_UML_CLASS_SIZE`/`UML_CLASS_TEMPLATE`, já em
  `application/editing.ts`), só isolada de onde é chamada duas vezes agora.
- **`GeometryEntry`/`searchGeometry`**, em `presentation/palette/geometryCatalog.ts`
  — lista estática das cinco formas com nome, atalho e sinônimo de busca, e a
  função pura de filtro. Não é domínio nem aplicação: geometria não tem invariante
  próprio além do que `ShapeKind`/`AddShapeNode` já garantem: é dado de UI puro,
  testável isolado pela mesma razão que os catálogos de ícone são (`SimpleIconsCatalog`
  etc.) — mas sem a complexidade de asset/sanitização que eles têm, porque forma não
  tem asset.
- **Tipo novo:** `ShapeStyle` — `"filled" | "outlined" | "dashed"`. Arquivo próprio
  (`domain/diagram/ShapeStyle.ts`), mesmo formato de `TextFormat.ts`: um `DEFAULT_
  SHAPE_STYLE` exportado e `nextShapeStyle(current)`, testado isoladamente, a ÚNICA
  fonte da ordem do ciclo.
- **`NodeContent`** ganha o campo na variante de forma:
  `{ kind: "shape"; shape: ShapeKind; style: ShapeStyle }`. `shapeContent()` passa a
  aceitar `style` como segundo parâmetro opcional, padrão `"filled"`.
- **`DiagramNode.withShapeStyle(style)`** e **`Diagram.setShapeStyle(id, style)`** —
  mesmo formato de `withTextFormat`/`setTextFormat`. Lança `NotAShapeNode` (novo em
  `errors.ts`) se `content.kind !== "shape"`.
- **Casos de uso novos:** `SetShapeStyle` (escolha direta, painel) e
  `CycleShapeStyle` (avança um passo, `Ctrl`+clique) — mesmo par de
  `SetEdgeStyle`/`CycleEdgeStyle`, em `application/editing.ts`.

## Impacto no documento

- Campos: nenhum novo. `content.kind === "shape" | "text"` e `label` já existem no
  v1, e o codec já os lê e escreve. `content.shape` ganha `"umlClass"` e
  `"umlPackage"` como valores válidos a mais — mesmo campo, mesmo tipo (`string`,
  validado por allowlist no codec), só mais duas entradas aceitas.
- `schemaVersion`: **não sobe** — mesma lógica de qualquer valor novo numa allowlist
  já existente (`SHAPES`, em `document/codec.ts`): documento salvo antes de
  `"umlClass"`/`"umlPackage"` existirem não é afetado; documento novo com um deles
  só não abriria numa versão bem mais antiga do app, que já recusaria com erro claro
  ("shape desconhecido"), nunca com corrupção silenciosa.
- Quebras de linha vão no próprio `label`, como `\n` — não viram campo novo. Os
  compartimentos da caixa de classe também: são a MESMA string, com linhas em
  branco como separador — não um `label` estruturado.
- **Formato de texto** (`content.format`, "plain" | "código") é um campo aditivo a
  mais dentro da variante `text` de `content` — mesmo tratamento de `align`
  (modelagem completa em [`painel-propriedades.md`](../ui/painel-propriedades.md),
  onde mora o controle que muda o campo): padrão `"plain"`, `schemaVersion` não sobe,
  documento salvo antes do campo existir abre como texto simples.
- **Estilo de forma** (`content.style`, `"filled" | "outlined" | "dashed"`) é um
  campo aditivo a mais dentro da variante `shape` de `content`. `schemaVersion` não
  sobe: padrão `"filled"` é o visual de sempre, documento salvo antes do campo
  existir abre preenchido, e um valor desconhecido (documento adulterado, ou de uma
  versão futura com mais aparências) cai no mesmo padrão em vez de recusar o
  documento — mesma tolerância já usada em `format`/`align`.

## Impacto por camada

- `domain/`: `NodeContent.ts` (`ShapeKind` ganha `"umlClass"` e `"umlPackage"`;
  variante `shape` ganha `style`); `ShapeStyle.ts` (tipo + ciclo); `Node.ts`
  (`withShapeStyle`); `Diagram.ts` (`setShapeStyle`); `errors.ts` (`NotAShapeNode`).
- `application/`: `AddTextNode`; `AddShapeNode` ganha o `label` opcional;
  `DEFAULT_UML_CLASS_SIZE` e `UML_CLASS_TEMPLATE` em `editing.ts`. Pacote não ganha
  constante própria — reaproveita `DEFAULT_SHAPE_SIZE`, mesmo tamanho de
  retângulo/elipse/losango. `SetShapeStyle`/`CycleShapeStyle`, também em
  `editing.ts`.
- `infrastructure/`: `UmlIconCatalog.ts` perde a entrada `uml-package` (o ícone
  estático saiu, virou forma).
- `presentation/`: barra de ferramentas (`Toolbar.tsx`, tool `umlPackage` e atalho
  `P` em `useEditorSession.ts`/`DiagramCanvas.tsx`), ferramenta ativa, gesto de
  criação, editor de rótulo sobreposto, `wrapText` + o medidor, render em `<tspan>`.
  Caixa de classe: `NodeView.tsx` (canto reto), `NodeLabel.tsx` (`UmlClassBody` —
  separa o `label` em três, desenha os divisores e cada compartimento). Caixa de
  pacote: `NodeView.tsx` só (dois `<rect>` adjacentes — aba e corpo; o rótulo cai no
  ramo genérico de `NodeLabel.tsx`, sem componente próprio). Modo código:
  `canvas/jsHighlight.ts` (tokenizador puro), `NodeLabel.tsx` (ramo de desenho com um
  `<tspan>` colorido por token), `LabelEditor.tsx` (o `<div>` de fundo colorido por
  trás do `<textarea>` transparente), `measureText.ts` (`MONO_FONT_FAMILY`, medidor
  e `textHeightFor` aceitando a família de fonte). `Alt`+clique reaproveita
  `useEditorSession.endConnect` — nenhum listener novo (ver `conectar-nos.md`).
  `Ctrl`+clique é um `useCallback` próprio (`cycleTextFormat`, em
  `useEditorSession.ts`) chamado do MESMO bloco do `onPointerDown` do nó em
  `DiagramCanvas.tsx` que já trata `Ctrl`+clique em forma — os dois `if` vizinhos,
  não dois listeners separados.
  Geometria na paleta: `presentation/palette/geometryCatalog.ts` (dado + busca),
  `presentation/shapeGlyphs.ts` (glifo/rótulo/atalho — fonte única com
  `Toolbar.tsx`), `palette/Palette.tsx` (renomeado de `IconPalette.tsx` — agora
  desenha os dois grupos e a mecânica de arrasto compartilhada,
  `beginPaletteDrag`), `useEditorSession.ts` (`addShapeAt`, `shapeDefaults`
  compartilhado com `endCreate`). Estilo de forma: `NodeView.tsx` (`style` vira
  classe modificadora — `node-shape--outlined`/`--dashed` — em cima da MESMA
  `.node-shape` de sempre, nunca um desenho à parte), `DiagramCanvas.tsx`
  (`Ctrl`+clique numa forma, no `onPointerDown` do nó — mesmo bloco que já trata
  `Alt`), `styles.css` (as duas classes modificadoras).
- Performance: a quebra de linha é recalculada por render de nó. Se pesar, memoiza
  por (texto, largura) — não antes.

## Restrições de implementação (guardrails)

- **Nada de `foreignObject`.**
- A quebra de linha não pode depender do DOM: função pura + medidor injetado.
- O editor grava **uma** entrada de histórico ao sair, não uma por tecla.
- Criar passa pelo caso de uso e pelo ponto único de commit.
- Arrasto de criação é estado de sessão até soltar — como todo arrasto aqui.

## Critérios de aceite

- [ ] `R` + arrasto cria um retângulo do tamanho arrastado; um clique cria no
      tamanho padrão.
- [ ] Arrastar para cima e para a esquerda cria a forma corretamente.
- [ ] Elipse e losango funcionam pelos mesmos gestos.
- [ ] A ferramenta volta para "selecionar" depois de criar.
- [ ] `Esc` durante o arrasto de criação não cria nada.
- [ ] `T` + clique cria um nó de texto já em edição.
- [ ] Sair da edição com texto vazio **não remove** o nó de texto — mostra o
      contorno tracejado com a dica "Texto", igual forma e ícone com rótulo vazio.
- [ ] Duplo clique numa forma, num texto e num ícone abre a edição nos três.
- [ ] `Enter` quebra linha; `Esc` grava.
- [ ] Um rótulo longo quebra em várias linhas dentro da largura do elemento —
      inclusive no nó de texto, pela largura da caixa, não só por `Enter`.
- [ ] Arrastar a alça leste de um nó de texto muda a largura e, ao vivo (sem soltar
      o mouse), reflui o número de linhas e a altura — nunca "corrige" só ao soltar.
- [ ] Editar um rótulo inteiro é **uma** entrada de undo.
- [ ] Digitar no editor não dispara os atalhos do canvas (`Delete`, `Ctrl+Z`).
- [ ] O texto sobrevive à recarga e ao export/import.
- [x] `C` + clique cria uma caixa de classe UML com o exemplo preenchido, três
      compartimentos visíveis, cantos retos.
- [x] Editar o rótulo com "Nome\n\nAtributo\n\nMétodo" desenha nome centralizado em
      negrito, atributo e método alinhados à esquerda, dois divisores.
- [x] Redimensionar a caixa de classe é livre (largura e altura), como uma forma —
      sem piso de conteúdo (esse piso é só do nó de texto).
- [x] A caixa de classe sobrevive à recarga, com o `shape: "umlClass"` e o texto dos
      três compartimentos intactos.
- [x] Ligar o formato "código" num nó de texto muda a fonte para monoespaçada e
      colore palavra-chave, string, comentário e número — nos dois lugares: o
      desenho final (`<tspan>`) e o fundo por trás do `<textarea>` durante a edição.
- [x] O destaque aparece AO VIVO: digitar uma palavra-chave, string ou comentário
      colore o trecho sem precisar sair da edição.
- [x] Alinhamento horizontal escolhido no painel não tem efeito visual em modo
      código — o texto fica sempre à esquerda; o vertical continua funcionando.
- [x] Um nó de texto em modo código com mais linhas do que a altura visível rola
      durante a digitação, e o fundo colorido acompanha a mesma rolagem do
      `<textarea>` — nunca desalinha.
- [x] Alternar de código para texto simples (e vice-versa) preserva o conteúdo do
      rótulo — só a apresentação muda.
- [x] O formato sobrevive à recarga e ao export/import; um documento salvo antes do
      campo existir abre como texto simples.
- [x] `Alt`+clique (sem arrastar) num nó de texto alterna o formato, igual ao botão
      do painel; `Alt`+arrastar do mesmo nó até outro continua conectando.
- [x] `Ctrl`+clique num nó de texto faz a MESMA troca que `Alt`+clique, sem
      selecionar o nó nem mudar a seleção que já existia.
- [x] `Alt`+clique num nó de forma ou ícone não faz nada; `Ctrl`+clique num ícone
      também não faz nada (em forma, cicla o estilo — seção acima).
- [x] `P` + clique cria uma caixa de pacote UML vazia, com a aba no canto superior
      esquerdo e cantos retos.
- [x] O rótulo de uma caixa de pacote é texto simples centralizado, sem
      compartimento — editar, redimensionar e o piso de altura seguem a mesma regra
      de `rect`/`ellipse`/`diamond`.
- [x] A caixa de pacote sobrevive à recarga, com o `shape: "umlPackage"` e o rótulo
      intactos.
- [x] O botão "+" ao final da barra mostra o alerta "ainda não implementado" e não
      cria, seleciona ou altera nada no documento.
- [x] A paleta mostra "Geometria" (cinco formas, mesma ordem da barra) e "Ícones"
      como seções separadas, com o campo de busca vazio.
- [x] Arrastar uma forma da paleta pro canvas cria o nó centrado no ponto onde
      soltou, no tamanho padrão — caixa de classe com o exemplo preenchido, as
      outras vazias — sem forçar seleção.
- [x] Buscar "uml" mostra Classe e Pacote em "Geometria" E os quatro ícones de
      notação (com a etiqueta "UML") em "Ícones" — as duas seções continuam
      visíveis e com cabeçalho, a busca nunca achata numa lista só.
- [x] Na seção "Geometria", os itens de Classe e Pacote mostram a etiqueta "UML"
      na pré-visualização e o nome SEM o sufixo ("Classe", "Pacote") — a barra de
      ferramentas continua dizendo "Classe UML"/"Pacote UML" por extenso.
- [x] Buscar um termo sem nenhuma forma correspondente esconde a seção "Geometria"
      inteira (não mostra vazia); o mesmo vale pra "Ícones".
- [x] Uma forma nasce preenchida; `Ctrl`+clique nela percorre preenchida → contorno
      → tracejada → volta, sem selecionar.
- [x] `Ctrl`+clique num ícone ou num nó de texto não faz nada.
- [x] O estilo de forma escolhido no painel e pelo `Ctrl`+clique ficam consistentes:
      o botão certo aparece destacado depois de qualquer um dos dois caminhos.
- [x] Um passo no ciclo (por `Ctrl`+clique ou pelo painel) é **uma** entrada de undo.
- [x] O estilo sobrevive à recarga e ao export/import; um documento salvo antes do
      campo existir abre preenchido.
- [x] Caixa de classe e caixa de pacote também aceitam os três estilos, aplicados ao
      contorno externo — os divisores internos da classe continuam sólidos.

## Questões em aberto

- [ ] Fixar a ferramenta (criar várias em sequência) — `Alt`+clique na ferramenta,
      ou um cadeado na barra?
- [ ] Alinhamento vertical do texto dentro da forma quando ele é menor que a caixa:
      centralizado sempre, ou topo?
- [ ] O que o botão "+" da barra vai realmente fazer — cadastrar um atalho de
      forma próprio, ou abrir uma lista maior de notação pra escolher e fixar?
      Decisão de produto ainda não tomada; até lá, ele só existe como gancho visual
      (ver "Extensibilidade da barra (placeholder)").
