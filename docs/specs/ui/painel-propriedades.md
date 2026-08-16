# Spec: Painel de propriedades lateral

**Domínio:** ui
**Status:** implemented

## Objetivo

Um painel lateral, à DIREITA do canvas, que mostra os controles do elemento
selecionado. Três controles hoje: formato (texto simples / código) e alinhamento
horizontal e vertical do rótulo de um nó de **texto** dentro da caixa, e
direção/traço de uma **aresta** selecionada. O painel é uma superfície que vai
crescer — mais controles (cor, borda) chegam depois, cada um com sua própria
entrega.

## Não-objetivos

- **Alinhamento em forma ou ícone.** As duas variantes continuam com o texto sempre
  centralizado (forma) ou sempre abaixo (ícone) — regra de `formas-e-texto.md`, que
  esta spec não mexe. Só o nó de texto ganha o controle.
- **Editar vários nós ou arestas de uma vez.** Igual às alças de redimensionar:
  seleção múltipla não mostra o painel — não há "o" alinhamento (ou "o" estilo) de
  um conjunto heterogêneo.
- **Atalho de teclado para os controles do painel.** Ver "Interação no canvas" — o
  Alt+clique da aresta é atalho DO CANVAS, não do painel, e continua existindo.

## Contexto

O nó de texto ganhou redimensionamento livre nesta mesma leva de mudanças —
[`redimensionar.md`](../editor/redimensionar.md) explica o piso de altura (nunca
menor que o conteúdo, mas pode esticar além dele). Antes disso, alinhamento não fazia
sentido nenhum: a caixa SEMPRE tinha exatamente o tamanho do texto, então "alinhar
dentro dela" não tinha espaço sobrando para significar alguma coisa. Redimensionar
sem alinhar deixaria uma caixa maior com o texto preso no centro, sem controle — o
alinhamento é o que dá função ao espaço extra que esticar a caixa cria.

Hoje a seleção já existe (`Selection`, em `application/`), o painel só precisa ler
o que já está selecionado — nenhum estado novo de "o que está selecionado" nasce
aqui, só um novo consumidor dele.

## Comportamento esperado

- Com **exatamente um** nó ou aresta selecionado, um painel de **240px fixos**
  aparece à direita do canvas, colado na borda — mesma largura da paleta de ícones à
  esquerda, por simetria. Não é redimensionável pela pessoa.
- Com zero ou mais de um elemento selecionado, o painel não ocupa espaço nenhum — a
  área da direita não existe, o canvas usa a largura toda. Não é um painel vazio
  visível; é ausente.
- Dentro do painel, o conteúdo depende do que está selecionado:
  - **Nó de texto:** um grupo de dois botões — formato (texto simples / código,
    "Formato", ver [`formas-e-texto.md`](../editor/formas-e-texto.md) para o que o
    código muda no desenho) — seguido de dois grupos de alinhamento: horizontal
    (esquerda / centro / direita) e vertical (topo / meio / baixo). Em modo código, o
    grupo horizontal **some** — o alinhamento naquele eixo é sempre à esquerda nesse
    modo, e mostrar botões que não fazem nada seria um controle mentindo. O grupo
    vertical continua, porque ele continua valendo.
  - **Aresta:** dois grupos de dois botões — direção (unidirecional / bidirecional)
    e traço (sólido / tracejado). Os mesmos dois eixos independentes que o
    Alt+clique já cicla (`EdgeStyle`) — o painel só troca o gesto de "ciclar" por
    "escolher direto".
  - **Qualquer outro item selecionado** (forma, ícone): o painel aparece, mas mostra
    uma frase — "Nada para configurar neste elemento." Não é um bug nem um estado
    transitório: é o painel dizendo que, hoje, aquele tipo ainda não tem controle
    nenhum. A condição de quando mostrar o quê só cresce conforme mais controles
    entram (mesmo raciocínio de `formas-e-texto.md` sobre a ferramenta ativa ser
    estado de sessão: cada entrega futura só acrescenta um `case`, não redesenha o
    painel).
  - Em todo grupo, o botão do valor atual fica destacado — mesma cor de "ativo" já
    usada na ferramenta selecionada da barra superior (fundo tingido de `--accent`),
    reaproveitada, não uma nova convenção por campo.
