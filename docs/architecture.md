# Arquitetura — UML

Padrões técnicos do app. **Leia antes de escrever qualquer código** (passo 2 do
[`../AI_GUIDE.md`](../AI_GUIDE.md)).

> **Estado:** domínio, casos de uso, catálogo de logos, canvas SVG, persistência
> local, undo/redo, arestas, formas, texto e redimensionamento funcionam. Falta
> estilo por elemento. O que ainda não existe está marcado como pendente ao longo do
> texto, nunca descrito como se existisse — a fila está em [`roadmap.md`](roadmap.md).

---

## Stack

| Camada     | Escolha                    |
|------------|----------------------------|
| Build/dev  | Vite                       |
| UI         | React + TypeScript         |
| Render     | SVG (nós no DOM)           |
| Documento  | JSON com `schemaVersion`   |
| Storage    | IndexedDB + export/import `.json` |
| Backend    | não existe                 |

Sem Next.js: o valor do Next é servidor — SSR, rotas de servidor, RSC. Um editor
local-first não tem servidor, então isso seria complexidade paga sem contrapartida.
Vite entrega HMR rápido e build estático, que é exatamente o que o produto precisa.

---

## Clean Architecture + DDD

Este projeto é **treino consciente** de Clean Architecture e DDD. O tamanho do
produto não exigiria essa cerimônia; ela está aqui porque é o objetivo.

### A regra da dependência

Dependência aponta **só para dentro**. `domain/` não importa nada de nenhuma outra
camada — nem React, nem IndexedDB, nem tipo do DOM.

```
presentation ──→ application ──→ domain ←── infrastructure
   (React,          (casos          (puro)      (implementa
    SVG)             de uso)                     as ports)
```

`infrastructure/` aponta para dentro porque **implementa ports declaradas mais para
dentro** (inversão de dependência) — a aplicação diz "existe um `DiagramRepository`
que salva um diagrama"; quem sabe o que é IndexedDB é a infra.

### Onde mora uma port

Em `application/ports/`, com uma exceção: **port em `domain/` só se o próprio
domínio a invocar.**

Há duas escolas aqui. Evans trata Repository como padrão de domínio, porque a
interface fala o vocabulário dele. Ports & Adapters coloca os driven ports junto de
quem os consome. As duas respeitam a regra da dependência, então a convenção não
decide sozinha — o que decide é **quem chama**.

Se o domínio precisa da port para garantir um invariante, ela tem que estar em
`domain/`, senão o domínio dependeria de `application/` e a seta inverteria. Se só o
caso de uso chama, ela é da aplicação. Hoje nenhuma port é chamada pelo domínio: o
agregado nunca salva, nunca gera id, nunca sanitiza. Declarar essas interfaces no
domínio o fazia anunciar cinco contratos que ele próprio nunca usa.

O teste de que a regra está viva: `domain/` roda em Node puro, sem jsdom e sem
mock de browser. Se um teste de domínio precisar de DOM, a regra já foi quebrada.

### Estrutura de pastas

O que existe hoje:

```
src/
├── domain/                    ← puro, zero import externo
│   ├── shared/                ← ids.ts (identidades tipadas), geometry.ts
│   └── diagram/
│       ├── Diagram.ts         ← AGREGADO RAIZ (a tabela de assets vive dentro dele)
│       ├── Node.ts            ← entidade (DiagramNode)
│       ├── Edge.ts            ← entidade
│       ├── NodeContent.ts     ← união: icon | shape | text
│       ├── Asset.ts
│       ├── errors.ts          ← erros de domínio tipados
│       └── services/          ← edgeGeometry, resizeGeometry
├── application/               ← casos de uso: uma intenção do usuário cada
│   ├── AddIconNode.ts
│   ├── editing.ts             ← MoveNodes, ResizeNode, ConnectNodes, Delete…
│   ├── Selection.ts           ← o que está selecionado: nós E arestas
│   └── ports/                 ← DiagramRepository, IconCatalog, SvgSanitizer…
├── infrastructure/            ← adaptadores
│   ├── icons/                 ← catálogo embutido (simple-icons)
│   ├── id/                    ← CryptoIdGenerator, SequentialIdGenerator
│   ├── persistence/           ← só InMemoryDiagramRepository por enquanto
│   └── security/              ← sanitizador de SVG, hasher
└── presentation/              ← React + SVG
    ├── canvas/                ← renderer, viewport
    ├── palette/               ← paleta de logos
    ├── panel/                 ← painel de propriedades do item selecionado
    └── session/               ← estado efêmero: seleção, zoom, arrasto
```

