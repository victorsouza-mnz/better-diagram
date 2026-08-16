# Spec: Catálogo de logos e tabela de assets

**Domínio:** assets  
**Status:** ready

## Objetivo

Permitir montar um diagrama arrastando ícones da paleta para o canvas — logos de
tecnologia (Redis, Postgres, Kafka…), símbolos genéricos de arquitetura (servidor,
banco de dados, fila…) e notação básica de UML (ator, interface, pacote…) — e
garantir que o arquivo exportado abra em qualquer máquina com os ícones intactos —
sem inchar e sem executar código de terceiros.

## Não-objetivos

- **Busca semântica de verdade** — sem embedding, sem similaridade, sem ranqueamento
  por relevância. O que existe é comparação de substring contra nome, slug e uma
  lista de sinônimos CURADA À MÃO por ícone (ver "Busca por sinônimo" abaixo) — é
  determinístico e auditável (dá pra ler a lista inteira num arquivo), não um modelo
  que "acha parecido".
- **Busca por categoria** (filtrar só "Marcas", ou só "Genéricos") — a busca é sempre
  contra o catálogo inteiro; agrupar por categoria é só a apresentação com o campo
  vazio (ver "Comportamento esperado").
- Edição do SVG dentro do app (recolorir, remover partes).
- Catálogo remoto / baixado sob demanda. O catálogo é embutido no build.

## Comportamento esperado

- A paleta lista os ícones disponíveis, filtrável por nome, agrupados em três
  seções: **Marcas**, **Genéricos** e **UML**. A busca com o campo vazio mostra as
  três seções separadas, nessa ordem — marcas primeiro, é o diferencial declarado
  do produto (ver `docs/overview.md`); buscando um termo, a lista fica achatada — a
  pessoa já reduziu sozinha, e uma seção vazia entre duas com resultado só
  atrapalha.
- **UML** cobre notação básica que É um ícone de verdade — um símbolo fixo, sem
  conteúdo próprio: ator, interface (lollipop), pacote (pasta com aba), nota
  (canto dobrado), componente (conectores laterais). Os símbolos que TÊM conteúdo
  estruturado ficam de fora deste catálogo, por não serem ícone:
  - **Caso de uso** é a elipse (ferramenta de forma, `O`) — duplicar como ícone
    arrastável só daria duas formas de chegar no mesmo resultado.
  - **Classe** é a ferramenta de forma `C` (`ShapeKind: "umlClass"`), não um ícone —
    tem três compartimentos de texto (nome, atributos, métodos), e um ícone estático
    não tem onde guardar isso. Ver `editor/formas-e-texto.md`.
- Arrastar um ícone (de qualquer seção) para o canvas cria **um nó**, num gesto. Não
  existe passo de criar forma e depois associar ícone.
- O usuário pode subir o próprio SVG, que passa a se comportar como qualquer ícone
  do catálogo.
- O `.json` exportado abre noutra máquina sem ícone quebrado, mesmo se aquela versão
  do app tiver um catálogo diferente.
- **Busca por sinônimo**: cada ícone curado carrega, além do nome, uma pequena lista
  de termos que uma pessoa digitaria pensando no CONCEITO em vez do nome exato — e
  qualquer um deles conta como resultado, igual a bater no nome. As duas direções do
  mesmo problema:
  - **Um logo ganha sinônimos de conceito**: buscar "cache" mostra o Redis (ele não
    se chama "cache" em lugar nenhum do nome ou do slug); buscar "fila" mostra
    Kafka e RabbitMQ; buscar "nosql" mostra o MongoDB.
  - **Um ícone genérico ganha sinônimos de tecnologia**: buscar "redis" mostra,
    além do logo, o ícone genérico "Cache"; buscar "kafka" mostra, além do logo, o
    genérico "Fila / Message Broker" — quem não lembra o nome da marca ainda acha
    alguma coisa pra representar o conceito.
  - A lista é curada por quem mantém o catálogo, não gerada — cada entrada nova
    (`docs/specs/assets/catalogo-e-logos.md` não lista os termos; eles vivem junto
    do ícone em `infrastructure/icons/*.ts`) é uma decisão consciente do que uma
    pessoa razoavelmente digitaria.

## Fluxo do usuário

1. Abre a paleta de logos e digita "post".
2. Arrasta o logo do PostgreSQL para o canvas.
3. Um nó de ícone é criado onde soltou, com tamanho padrão, e o rótulo entra em modo
   de edição embaixo dele.