- Clicar um botão do painel aplica IMEDIATAMENTE — não tem confirmar/cancelar.

## Fluxo do usuário

1. Cria um nó de texto, digita "Status: operacional".
2. Arrasta a alça sul para baixo, alargando a caixa bem além do texto.
3. Seleciona o nó (já está, ao sair da edição) — o painel aparece à direita com os
   dois grupos de alinhamento.
4. Clica no botão "baixo" do grupo vertical: o texto desce e encosta no fundo da
   caixa.
5. Clica no botão "direita" do grupo horizontal: o texto desloca para o canto
   inferior direito.

Alternativos:

- Seleciona um retângulo: o painel aparece com "Nada para configurar neste
  elemento".
- Seleciona uma aresta: o painel mostra direção e traço. Clica "bidirecional": a
  ponta que faltava aparece. Clica "tracejado": o traço muda — cada clique, uma
  entrada de undo.
- `Alt`+clique na mesma aresta: cicla para o próximo dos 4 combos — o painel
  re-renderiza com os botões certos destacados, porque lê o mesmo `edge.style` que
  o clique no canvas acabou de mudar.
- Seleciona dois nós: o painel some.
- `Esc` limpa a seleção: o painel some junto — é a mesma regra de "zero
  selecionados", não um caso especial.

## Interação no canvas

- **Gatilho:** nenhum gesto no canvas — o painel só reage à seleção que já existe.
  Clicar um botão do painel é a única ação nova.
- **Feedback:** o nó no canvas re-renderiza na hora — mesma regra de qualquer
  mudança que passa pelo ponto único de commit (nada de prévia separada; a mudança é
  instantânea e pequena o bastante para não precisar de uma).
- **Cancela:** não se aplica — não há arrasto nem edição em aberto para cancelar.
  Desfazer é `Ctrl/Cmd+Z`, como qualquer outra mudança commitada.
- **Atalho de teclado: não tem, para nenhum dos controles.** Alinhamento tem seis
  valores (3 horizontal × 3 vertical) sem mapeamento óbvio de tecla única. Estilo de
  aresta JÁ tem um atalho — `Alt`+clique na própria aresta, que cicla os 4 combos —
  e ele continua sendo o atalho; o painel não ganha um segundo, redundante.
- **Undo:** cada clique num botão do painel é **uma** entrada — "Alinhar texto" para
  o nó de texto, "Mudar estilo da aresta" para a aresta (mesmo rótulo que o
  Alt+clique já usa: é a mesma mudança, só por um gatilho diferente, e as duas
  precisam ficar indistinguíveis no histórico). Nunca uma entrada por eixo
  combinado, nem uma por combinação de dois cliques.

## Regras de negócio

- **Alinhamento é propriedade do CONTEÚDO, não do nó.** Só existe dentro da variante
  `{ kind: "text" }` de `NodeContent` — um nó de forma ou ícone não tem (nem pode
  ter, no tipo) um `align`. Mesma razão já registrada em `architecture.md` para
  ícone ser variante irmã da forma: "o que se desenha dentro" é decisão do
  `content`, não um atributo solto do nó.
- **Padrão é centro/meio** — `{ horizontal: "center", vertical: "middle" }` — porque
  é EXATAMENTE o que já acontece hoje (texto sempre centralizado nos dois eixos).
  Um nó de texto criado antes deste controle existir abre com o mesmo visual de
  sempre; a pessoa só nota o campo quando muda ele pela primeira vez.
- **Alinhamento não afeta a quebra de linha.** Quebra continua vindo só da largura da
  caixa (`formas-e-texto.md`); o alinhamento decide onde o BLOCO já quebrado se
  posiciona dentro do retângulo, nos dois eixos, independentemente um do outro.
- **Direção e traço de uma aresta são dois eixos independentes**, mesma regra já
  registrada em `EdgeStyle.ts`: nada no domínio exige que "tracejada" e
  "bidirecional" andem juntas, então são dois booleanos soltos, não um enum de 4
  nomes. O painel espelha isso — dois grupos de dois, não um seletor de 4 opções.
