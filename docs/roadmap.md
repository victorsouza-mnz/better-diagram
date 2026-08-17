# Roadmap

Ordem de implementação do que falta. É o **único documento do projeto que olha para
frente** — specs e `architecture.md` descrevem o estado atual, este descreve a fila.

Ele **encolhe**: etapa entregue sai daqui e vira spec `implemented` no
[`specs/index.md`](specs/index.md). Não é changelog — o histórico é o `git log`.

Cada etapa diz o que entra, a decisão que precisa ser fechada antes, e quando está
pronta. Etapas marcadas com **spec pendente** exigem escrever a spec primeiro
(passo 3 do pipeline no [`AI_GUIDE.md`](../AI_GUIDE.md)).

---

## 1. Estilo por elemento — cor livre e fonte, **spec pendente**

Cor à escolha e fonte. Preenchimento/contorno de FORMA já existe — três aparências
fixas (preenchida / contorno / tracejada), `Ctrl`+clique no canvas ou pelo painel de
propriedades (`editor/formas-e-texto.md`, `ui/painel-propriedades.md`) — e não subiu
`schemaVersion` (campo aditivo com padrão seguro, mesma técnica de sempre). O que
falta é cor à escolha da pessoa e fonte — um espaço aberto, não um preset fechado.

Cor/fonte livres são as que provavelmente **sobem `schemaVersion` para 2** e estreiam
a cadeia de migração em `domain/migration/` — um preset fechado (como os três
estilos de forma) não precisa disso, mas "qualquer cor" é um formato de campo
diferente o bastante para valer a pena decidir com calma, não assumir de antemão.

**Decisão a fechar na spec:** o que é customizável pelo usuário e o que é do design
system. Liberar tudo é o caminho para diagramas feios e para um painel infinito.

---

## 2. Refinos do canvas

Pequenos, já specados em
[`editor/canvas-selecao-e-arrasto.md`](specs/editor/canvas-selecao-e-arrasto.md), e
bons para intercalar entre as etapas grandes:

- Atalhos que faltam: `H`, `Ctrl/Cmd+A`, `Ctrl/Cmd+0`, `Ctrl/Cmd+1`.
- Pan com espaço+arrasto e com o botão do meio.
- Ordenação `z` pela interface (trazer para frente, enviar para trás).
- Snap a grid — questão em aberto na spec, decidir o passo.

---

## 3. Upload de SVG próprio

Specado em [`assets/catalogo-e-logos.md`](specs/assets/catalogo-e-logos.md), mas
**bloqueado por uma decisão de segurança**: o sanitizador atual é uma allowlist
própria, escrita para o catálogo embutido. Antes de aceitar SVG arbitrário de
usuário final, ele precisa ser revisado ou trocado por DOMPurify.

Enquanto essa decisão não for tomada, esta etapa não sobe.

---

## 4. Export PNG/SVG — **spec pendente**

Export SVG é quase o próprio render; PNG sai de um canvas intermediário. Depende de
o desenho estar estável — daí vir depois de arestas, formas e estilo.

---

## 5. Design system — **spec pendente**

O CSS de hoje é ad hoc. Tokens e componentes-base, no domínio `ui`. Vale fazer
depois que o painel de propriedades (etapa 1) mostrar de quantos componentes o app
realmente precisa.

---

## 6. Grupos (v2)

O caso da caixa contendo um logo — o retângulo "VPC" com o ícone da AWS. Adiado
conscientemente do v1: entra por migração aditiva, sem mexer em nó nem aresta
existentes, e acrescenta invariantes ao agregado (nó pertence a no máximo um grupo;
apagar o grupo não apaga os filhos).

---

## Fora da fila: decisão de produto pendente

**Logos da AWS.** A Amazon pediu a remoção das próprias marcas do `simple-icons`,
então o catálogo não tem AWS nem seus serviços — justamente os mais comuns num
diagrama de arquitetura. Cobrir isso exige outra fonte (a AWS distribui os
"Architecture Icons" sob termos próprios) e é decisão de produto, não de
implementação. Não bloqueia nenhuma etapa, mas limita o produto.