Fora da árvore acima: `domain/document/` (o formato de arquivo e seu codec),
`infrastructure/file/` (download e seleção de arquivo) e
`presentation/composition.ts` (o composition root).

Também fora da árvore: `application/history/` (undo/redo).

Pasta que as decisões acima preveem e que **ainda não existe**: `domain/migration/`
(cadeia de `schemaVersion`, que só ganha sentido quando houver um v2).

### Por que o codec mora no domínio

O formato de arquivo **é** parte da linguagem do produto: `schemaVersion`, migrações
e a validação do documento são conceitos especificados na spec, não detalhes de
transporte. `JSON.parse` é ES puro, não API de plataforma, então o codec continua
rodando sem DOM — e continua testável junto do modelo, que é onde os invariantes
que ele precisa respeitar já vivem.

O que fica na infraestrutura é a **viagem dos bytes**: baixar um arquivo, escolher
um no disco, gravar no IndexedDB.

A leitura tem dois passos, e a separação não é cosmética:

```
parseDocument()   texto → estrutura validada (ainda não é agregado)
     ↓            ← aqui a aplicação sanitiza os SVGs recebidos
fromDocument()    estrutura → agregado, invariantes checados
```

Fosse um passo só, importar um `.json` de terceiro construiria o agregado com asset
não sanitizado dentro, e o invariante "o que está na tabela já está limpo" passaria
a ter uma exceção não escrita.

### Padrões táticos neste domínio

| Padrão | Aqui é | Por quê |
|---|---|---|
| **Agregado raiz** | `Diagram` | É a fronteira de consistência real: aresta referencia nó, asset é referenciado por nó. Nada disso pode ser validado peça por peça |
| **Entidade** | `Node`, `Edge` | Têm identidade própria — sobrevivem à troca de todos os seus atributos |
| **Value object** | `Point`, `Size`, `Rect`, `Style`, `Label`, `NodeContent` | Imutáveis, igualdade por valor. `Point(10,20)` é `Point(10,20)`, não importa qual |
| **Domain service** | roteamento de aresta, snap, geometria de âncora | Lógica que não pertence a uma entidade só — envolve duas ou o plano inteiro |
| **Port / Repository** | `DiagramRepository`, `IconCatalog`, `SvgSanitizer` | O caso de uso pede "salve"; não sabe que existe IndexedDB |
| **Caso de uso** | `AddNode`, `MoveNodes`, `AttachIcon` | Uma intenção do usuário = uma transação = **uma** entrada de undo |

### Invariantes do agregado `Diagram`

Estes são o motivo de o agregado existir. Toda operação sai deixando os cinco de pé:

1. Toda `Edge` referencia dois `Node` existentes.
2. Deletar um `Node` remove as arestas incidentes a ele.
3. Todo `NodeContent` de `kind: "icon"` aponta para um asset presente na tabela.
4. **Asset sem nenhuma referência não existe.** Removeu o último nó que usava o
   logo, o asset sai junto — senão o arquivo cresce para sempre com logos que o
   usuário testou e descartou.
5. Ids são únicos dentro do documento.

O agregado é carregado e salvo **inteiro**. É legítimo aqui porque a fronteira de
consistência é mesmo o documento todo, e documentos são pequenos (KBs). Se um
diagrama chegar a milhares de nós, este é o primeiro ponto a revisitar.

### Modelo de nó: ícone é um nó, não um enfeite

Um `Node` é uma entidade com identidade, um retângulo, estilo, rótulo e um
**`content` polimórfico**. Ícone é uma variante de `content` — irmã da forma
geométrica, não atributo dela:

```ts
type NodeContent =
  | { kind: "icon";  assetId: AssetId }
  | { kind: "shape"; shape: "rect" | "ellipse" | "diamond" }
  | { kind: "text" }
```

O modelo rejeitado é `Node = { shape: rect, icon?: IconRef }`, onde o ícone é
decoração opcional de uma caixa. Ele obriga o usuário a criar uma forma antes de
usar um logo, e faz "nó sem ícone" e "nó com ícone" serem estados do mesmo objeto —
com todo código de render e de estilo ramificando nisso. Arrastar o Redis da paleta
cria **um** nó, num gesto.