- **O painel não introduz um segundo caminho de mudar estilo de aresta** — chama o
  MESMO `Diagram.setEdgeStyle` que o Alt+clique já chama (via `CycleEdgeStyle`); só
  não cicla, escolhe direto. Um valor mudado por um caminho aparece correto no outro
  na próxima leitura, porque os dois leem o mesmo `edge.style`.
- **Painel mostra controle só para seleção única.** Não há "alinhamento de vários"
  nem "o estilo de várias arestas" — nem como média nem como o-primeiro-manda; é
  ambíguo o bastante para não ter uma resposta óbvia, então não se oferece a
  pergunta.
- **Formato é propriedade do CONTEÚDO, mesma regra do alinhamento** — só existe
  dentro da variante `{ kind: "text" }` de `NodeContent`. Padrão `"plain"`: um nó de
  texto criado antes deste controle existir abre exatamente como sempre abriu.
- **Trocar o formato não apaga nem reformata o texto** — o `label` é a mesma string
  nos dois formatos; só a APRESENTAÇÃO muda (fonte, cor por token, alinhamento
  horizontal forçado em código). Ir e voltar entre os dois formatos é sem perda.

## Estados de UI

- Vazio (nada selecionado, ou mais de um): painel ausente, canvas usa a largura
  inteira.
- Selecionado, nó de texto: o grupo de formato (dois botões) e os grupos de
  alinhamento; o valor atual de cada um destacado. Em modo código, só o grupo de
  formato e o vertical aparecem — o horizontal fica ausente, não desabilitado.
- Selecionado, aresta: dois grupos de dois botões; direção e traço atuais
  destacados.
- Selecionado, forma ou ícone: frase "Nada para configurar neste elemento."
- Erro: não se aplica — não há entrada de usuário nem I/O nesta interação.

## Modelagem de domínio

- **Value object novo:** `TextAlign` — `{ horizontal: "left" | "center" | "right";
  vertical: "top" | "middle" | "bottom" }`. Arquivo próprio
  (`domain/diagram/TextAlign.ts`), mesmo tratamento de `EdgeStyle.ts`: um VO pequeno,
  testável isolado, sem depender do resto do agregado.
- **`NodeContent`** ganha o campo na variante de texto:
  `{ kind: "text"; align: TextAlign }`. `textContent()` (a factory que já existe)
  passa a aceitar um `align` opcional, com o padrão centro/meio.
- **`DiagramNode.withTextAlign(align: TextAlign): DiagramNode`** — novo método,
  mesmo formato de `.labeled()`. Lança `NotATextNode` se `content.kind !== "text"`:
  o painel nunca deveria chamar isso fora de um nó de texto (o próprio botão não
  aparece), então chegar aqui com outro `kind` é bug de quem chamou, não entrada do
  usuário — e por isso é um erro de domínio, não uma checagem silenciosa.
- **`Diagram.setTextAlign(id: NodeId, align: TextAlign): Diagram`** — mesmo formato
  de `setNodeLabel`/`setEdgeStyle`: acha o nó, chama o método, substitui.
- **Caso de uso novo:** `SetTextAlign`, em `application/editing.ts`, ao lado de
  `SetNodeLabel` e `CycleEdgeStyle`.
- **Erro de domínio novo:** `NotATextNode`, em `domain/diagram/errors.ts`.
- Nenhum invariante do agregado muda — `align` é opaco para as 5 regras existentes
  do `Diagram` (nenhuma delas olha para dentro de `content`).
- **Estilo de aresta não ganha modelo novo** — `EdgeStyle`, `Diagram.setEdgeStyle` e
  o VO já existiam (spec `editor/conectar-nos.md`, feature do Alt+clique). Só o
  **caso de uso** é novo: `SetEdgeStyle`, em `application/editing.ts`, ao lado de
  `CycleEdgeStyle` — mesma entrada (`diagram`, `id`, `style`), sem ciclar: recebe o
  estilo final pronto e comete.
- **Tipo novo:** `TextFormat` — `"plain" | "code"`. Arquivo próprio
  (`domain/diagram/TextFormat.ts`), mesmo formato de `TextAlign.ts`: um tipo pequeno
  com um `DEFAULT_TEXT_FORMAT` exportado, sem depender do resto do agregado.
