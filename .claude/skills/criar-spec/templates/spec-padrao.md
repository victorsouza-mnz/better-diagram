<!-- Remova as seções que não se aplicam. Uma spec é espelho enxuto do estado atual,
     não um checklist a preencher. Menos, e certo, é melhor que completo e morto. -->

# Spec: <Nome da Feature>

**Domínio:** <domínio>  
**Status:** draft | ready | implemented

## Objetivo
Qual problema resolve e qual resultado de produto é esperado.

## Não-objetivos
O que explicitamente **não** faz parte desta entrega.

## Contexto
Contexto atual, dores, decisões anteriores relevantes.

## Comportamento esperado
- Lista de comportamentos observáveis pelo usuário.

## Fluxo do usuário
Fluxo ponta a ponta:

1. Gatilho inicial
2. Passos principais
3. Resultado esperado
4. Fluxos alternativos / erros

## Interação no canvas (se for ferramenta ou gesto)
- Gatilho (clique, arrasto, tecla):
- Feedback durante a interação (preview, cursor, guias):
- Como cancela (Esc / clique fora):
- Atalho de teclado: <tecla> | não tem
- Undo/redo: entra no histórico como uma ação? Qual o rótulo dela?

## Regras de negócio
- Regra 1:
- Regra 2:

## Estados de UI
- Carregando:
- Vazio (canvas sem nada, painel sem seleção):
- Erro:
- Sucesso:

## Modelagem de domínio
<!-- O que esta feature acrescenta ao modelo, no vocabulário do DDD. Remova as
     linhas que não se aplicam — nem toda feature toca o domínio. -->
- Entidades / value objects novos ou alterados:
- Invariantes que o agregado `Diagram` passa a garantir:
- Casos de uso (um por intenção do usuário):
- Ports novas (repositório, serviço externo) — em `application/ports/`, salvo se o
  próprio domínio a invocar:

## Impacto no documento
<!-- Só estado do diagrama entra aqui. Zoom, seleção, ferramenta ativa e undo são
     estado de sessão e NÃO são gravados no documento. -->
- Campos novos/alterados no JSON:
- `schemaVersion` sobe? Se sim, qual a migração para documentos antigos:
- Assets (se envolve logo/ícone): o que entra na tabela, e o que remove a entrada:
- Efeito em export/import `.json`:

## Impacto por camada
- `domain/`:
- `application/`:
- `infrastructure/`:
- `presentation/`:
- Performance de render (quantos nós SVG no pior caso? precisa virtualizar?):

## Restrições de implementação (guardrails)
- Contratos que **não** podem quebrar:
- Regras de arquitetura:
- Dependências obrigatórias / proibidas:
- Limites de performance e acessibilidade:

## Critérios de aceite
- [ ] Critério 1
- [ ] Critério 2

## Questões em aberto
- [ ] Pergunta 1
- [ ] Pergunta 2

## Compatibilidade (se necessário)
- Documentos salvos por versões anteriores continuam abrindo:
- Migração:
- Plano de reversão (rollback):
