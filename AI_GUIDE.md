# AI Guide — UML

Este arquivo define como a IA deve se comportar ao trabalhar neste projeto.
Não descreve o produto — descreve o **processo**.

---

## Pipeline obrigatório para qualquer tarefa

Independente da tarefa pedida pelo usuário, sempre siga os seguintes passos, sem
pular etapas:

```
1. ENTENDER → 2. LOCALIZAR → 3. CHECAR SPEC → 4. IMPLEMENTAR → 5. ATUALIZAR DOCS
```

### 1. Entender o contexto

- Leia `docs/overview.md` para entender o produto, o stack e o que ele **não** é.
- Identifique que parte do app a tarefa toca: editor (canvas), documento (modelo
  de dados), persistência, ou UI de chrome (toolbar, painéis, atalhos).

### 2. Localizar a arquitetura

- Leia `docs/architecture.md` antes de escrever qualquer código.
- Respeite os padrões de pasta, nomenclatura e camadas descritos lá.
- Identifique **em que camada** a mudança nasce: `domain/`, `application/`,
  `infrastructure/` ou `presentation/`. Código que não sabe a qual camada pertence
  acaba em todas.

### 3. Checar ou criar a spec

- Abra `docs/specs/index.md` e verifique se já existe uma spec para a feature.
- **Se existir:** leia a spec correspondente e **reescreva** o trecho afetado pelo
  pedido.
- **Se não existir:** crie a spec primeiro, confirme com o usuário e só depois
  implemente.

> **Como criar/atualizar uma spec** (template, quando é obrigatória, e a regra
> "estado atual, não histórico") vive na skill `criar-spec`, carregada sob demanda
> — ver "Processo de spec" abaixo.

### 4. Implementar

- Siga estritamente os padrões do `docs/architecture.md`.
- Não crie abstrações novas sem necessidade — prefira o padrão já existente.
- Não altere arquivos fora do escopo da tarefa.

### 5. Atualizar documentação

- Se a implementação adicionar ou alterar comportamento, atualize o
  `docs/architecture.md` e as specs relevantes.
- Se for uma feature nova, marque a spec com status `implemented` no
  `docs/specs/index.md`.
- Atualizar uma spec significa **reescrever** o trecho afetado, não anexar o que
  mudou — regra completa na skill `criar-spec`.

---

## Processo de spec

O **template** de spec, o critério de **quando uma spec é obrigatória** e a regra
**"spec descreve o estado atual, não o histórico"** vivem na skill `criar-spec`
(`.claude/skills/criar-spec/SKILL.md`), carregada sob demanda pelo agente quando a
tarefa mexe em `docs/specs/`.

Motivo de estar fora deste guia: é conteúdo relevante só quando se escreve uma spec
(~10% das tarefas). Mantê-lo sempre no contexto gastava orçamento de atenção à toa;
como skill, entra só na hora certa (progressive disclosure).

Aqui há **um template só** — spec de feature. Não existe spec de layout separada:
o produto tem uma superfície única (o app web), então o que a tela mostra é parte
da mesma spec da feature, na seção "Estados de UI". Um segundo template só se
justifica quando duas superfícies podem divergir; aqui não há a segunda.

---

## Regras gerais

- **Nunca** implemente sem ler o `docs/architecture.md`.
- **Nunca** crie uma pasta ou camada nova sem justificativa na spec.
- **Sempre** prefira editar arquivos existentes a criar novos.
- **A regra da dependência não se negocia.** Dependência aponta só para dentro:
  `presentation → application → domain`, e `infrastructure` implementando as ports
  declaradas mais para dentro. `domain/` não importa React, IndexedDB nem tipo do
  DOM. O teste rápido: os testes de `domain/` rodam em Node puro, sem jsdom. Se
  precisarem de DOM, a regra já foi quebrada.
- **Port nova vai em `application/ports/`** — a menos que o próprio domínio a
  invoque para garantir um invariante, e aí vai em `domain/`. O critério é quem
  chama, não a convenção: domínio que declara interface que ele mesmo nunca usa
  está anunciando contrato dos outros.
- **Regra de negócio mora no domínio, não no componente.** Geometria, invariante e
  validação dentro de `domain/`; o componente React desenha e despacha intenção.
  Um `useEffect` calculando roteamento de aresta é regra vazando para a camada mais
  externa e mais difícil de testar.
- **Uma interação do usuário = um caso de uso = uma entrada de undo.** Durante o
  arrasto, o movimento é estado de sessão em `presentation/`; ao soltar, um único
  caso de uso comete a mudança. Chamar caso de uso dentro de `onMouseMove` é sinal
  de modelagem errada, não de problema de performance.
