# Spec: Documento v1 — modelo do diagrama

**Domínio:** documento  
**Status:** ready

## Objetivo

Definir o formato do diagrama: o que é um nó, o que é uma aresta, como logos são
guardados e como o documento evolui sem quebrar arquivos já salvos. É a spec base —
todas as outras dependem dela.

## Não-objetivos

- **Grupos** não existem no v1. A caixa contendo um logo (o "VPC" com o ícone da AWS)
  espera o v2. Adiar não gera dívida: grupo entra por migração aditiva, sem mexer em
  nó nem aresta existentes.
- Camadas (layers), travamento de elemento e comentários ficam fora.
- Estilo rico de texto (negrito por trecho) fica fora — rótulo é texto simples.

## Contexto

O produto monta diagramas de arquitetura com **logos de tecnologia**. Isso põe duas
exigências no formato que um editor de caixas-e-setas não teria: o logo precisa ser
um cidadão de primeira classe do modelo, e o arquivo precisa abrir noutra máquina com
os logos intactos.

## Comportamento esperado

- Um diagrama é um objeto JSON único, autocontido e serializável.
- Nós de ícone, forma e texto coexistem e se comportam igual para posicionar,
  selecionar, mover e conectar.
- Um arquivo salvo por uma versão anterior do app continua abrindo.

## Modelagem de domínio

### Agregado raiz: `Diagram`

Contém `nodes`, `edges` e `assets`. Carregado e salvo inteiro — a fronteira de
consistência é o documento todo, porque aresta referencia nó e nó referencia asset.

### Entidades

- **`Node`** — `id`, `rect`, `content`, `label`, `z`.
- **`Edge`** — `id`, `source: NodeId`, `target: NodeId`, `label`.

Estilo por elemento (cor, borda, fonte) **ainda não existe** — nem no modelo, nem em
spec. Entra por migração aditiva quando houver uma spec de estilo que diga o que é
customizável e o que é do design system.

### Value objects

- `NodeId`, `EdgeId`, `AssetId` — identidade tipada, não `string` solta.
- `Point`, `Size`, `Rect` — geometria imutável.
- **`NodeContent`** — união discriminada, o coração do modelo:

```ts
type NodeContent =
  | { kind: "icon";  assetId: AssetId }
  | { kind: "shape"; shape: "rect" | "ellipse" | "diamond" }
  | { kind: "text" }
```

Ícone é **variante irmã** da forma, não atributo dela. O modelo
`{ shape, icon?: IconRef }` está explicitamente rejeitado: obriga a criar uma caixa
antes de usar um logo e faz todo código ramificar em "tem ícone ou não".

O `Rect` pertence ao nó, não ao conteúdo — estar num plano é ter posição e tamanho,
igual para as três variantes.

### Invariantes do agregado

1. Toda `Edge` referencia dois `Node` existentes.
2. Deletar um `Node` remove as arestas incidentes.
3. Todo `content` de `kind: "icon"` aponta para um asset presente na tabela.
4. **Asset sem referência não existe.** Removeu o último nó que o usava, o asset sai.
5. `NodeId` e `EdgeId` são únicos no documento.
6. `Rect` tem largura e altura estritamente positivas.

Os invariantes 3 e 4 são derivados após cada operação: a tabela de assets é filtrada
pelo conjunto de `assetId` alcançável a partir dos nós. Contagem de referência
explícita seria mais rápida e erra em silêncio — o custo aqui é O(n) sobre dezenas de
nós, e a correção passa a ser estrutural.

### Casos de uso

`AddIconNode`, `AddShapeNode`, `MoveNodes`, `ResizeNode`, `ConnectNodes`,
`SetLabel`, `DeleteSelection`.

## Regras de negócio

- **Ícone redimensiona preservando proporção**; forma e texto, não. Logo esticado é a
  marca de outra pessoa deformada.
- **Aresta não conecta um nó a ele mesmo** no v1.
- **Aresta duplicada** (mesmo par, mesma direção) é permitida — dois canais entre os
  mesmos serviços são um caso real de diagrama de arquitetura.
- Âncora de aresta sai do bounding box do nó, sem consultar o `kind`.
- `z` define ordem de desenho; empate resolve por ordem de inserção.

## Formato JSON

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
    {
      "id": "n_01H…",
      "rect": { "x": 120, "y": 80, "w": 64, "h": 64 },
      "content": { "kind": "icon", "assetId": "sha256-3f9a…" },
      "label": "cache de sessão",
      "z": 0
    }
  ],
  "edges": [
    { "id": "e_01H…", "source": "n_01H…", "target": "n_02H…", "label": "TCP" }
  ]
}
```

## Impacto no documento

- Este documento **define** o `schemaVersion: 1`. Não há migração para o v1: arquivo
  sem `schemaVersion` é rejeitado como inválido, não adivinhado.
- `schemaVersion` é lido **antes** de qualquer parse do resto. Versão maior que a
  suportada dá erro claro ("arquivo criado numa versão mais nova"), nunca parse
  parcial silencioso.
- A cadeia de migrações vive em `domain/migration/` e é aplicada na leitura.

## Impacto por camada

- `domain/`: tudo desta spec. Entidades, VOs, agregado, invariantes, migrações.
- `application/`: os casos de uso listados.
- `infrastructure/`: codec JSON (serializar/desserializar + validar na borda).
- `presentation/`: nada — esta spec não desenha nada.
- Performance: agregado inteiro em memória; alvo de trabalho é centenas de nós.

## Restrições de implementação (guardrails)

- `domain/` não importa nada externo. Os testes rodam em Node puro, sem jsdom.
- Ids são VOs tipados; `string` crua não circula como identidade.
- Desserializar é **validar**: JSON de fora do app é entrada não confiável, e um
  documento que viola invariante é rejeitado, não carregado "quase certo".
- Estado de sessão (zoom, seleção, ferramenta, undo) **não** entra no documento.

## Critérios de aceite

- [ ] Criar nó de ícone, de forma e de texto, e todos aceitam mover, redimensionar e
      conectar pelas mesmas operações.
- [ ] Deletar um nó remove as arestas incidentes.
- [ ] Deletar o último nó que usava um logo remove o asset da tabela.
- [ ] Dois nós com o mesmo logo compartilham **uma** entrada de asset.
- [ ] Redimensionar nó de ícone preserva a proporção; de forma, não.
- [ ] Documento serializa e desserializa idêntico (round-trip).
- [ ] JSON com aresta apontando para nó inexistente é rejeitado na leitura.
- [ ] JSON sem `schemaVersion`, ou com versão futura, é rejeitado com erro claro.

## Questões em aberto

- [ ] Formato do id: ULID (ordenável, legível) ou UUID v4?
- [ ] `z` como inteiro esparso ou índice denso reordenado a cada operação?