- **`NodeContent`** ganha mais um campo na variante de texto:
  `{ kind: "text"; align: TextAlign; format: TextFormat }`. `textContent()` passa a
  aceitar `format` como segundo parâmetro opcional, padrão `"plain"`.
- **`DiagramNode.withTextFormat(format: TextFormat): DiagramNode`** — mesmo formato
  de `withTextAlign`, mesmo `NotATextNode` se `content.kind !== "text"` (reaproveita o
  erro, generalizado de "não tem alinhamento" para "não é de texto" — os dois setters
  de conteúdo de texto compartilham a mesma causa: nó errado).
- **`Diagram.setTextFormat(id: NodeId, format: TextFormat): Diagram`** — mesmo
  formato de `setTextAlign`.
- **Caso de uso novo:** `SetTextFormat`, em `application/editing.ts`, ao lado de
  `SetTextAlign`.
- **Destaque de sintaxe é lógica de apresentação, não de domínio** — o tokenizador
  (`presentation/canvas/jsHighlight.ts`, função pura testada isolada) só decide COR
  por token para desenhar; nada disso entra no agregado ou no documento. O documento
  guarda o `label` (a string) e o `format` (o modo) — nunca o resultado tokenizado.

## Impacto no documento

- **Campo novo:** `align` dentro de `content` quando `content.kind === "text"`, no
  formato `{ horizontal, vertical }` — mesmos três valores de string cada eixo.
- **`schemaVersion` NÃO sobe.** Mesmo caso já registrado em `document/types.ts` para
  `EdgeDoc.dashed`/`.bidirectional`: campo novo, valor padrão seguro
  (`{ horizontal: "center", vertical: "middle" }`, o visual de sempre), documento
  salvo antes de o campo existir continua abrindo — o codec preenche o padrão na
  leitura.
- Efeito em export/import: nenhum além do campo novo seguindo o nó — o `.json`
  exportado já carrega o alinhamento; importado num app sem esta feature ainda,
  seria ignorado (versão futura do documento lido por versão anterior do app não é
  um caso coberto hoje — mesma limitação que já vale para qualquer campo aditivo).
- Estilo de aresta: nenhum campo novo — `dashed`/`bidirectional` já existem desde
  `conectar-nos.md`. O painel só chega a um campo que já era persistido.
- **Campo novo:** `format` dentro de `content` quando `content.kind === "text"`,
  string `"plain" | "code"`.
- **`schemaVersion` NÃO sobe** — mesmo raciocínio de `align`: campo aditivo, padrão
  `"plain"` (o comportamento de sempre), documento salvo antes do campo existir
  continua abrindo, o codec preenche o padrão na leitura. Valor desconhecido também
  cai no padrão, em vez de recusar o documento — mesma tolerância que já vale para
  qualquer valor de allowlist inesperado no codec.

## Impacto por camada

- `domain/`: `TextAlign.ts` (VO), `TextFormat.ts` (tipo), `NodeContent.ts` (campos +
  factory), `Node.ts` (`withTextAlign`, `withTextFormat`), `Diagram.ts`
  (`setTextAlign`, `setTextFormat`), `errors.ts` (`NotATextNode`). Nada novo para
  estilo de aresta — reaproveita `EdgeStyle.ts`.
- `application/`: `SetTextAlign`, `SetTextFormat` e `SetEdgeStyle`, os três em
  `editing.ts`.
- `infrastructure/`: nada — o codec mora no domínio (`document/codec.ts` e
  `document/types.ts`, já contados acima).
- `presentation/`: o painel (`presentation/panel/PropertiesPanel.tsx`, novo — os
  três campos moram no mesmo componente, com um `FieldButton` compartilhado), o novo
  cálculo de `firstBaseline`/`x` em `NodeLabel.tsx` (hoje fixo em centralizado —
  passa a ler `content.align`/`content.format`), a coluna nova no grid de
  `App.tsx`/`styles.css`, e o que o modo código acrescenta —
  `presentation/canvas/jsHighlight.ts` (tokenizador), o ramo de desenho por token em
  `NodeLabel.tsx`, e o `<div>` de fundo colorido sincronizado ao `<textarea>` em
  `LabelEditor.tsx` (ver `formas-e-texto.md` para o detalhe da técnica).
