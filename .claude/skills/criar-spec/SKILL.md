---
name: criar-spec
description: >-
  Use ao criar ou atualizar uma spec em docs/specs/ — feature nova, ferramenta
  nova do editor, mudança no formato do documento, ou alteração estrutural de
  layout/design system. Contém o template de spec, a regra de quando uma spec é
  obrigatória e a regra de que uma spec descreve o estado atual, não o histórico.
---

# Criar ou atualizar uma spec

Esta skill cobre o passo **CHECAR SPEC** do pipeline do projeto. Carregue-a sempre
que a tarefa criar ou editar uma spec em `docs/specs/`.

## Quando uma spec é obrigatória (inclui mudanças puramente visuais)

Spec **não é só para feature grande**. O gatilho é estrutural, não o prefixo do
commit (`feat:` vs `style:` é irrelevante). Precisa de spec sempre que a tarefa:

- criar uma **ferramenta ou modo de interação novo** no canvas (nova forma,
  conector, seleção múltipla, snap, agrupamento);
- alterar o **formato do documento** — campo novo, campo removido, mudança de
  semântica de campo existente;
- fizer alterações estruturais de **layout** — mover ou desligar uma feature,
  mexer em componentes estruturais compartilhados (toolbar, painel de
  propriedades, menu de contexto, atalhos globais);
- introduzir ou alterar de forma relevante o **design system** (tokens,
  componentes-base);
- mudar como o diagrama é **persistido, exportado ou importado**.

**Não** precisa de spec para ajustes cosméticos isolados que não mudam estrutura
nem comportamento — ex.: trocar um ícone, ajustar espaçamento de um elemento já
existente, corrigir um contraste. Na dúvida, trate como "precisa".

Fluxo:

1. Abra `docs/specs/index.md` e verifique se já existe uma spec para a feature.
2. **Se existir:** leia o arquivo e **reescreva** o trecho afetado (ver "Estado
   atual, não histórico" abaixo). Não anexe o que mudou.
3. **Se não existir:** crie a spec com o template, confirme com o usuário e só
   depois implemente.

## Template

Há **um template só**: [`templates/spec-padrao.md`](templates/spec-padrao.md).
Copie o conteúdo dele para o novo `.md`, crie em
`docs/specs/<domínio>/<nome-da-feature>.md` (ex.: `editor`, `documento`,
`persistencia`, `export`) e adicione uma linha na tabela de `docs/specs/index.md`.

O produto tem **uma superfície** — o app web. Por isso o que a tela mostra não vira
spec separada: vive na seção "Estados de UI" da própria spec da feature. Um segundo
template de layout só se justifica quando duas superfícies podem divergir; enquanto
não existir a segunda, separar só espalha a mesma verdade em dois arquivos.

## Três coisas que toda spec deste projeto precisa responder

O produto é um editor de canvas local-first em Clean Architecture, e estas são as
perguntas que mais voltam como bug depois de implementadas:

- **Em que camada nasce a regra?** A spec diz o que é invariante de domínio, o que é
  caso de uso, o que é adaptador e o que é só desenho. Regra de negócio descrita como
  comportamento de componente React nasce no lugar errado e depois não sai de lá.
- **O que isso grava no documento?** Se a feature adiciona ou muda campo do JSON,
  a spec diz qual campo, com que semântica, e se `schemaVersion` sobe. Estado de
  sessão (zoom, seleção, ferramenta ativa, undo) **não** entra no documento — se a
  spec propõe gravar algo assim, ela está errada, não o código.
- **Como se chega nisso sem o mouse?** Toda ferramenta ou comando declara o atalho
  de teclado, ou declara explicitamente que não tem.

Se a feature mexe com **logos ou assets**, some uma quarta: o SVG entra na tabela de
assets endereçado por hash, e a spec diz o que acontece com ele quando o último nó
que o usava é apagado (resposta padrão: sai junto — é invariante do agregado).

## Estado atual, não histórico

Uma spec responde **"como isso funciona hoje?"** — nunca "o que mudou desde a última
versão?". O histórico do projeto é o `git log`; narrá-lo em prosa cria duas fontes de
verdade, e a prosa é a que apodrece. Pior: o histórico só cresce, e uma mudança que
depois for revertida deixa dois parágrafos contraditórios na spec.

Ao atualizar uma spec existente, **reescreva** o trecho afetado. Não faça:

- ~~texto riscado~~ mantido "para registro";
- parágrafos "antes era X, agora é Y", "isto foi corrigido depois";
- seções "Atualização:", "Gap conhecido", "Achado que precisou ser corrigido";
- critérios de aceite obsoletos preservados e anotados como revertidos;
- referências a arquivos/funções que não existem mais, mesmo explicando que foram
  removidos.

Se um comportamento deixou de existir, o texto que o descrevia **sai** da spec.

### O que continua valendo a pena registrar

O **porquê** de uma decisão, quando ele guia decisões futuras — escrito no presente:

> O documento não guarda zoom nem seleção: dois usuários abrindo o mesmo arquivo
> herdariam o scroll um do outro, e todo diff de documento viraria ruído.

Isso é regra viva — sem estar escrito, alguém repete o erro. Já "antes o zoom era
salvo junto e causava um bug" não muda nenhuma decisão futura.

### A exceção: decisões de arquitetura com alternativa descartada

Vale registrar historicamente uma decisão **grande**, em que uma alternativa concreta
foi avaliada e descartada por uma limitação clara — trocar de renderer (SVG ↔ canvas),
de storage, de biblioteca de geometria, ou introduzir backend. A pergunta "por que não
usamos X?" reaparece, e sem registro alguém refaz o caminho. Nesses casos registre: a
decisão, a limitação que a motivou e o que foi descartado. Não a sequência de commits
que levou até lá.

Evolução natural de uma feature — uma forma nova, um atalho que faltava, um campo
novo — **não** é esse caso.