4. Alternativo — logo próprio: escolhe "subir SVG", seleciona o arquivo. SVG inválido
   ou perigoso é recusado com mensagem; nada é inserido.

## Modelagem de domínio

- **`Asset`** (VO): `{ id: AssetId, kind: "svg", name, source, data }`.
- **`AssetTable`**: mapa `AssetId → Asset`, interno ao agregado `Diagram`. Ninguém
  de fora do agregado insere ou remove entrada direto.
- **`AssetId`** é o **hash do conteúdo** do SVG já sanitizado e normalizado.
- **Ports**: `IconCatalog` (lista e busca ícones disponíveis), `ContentHasher`
  (calcula o hash), `SvgSanitizer` (limpa SVG de origem externa).
- **Casos de uso**: `AddIconNode` (do catálogo), `ImportCustomIcon` (upload).
- **`CatalogIcon.category`** (`"brand" | "generic" | "uml"`) é metadado de exibição,
  só para a paleta agrupar — não existe em `Asset` nem no documento. Um nó de ícone
  de qualquer categoria é o mesmo tipo de nó (`content.kind === "icon"`), tratado
  identicamente por todo o resto do app: mesmo redimensionamento, mesma
  deduplicação, mesma coleta de asset órfão.
- **`CompositeIconCatalog`** junta várias fontes (`SimpleIconsCatalog` para marcas,
  `GenericIconCatalog` para símbolos, `UmlIconCatalog` para notação) numa
  `IconCatalog` só — a paleta e o caso de uso continuam vendo uma única fonte, sem
  saber quantas existem por trás.
- **Palavra-chave de busca não é campo de `CatalogIcon`.** Cada catálogo guarda a
  lista de sinônimos por `slug` internamente (um `Map` privado, ao lado da lista
  curada) e só a consulta DENTRO do próprio `search()` — a paleta, o caso de uso e o
  documento nunca veem essa lista, porque nenhum deles precisa saber POR QUE um ícone
  apareceu num resultado, só que apareceu. Mesmo raciocínio de `category`: metadado
  que serve a UMA camada, não sobe pro `Asset` nem pro documento.

Hash e sanitização são **ports**, não código de domínio: um depende de WebCrypto, o
outro de parsing de DOM. O caso de uso os chama na borda e entrega ao agregado um
`Asset` já pronto e já limpo — o domínio continua puro e testável em Node.

## Regras de negócio

- **Deduplicação por conteúdo.** Mesmo SVG inserido 20 vezes = uma entrada na tabela
  e 20 nós apontando para ela. Como o id é hash do conteúdo, a dedupe também funciona
  ao **importar ou mesclar** documentos de origens diferentes, e sobrevive a uma
  troca de versão do catálogo.
- `name` e `source` são metadado de UI. **Não** entram na identidade: o mesmo desenho
  vindo do catálogo e de um upload é o mesmo asset.
- **Asset órfão não existe** — invariante do agregado, não rotina de limpeza.
- Inserir logo do catálogo **copia** o SVG para o documento. A partir daí o arquivo
  não depende mais do catálogo.
- Logo do catálogo é conteúdo confiável (embutido no build). Upload do usuário e
  `.json` importado **não** são.
- **Ícone genérico usa uma cor fixa única**, igual para os catorze — não tem cor de
  marca própria, e a cor única é o que faz o olho reconhecer "isto é genérico" por
  contraste com as cores reais dos logos ao lado na paleta.

## Segurança: sanitização de SVG

O renderer é DOM. **SVG não sanitizado é XSS de verdade**, não risco teórico.

- Todo SVG de origem externa passa pelo `SvgSanitizer` **antes de entrar na tabela**.
  Sanitizar na entrada, e não no render, faz o invariante valer para o documento
  guardado: o que está na tabela já está limpo.
- Removidos: `<script>`, atributos `on*`, `<foreignObject>`, `<use href>` externo,
  `xlink:href` para fora do documento, `<image href>` remoto, `<style>` com `@import`,
  URLs `javascript:` e `data:` não-imagem.
- **Origem externa inclui o `.json` importado**, não só o upload — documento recebido
  de outra pessoa é entrada não confiável.
- Sanitizador que rejeita conteúdo legítimo é aceitável; sanitizador permissivo, não.