- **O documento é o contrato, o storage é detalhe.** O diagrama é um objeto JSON
  serializável, versionado por um campo de `schemaVersion`. Todo código de feature
  fala com o documento; só a camada de persistência sabe onde ele é gravado. É isso
  que permite trocar IndexedDB por arquivo, ou acrescentar um backend depois, sem
  reescrever o editor.
- **Ícone é um nó, não enfeite de um nó.** `Node` tem um `content` polimórfico
  (`icon | shape | text`) — a forma geométrica é uma variante como as outras, não a
  base à qual se pendura um logo. Usar um logo é criar um nó, num gesto; nunca criar
  uma caixa e depois associar. Toda regra que ramifica em "tem ícone ou não" é sinal
  de que o modelo antigo voltou.
- **Logo entra na tabela de assets do documento, endereçado por hash do conteúdo.**
  Nó nenhum guarda SVG inline: o `content` guarda `assetId`. E asset sem referência
  não existe — apagar o último nó que usava um logo remove o asset, senão o arquivo
  cresce para sempre com o que o usuário testou e descartou.
- **SVG de origem externa é sanitizado antes de entrar no documento.** O renderer é
  DOM, então SVG não sanitizado é XSS de verdade. Externo inclui o `.json` importado,
  não só o upload — documento de outra pessoa é entrada não confiável.
- **Toda mudança no formato do documento sobe `schemaVersion` e vem com migração.**
  Um diagrama salvo por uma versão anterior do app precisa continuar abrindo — um
  documento que o próprio app não lê mais é dado perdido do usuário, não bug de UI.
- **Nada de estado de editor dentro do documento.** Zoom, seleção, painel aberto,
  ferramenta ativa e histórico de undo são estado de sessão; se vazarem para o JSON
  salvo, dois usuários abrindo o mesmo arquivo herdam o scroll um do outro e todo
  diff de documento vira ruído.
- **Interação nova entra com atalho de teclado e estado vazio definidos.** É um
  editor de canvas: a spec que descreve uma ferramenta sem dizer o que aparece antes
  do primeiro clique está incompleta.
- Código comentado deve explicar **por quê**, nunca **o quê**.
- Specs e `architecture.md` descrevem o estado atual — corrigir uma limitação
  significa **apagar** o texto que a descrevia, não anotar que ela foi resolvida.

---

## Persistência

O app é **local-first**: não há backend, nem conta de usuário, nem rede no caminho
de salvar. O diagrama vive no navegador do usuário.

- **Formato:** JSON, um objeto por diagrama, com `schemaVersion` e a tabela de
  assets — os logos usados, embutidos uma vez cada e endereçados por hash.
- **Storage de sessão:** IndexedDB — o app reabre no diagrama onde o usuário parou.
- **Portabilidade:** export/import de arquivo `.json` é como o usuário leva o
  diagrama embora ou o traz de volta. É o formato de arquivo do produto, não um
  "extra de debug", e mudanças nele seguem a regra de `schemaVersion`.

`localStorage` não serve como storage de diagrama: é síncrono, limitado a poucos MB
e guarda só string. Use-o no máximo para preferência de UI (tema, grid ligado).

Quando aparecer requisito de conta, link compartilhável ou colaboração, aí entra
backend — e ele entra como sincronização do mesmo documento JSON, não como um
segundo modelo de dados.

---

## Estrutura de referência rápida

```
uml/
├── AI_GUIDE.md                    ← você está aqui
├── CLAUDE.md                      ← ponteiro para este guia
├── docs/
│   ├── overview.md                ← visão geral do produto e do stack
│   ├── architecture.md            ← camadas, DDD, renderer, assets
│   ├── roadmap.md                 ← a fila do que falta (único doc que olha à frente)
│   └── specs/
│       ├── index.md               ← tabela de todas as specs
│       └── <domínio>/             ← uma pasta por domínio (editor, documento, ...)
├── src/
│   ├── domain/                    ← puro: agregado, entidades, VOs
│   ├── application/               ← casos de uso e histórico de undo
│   ├── infrastructure/            ← IndexedDB, catálogo de ícones, sanitização
│   └── presentation/              ← React, renderer SVG, estado de sessão
└── .claude/
    └── skills/
        └── criar-spec/
            ├── SKILL.md           ← processo de spec
            └── templates/
                └── spec-padrao.md ← template único
```