- Performance: nenhuma — um VO de duas strings por nó de texto, sem custo de render
  além do já existente.

## Restrições de implementação (guardrails)

- `align` só existe dentro da variante `text` de `NodeContent` — não vira campo solto
  em `DiagramNode`, mesma regra que já vale para `assetId` (só existe em `icon`) e
  `shape` (só existe em `shape`).
- Mudar alinhamento passa pelo caso de uso e pelo ponto único de commit — nenhum
  `setState` de painel escreve o documento direto.
- O painel não introduz um SEGUNDO lugar que sabe "o que está selecionado" — lê
  `session.selection`, que já existe.
- Nada de `foreignObject` no cálculo de posição do texto — continua `<text>` +
  `<tspan>`, só a matemática de `x`/`firstBaseline` muda com o alinhamento.
- **Limitação aceita: o editor de rótulo (`<textarea>`) só reflete o alinhamento
  HORIZONTAL durante a digitação** (é só `text-align`). O vertical não tem
  equivalente para o conteúdo de um `<textarea>` — WYSIWYG de verdade pediria trocar
  por `contentEditable`, e a spec do editor de rótulo já rejeita isso de propósito
  (foco, seleção e IME de um campo de verdade, de graça). O texto sobe/desce/centra
  só ao sair da edição — não é bug, é o custo aceito de manter o campo nativo.

## Critérios de aceite

- [x] Selecionar um nó de texto mostra o painel com os dois grupos de alinhamento.
- [x] Selecionar uma forma ou ícone mostra o painel com "Nada para configurar
      neste elemento."
- [x] Selecionar uma aresta mostra o painel com os dois grupos de estilo (direção,
      traço).
- [x] Selecionar zero ou mais de um elemento esconde o painel — o canvas ocupa a
      largura inteira.
- [x] Clicar "direita" mostra o texto encostado na borda direita da caixa; "esquerda"
      e "centro" pelo mesmo botão do grupo horizontal.
- [x] Clicar "baixo" mostra o texto encostado no fundo da caixa; "topo" e "meio" pelo
      mesmo botão do grupo vertical.
- [x] O alinhamento não muda onde as linhas quebram — só onde o bloco já quebrado se
      posiciona (`xForHorizontal`/`yForVertical` só reposicionam o bloco que
      `wrapText` já produziu).
- [x] Um nó de texto criado antes deste controle (ou vindo de um `.json` antigo) abre
      centralizado nos dois eixos, sem diferença visual do que já era.
- [x] Cada clique num botão de alinhamento, ou de estilo de aresta, é uma entrada de
      undo própria.
- [x] O alinhamento sobrevive à recarga e ao export/import.
- [x] Clicar "bidirecional" numa aresta faz a segunda ponta de seta aparecer; clicar
      "tracejado" muda o traço — cada um independente do outro.
- [x] Mudar o estilo pelo painel e pelo `Alt`+clique ficam consistentes: o botão
      certo aparece destacado depois de qualquer um dos dois caminhos.
- [x] `schemaVersion` continua `1`.
- [x] Selecionar um nó de texto mostra o grupo "Formato" com dois botões (texto
      simples / código), o valor atual destacado.
- [x] Clicar "código" muda a fonte do rótulo para monoespaçada com destaque de
      sintaxe, e some com o grupo de alinhamento horizontal — só o vertical
      continua.
- [x] Clicar "texto simples" de volta traz o grupo horizontal e desliga o destaque,
      sem alterar o texto do rótulo.
- [x] O formato sobrevive à recarga e ao export/import.

## Questões em aberto

- [ ] Quando um próximo controle chegar (cor, borda), o painel ganha abas/seções,
      ou continua empilhando tudo verticalmente? Alinhamento e estilo de aresta
      convivem empilhados porque nunca aparecem juntos (são exclusivos por tipo de
      seleção) — um controle que valesse para vários tipos ao mesmo tempo
      reabriria a pergunta.