## Licenciamento

Duas fontes, duas restrições diferentes:

- **Marcas** (`SimpleIconsCatalog`, a partir do simple-icons) são **marcas
  registradas** dos seus donos. Os arquivos são CC0, a marca não é. Usar o logo para
  identificar a tecnologia num diagrama é uso nominativo. O app não altera logo do
  catálogo nem sugere endosso da empresa.
- **Genéricos** (`GenericIconCatalog`, todo do [lucide](https://lucide.dev), licença
  ISC) e **UML** (`UmlIconCatalog`, só o ator vem do lucide — interface, pacote,
  nota e componente são desenhados à mão neste projeto, por não existirem prontos
  com a notação certa) **não são marca de ninguém** — são símbolos de conceito
  (servidor, fila, ator…), então a restrição acima não se aplica: podem ser usados,
  alterados e redistribuídos livremente. O que vem do lucide exige manter o aviso
  de copyright dele em algum lugar acessível do projeto (já cumprido por este
  documento e pelo `package.json`); o que é desenho próprio deste projeto não
  carrega restrição nenhuma do lucide, porque não é lucide.

## Estados de UI

- Carregando: catálogo é embutido — não há estado de carregamento.
- Vazio: busca sem resultado oferece "subir meu SVG".
- Erro: SVG recusado explica o motivo (inválido, ou continha script/conteúdo remoto).
- Sucesso: nó criado e já selecionado, com o rótulo em edição.

## Impacto no documento

- Campos: a tabela `assets` e o `content.assetId` dos nós de ícone.
- `schemaVersion`: sem mudança — faz parte do v1.
- Remoção: o último nó que referenciava um asset leva o asset junto.
- Export/import: `.json` autocontido; import sanitiza todos os assets recebidos.

## Impacto por camada

- `domain/`: `Asset`, `AssetTable`, invariantes 3 e 4, ports.
- `application/`: `AddIconNode`, `ImportCustomIcon`.
- `infrastructure/`: `SimpleIconsCatalog` (marcas), `GenericIconCatalog` (símbolos),
  `UmlIconCatalog` (notação de UML), `CompositeIconCatalog` (junta as três), hasher
  (WebCrypto), sanitizador. Os três catálogos curados carregam a lista de sinônimos
  por ícone (`keywords`) junto da própria entrada curada — não é arquivo à parte.
- `presentation/`: paleta com as três seções, busca, arrastar-para-o-canvas, upload.
- Performance: um asset por ícone distinto; SVGs de ícone são de poucos KB.

## Critérios de aceite

- [ ] Arrastar um logo da paleta cria um nó de ícone em um gesto.
- [ ] Dois nós do mesmo logo compartilham uma única entrada de asset.
- [ ] Apagar o último nó de um logo remove o asset; apagar um de dois, não.
- [ ] Importar dois documentos com o mesmo logo resulta em uma entrada só.
- [ ] SVG com `<script>` ou handler `on*` é recusado no upload.
- [ ] `.json` importado com SVG malicioso é sanitizado ou rejeitado — nunca renderizado.
- [ ] `.json` exportado abre em instalação limpa, sem logo quebrado.
- [x] A paleta mostra "Marcas", "Genéricos" e "UML" como seções separadas com o
      campo de busca vazio, e uma lista achatada (sem seções) ao digitar um termo.
- [x] Arrastar um ícone genérico ou de UML cria um nó igual ao de um logo de marca
      — mesmo gesto, mesmo tipo de nó.
- [x] O SVG de um ícone genérico ou de UML chega ao canvas com `viewBox` intacto e
      sem `currentColor` (que resolveria para preto dentro do `<image>` isolado).
- [x] Buscar "cache" mostra o Redis, mesmo sem "cache" aparecer no nome ou no slug
      dele.
- [x] Buscar o nome de uma marca (ex.: "redis", "kafka") também mostra o ícone
      genérico equivalente, quando existe um ("Cache", "Fila / Message Broker").
- [x] Busca por palavra-chave é insensível a maiúsculas/minúsculas, igual à busca
      por nome.

## Questões em aberto

- [ ] Biblioteca de sanitização: DOMPurify (`USE_PROFILES: {svg: true}`) ou allowlist
      própria mais restritiva?
- [ ] O catálogo embutido entra inteiro (~3k ícones) ou um subconjunto curado de
      tecnologias de infraestrutura?