O nó continua tendo um `Rect`. Isso não é a caixa voltando pela porta dos fundos:
estar num plano é ter posição e tamanho, e vale igual para forma, ícone e texto.
O que a variante de `content` decide é o que se desenha dentro dele.

Consequências que essa modelagem impõe, e que são o motivo de escolhê-la:

- **Aresta conecta em qualquer nó do mesmo jeito.** A âncora é calculada do bounding
  box, sem saber o `kind`. Se ícone fosse um tipo de entidade separado, toda operação
  de geometria e toda referência de aresta teria que ramificar entre dois tipos.
- **Redimensionar preserva a proporção quando `kind === "icon"`.** Logo esticado fica
  horrível e é marca de outra pessoa. A regra pertence à variante de `content`, não
  ao handle de resize em `presentation/`.
- **A área de clique é o `Rect`, nunca o traço do vetor.** O logo do Redis tem regiões
  transparentes; clicar num vão precisa selecionar o nó, e não o que está atrás dele.
  Em SVG isso significa um `<rect>` transparente de hit area sobre o ícone, com
  `pointer-events` no ícone desligado.
- **Rótulo é do nó, não do conteúdo.** Um ícone quase sempre quer legenda ("Redis —
  cache de sessão"). Para `kind: "icon"` o padrão é o rótulo **abaixo** do box, porque
  texto sobre o logo tapa justamente o que identifica a tecnologia.

Caixa contendo logo — o "VPC" com o ícone da AWS no canto — **não** volta a ser
ícone-dentro-de-forma. É agrupamento: um nó de forma e um nó de ícone num grupo. Assim
o ícone segue sendo um nó, selecionável e conectável sozinho.

### O atrito real: DDD a 60fps

Aqui está a parte que a maioria dos tutoriais não conta, e é onde este projeto vai
doer. Um agregado quer encapsulamento e imutabilidade; um canvas quer mutar posição
60 vezes por segundo. Passar cada frame de arrasto por um caso de uso que carrega o
agregado, muta e salva gera lixo e trava.

A separação que resolve:

- **Durante** a interação, o arrasto é **estado de sessão** em `presentation/` —
  um offset aplicado numa camada de preview. O domínio não é tocado.
- **No fim** da interação (soltar o mouse), um único caso de uso `MoveNodes` recebe
  o delta final e comete a mudança.

É a mesma regra de "uma interação = uma entrada de undo", vista pelo outro lado.
Se você se pegar chamando caso de uso dentro de `onMouseMove`, a modelagem está
errada, não a performance.

---

## Renderer: SVG

**Decisão: SVG, com nós no DOM.** Canvas 2D foi avaliado e descartado.

O motivo decisivo é o produto: os diagramas são feitos de **logos de tecnologia**,
que são vetor. Em SVG, um logo entra como está e fica nítido em qualquer zoom. Em
canvas, todo SVG precisa virar bitmap, e ao dar zoom borra — a menos que se
rasterize por faixa de zoom e se gerencie um cache de `ImageBitmap`. Seria otimizar
justamente contra o diferencial do produto.

O segundo motivo é o orçamento de complexidade. Com SVG, hit-testing, hover, cursor,
z-order, foco e acessibilidade vêm do browser. Canvas exigiria reimplementar tudo
isso, mais medição e quebra de texto, mais edição de texto (na prática, um
`<textarea>` sobreposto). Num projeto cujo objetivo é treinar modelagem de domínio,
esse gasto sai do lugar errado.

O que se paga por essa escolha, e como se paga:

- **Custo por nó.** Até alguns milhares de elementos é tranquilo. Acima disso, entra
  virtualização por viewport — renderizar só o que está visível.
- **Pan e zoom** são um único `transform` no `<g>` raiz, nunca recálculo de posição
  elemento a elemento.
- **Arrasto** move só a camada arrastada, via `transform`. Mexer em atributo de
  geometria por frame causa reflow.
- **Texto não quebra linha sozinho** em `<text>`. A quebra é calculada e vira
  `<tspan>`s. `foreignObject` é tentador e atrapalha no export — evite.

O grid de fundo fica em CSS `background-image` ou num canvas atrás do SVG. Não polui
a árvore com milhares de linhas.

Como o renderer é adaptador da camada externa, trocar para canvas depois é trocar
`presentation/canvas/` — desde que geometria e regra nunca vazem para dentro do
componente React.

---

## Documento e assets

- Um diagrama = um objeto JSON com `schemaVersion` no topo.
- Toda mudança de formato **sobe `schemaVersion` e vem com migração**. As migrações
  são uma cadeia (`v1→v2`, `v2→v3`) aplicada na leitura, em `domain/migration/`.
  Documento salvo por versão anterior precisa continuar abrindo: um arquivo que o
  próprio app não lê mais é dado perdido do usuário, não bug de UI.
  - **Campo novo nem sempre é "mudança de formato".** Se o campo tem um valor
    padrão seguro — o comportamento de sempre, antes de o campo existir — um
    documento antigo continua abrindo sem migração nenhuma: o codec só precisa
    aplicar esse padrão quando o campo faltar na leitura. É o caso de
    `EdgeDoc.dashed`/`.bidirectional` (`false`/`false`, o estilo que já existia).
    Isso SOBE `schemaVersion` quando o campo passa a ser obrigatório, muda de
    tipo, ou o padrão sozinho não basta para reconstruir o documento antigo —
    a régua é "um v1 salvo antes do campo existir ainda abre certo?", não "o
    tipo TypeScript mudou?".
- **Estado de sessão nunca entra no documento** — zoom, seleção, painel aberto,
  ferramenta ativa e pilha de undo são da sessão.

### Tabela de assets

Logos vivem numa tabela no próprio documento, endereçada por conteúdo:

```json
{
  "schemaVersion": 1,
  "assets": {
    "sha256-3f9a…": {
      "kind": "svg",
      "name": "PostgreSQL",
      "source": "catalog:simple-icons/postgresql",
      "data": "<svg …>"
    }
  },
  "nodes": [
    { "id": "n1", "rect": { "x": 120, "y": 80, "w": 64, "h": 64 },
      "content": { "kind": "icon", "assetId": "sha256-3f9a…" },
      "label": "cache de sessão" }
  ]
}
```

- **Autocontido**: o `.json` exportado abre em qualquer máquina, mesmo sem o
  catálogo — nenhum ícone quebrado.
- **Sem duplicação**: 20 nós de Postgres apontam para um SVG só.
- **Id é hash do conteúdo**, não slug. Assim a deduplicação funciona também ao
  importar ou mesclar documentos de origens diferentes, e continua funcionando se
  o catálogo mudar de versão. `source` e `name` são metadado de UI, não identidade.
- **Coleta de lixo é invariante do agregado**, não rotina de manutenção — ver
  invariante 4 acima.

### Sanitização de SVG

O renderer é DOM: **SVG não sanitizado é XSS de verdade**, não risco teórico. Todo
SVG de origem externa passa pelo port `SvgSanitizer` **antes de entrar na tabela** —
`<script>`, atributos `on*`, `foreignObject` e referências externas saem.

Origem externa é tanto o upload do usuário quanto o `.json` importado — um documento
recebido de outra pessoa é entrada não confiável. Só o catálogo embutido no build é
confiável.

Sanitizar na entrada, e não no render, faz o invariante valer para o documento
guardado: o que está na tabela já está limpo.

### Catálogo de ícones

Embutido no build, exposto pelo port `IconCatalog`. Ao inserir um ícone do catálogo,
o SVG é copiado para a tabela de assets do documento — a partir daí o documento não
depende mais do catálogo.

**Três fontes, compostas numa só:**

- `SimpleIconsCatalog` — logos de marca (simple-icons). São **marcas registradas**
  dos seus donos: os arquivos são CC0, a marca não. Usar o logo para identificar a
  tecnologia num diagrama é uso nominativo e tranquilo; distribuir logo alterado ou
  sugerir endosso da empresa, não.
- `GenericIconCatalog` — símbolos de arquitetura sem marca nenhuma (servidor, banco
  de dados, fila, load balancer, …), do [lucide](https://lucide.dev) (ISC). Sem a
  restrição de marca: são conceitos, não empresas.
- `UmlIconCatalog` — notação básica de UML que É um símbolo fixo: ator (lucide),
  interface, pacote, nota, componente (os quatro desenhados à mão neste projeto —
  o lucide não tem a notação certa pronta). Mesmo status de "conceito, não marca"
  do genérico; categoria separada só porque é outro vocabulário visual, que a
  paleta agrupa à parte. O que TEM conteúdo estruturado fica fora deste catálogo:
  caso de uso é a ferramenta de forma elipse (`O`); classe é a ferramenta de forma
  `C` (`ShapeKind: "umlClass"`, três compartimentos de texto) — nenhum dos dois é
  ícone arrastável.

`CompositeIconCatalog` junta as três numa `IconCatalog` só, na ordem em que são
compostas — é essa ordem que resolve empate se um slug existir em mais de uma fonte
(não ocorre hoje). O resto do app não sabe que existe mais de uma fonte:
`AddIconNode` recebe um `IconCatalog`, ponto. `CatalogIcon.category`
(`"brand" | "generic" | "uml"`) é metadado só de exibição, para a paleta agrupar
visualmente — não existe em `Asset` nem no documento; um nó de ícone genérico ou de
UML é processado, redimensionado e deduplicado exatamente como um de marca.

Ícone genérico e de UML usam uma **cor fixa única** (não a cor de nenhuma marca) —
mesma razão do `fill="#hex"` nos logos: o SVG é desenhado dentro de um `<image>`
isolado, onde `currentColor` cairia para preto. A cor única também ajuda o olho a
distinguir "isto é um conceito" de "isto é uma marca" ao olhar o diagrama.

---

## Persistência

- **IndexedDB** para a sessão — o app reabre no diagrama onde o usuário parou.
- **Export/import `.json`** é o formato de arquivo do produto, não um extra de debug.
- `localStorage` não guarda diagrama: é síncrono, limitado e só string. No máximo
  preferência de UI (tema, grid ligado).

Nada disso é conhecido fora de `infrastructure/persistence/`. Feature nenhuma
importa IndexedDB direto.

---

## Undo/redo

Vive em `application/history/`, sobre os casos de uso. Regras e o porquê das decisões
estão na spec [`editor/undo-redo.md`](specs/editor/undo-redo.md); o que importa para
quem for escrever código novo:

- **Ponto único de commit.** A sessão expõe um `commit(diagram, seleção, rótulo)` que
  grava o estado **e** empilha a entrada — e nada mais define o diagrama. Feature que
  mude o documento por fora não é desfazível, e a pessoa descobre isso quando o
  `Ctrl+Z` pula uma ação.
- **Uma interação = uma entrada.** Arrastar uma forma por 200 frames é **um** undo.
- **Snapshot, não comando inverso.** O agregado é imutável, então guardar o estado
  anterior é guardar um ponteiro; os assets são compartilhados por referência entre
  todas as entradas, então o SVG nunca é duplicado.
- **O histórico é da sessão** — não entra no documento nem no IndexedDB.

---

## Testes

- **`domain/`**: teste unitário puro, em Node, sem DOM. É onde mora o grosso da
  cobertura — invariantes do agregado, geometria, cadeia de migrações.
- **`application/`**: casos de uso com repositório fake em memória.
- **`presentation/`**: teste de interação, e só do que não dá para cobrir por baixo.

Uma migração de `schemaVersion` sem teste que abra um documento da versão anterior
não está pronta.

---

## Guardas automáticas

A regra da dependência não depende de disciplina — o `npm run typecheck` roda dois
compiladores:

| Comando | O que garante |
|---|---|
| `tsc -p tsconfig.json` | O app inteiro compila |
| `tsc -p tsconfig.domain.json` | `src/domain/` compila **sem a lib DOM**. Importar React, tocar `document` ou usar `crypto.subtle` no domínio quebra o build |

E os testes de domínio rodam com `environment: "node"`, sem jsdom. Se um dia
precisarem de DOM, a regra já foi violada — o teste é o alarme.

---

## Pendente

A fila completa, com decisões e critério de pronto, está em [`roadmap.md`](roadmap.md).
Em resumo: estilo por elemento, refinos do canvas, upload de SVG próprio, export
PNG/SVG, design system, grupos.

## Decisões ainda em aberto

- Estratégia de roteamento de arestas (ortogonal, curva, direta) e de âncoras.
- Sanitização de SVG: hoje há uma allowlist própria e restritiva em
  `infrastructure/security/`. Antes de liberar upload de SVG arbitrário para usuário
  final, revisar ou trocar por DOMPurify.
- **Logos da AWS.** A Amazon pediu a remoção das próprias marcas do `simple-icons`,
  então o catálogo não tem AWS nem seus serviços — justamente os mais comuns num
  diagrama de arquitetura. Cobrir isso exige outra fonte (a AWS distribui os
  "Architecture Icons" sob termos próprios) e é decisão de produto.
- Estado de sessão em `presentation/`: hoje é `useState` num hook. Quando doer,
  avaliar store dedicado — decisão de camada externa, sem efeito no domínio.
