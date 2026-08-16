# Spec: Undo / redo

**Domínio:** editor  
**Status:** ready

## Objetivo

Desfazer e refazer qualquer mudança do documento, de forma que a unidade desfeita
seja a **intenção do usuário** — não o passo interno que o código deu para
realizá-la.

## Não-objetivos

- **Histórico persistido.** A pilha morre com a sessão: fechar a aba e reabrir
  devolve o diagrama, não o histórico. Já é não-objetivo na spec de persistência.
- **Histórico ramificado** (árvore de undo, tipo Vim). Uma edição nova descarta o
  refazer pendente, como em qualquer editor.
- **Painel de histórico** listando as ações. Os rótulos são registrados desde já,
  mas a tela que os mostra não faz parte desta entrega.

## Contexto

Todo o código escrito até aqui já assume que **uma interação é uma entrada de
histórico**: arrastar cinco nós por duzentos frames executa `MoveNodes` uma única
vez, ao soltar. Esta spec é o momento de validar essa suposição enquanto ela custa
sete casos de uso, e não quinze.

## Comportamento esperado

- `Ctrl/Cmd+Z` desfaz a última mudança de documento; `Ctrl/Cmd+Shift+Z` refaz.
- Desfazer devolve **também a seleção** que existia quando aquela mudança foi feita.
- Pan, zoom e mudança de seleção não criam entrada e não são desfeitos.
- Uma edição nova descarta o refazer pendente.
- Depois de desfazer, o autosave grava o estado resultante — desfazer é uma mudança
  como outra qualquer, do ponto de vista de quem persiste.

## Modelagem de domínio

Nada novo no domínio. O histórico é **de aplicação**: ele orquestra estados do
agregado, sem acrescentar regra a ele.

- **`HistoryEntry`** — `{ diagram, selection, label }`.
- **`History`** — `{ past[], present, future[] }`, imutável, com limite de
  profundidade. Vive em `application/history/`.
- Sem ports novas.

### Snapshot, não comando inverso

**Decisão: snapshot.** Cada entrada guarda a referência para um `Diagram` inteiro.

O agregado já é imutável, então o snapshot **não custa cópia nenhuma**: o estado
anterior continua existindo, intacto, e guardá-lo é guardar um ponteiro. O que uma
operação copia são os três `Map` do agregado — e eles copiam *referências*, não
conteúdo. Os `Asset`, que são a parte pesada (o SVG é uma string de vários KB), são
compartilhados entre todas as entradas: o mesmo objeto, apontado por todas.

Comando inverso economizaria os "espinhos" dos `Map` (uns poucos KB por entrada num
diagrama de centenas de nós) e cobraria uma inversa correta **para cada operação
nova, para sempre**. Uma inversa errada corrompe o documento de um jeito que só
aparece depois de dois undos — o pior tipo de bug para reproduzir. O preço não paga
o risco nesta escala.

**Limite: 100 entradas.** Passou disso, a mais antiga sai.

### A seleção volta junto

**Decisão: sim.** Desfazer uma deleção sem devolver a seleção deixa a pessoa sem
saber o que voltou — ela precisa caçar visualmente o que reapareceu. Guardar a
seleção junto da entrada também a mantém consistente por construção: a seleção
gravada é a daquele estado, então nunca aponta para um nó que não existe nele.

Por segurança, ao restaurar, ids que não existam mais no diagrama são descartados.

## Regras de negócio

- **Só mudança de documento entra no histórico.** Pan, zoom, seleção e ferramenta
  ativa são estado de sessão.
- **Uma interação = uma entrada.** Arrastar cinco nós é "Mover", uma vez.
- **Importar um `.json` É desfazível.** Substitui o documento inteiro, e é
  exatamente a operação em que se descobre o erro tarde demais. Vira uma entrada
  rotulada "Importar".
- **A carga inicial NÃO é entrada.** O diagrama lido do IndexedDB é o estado base do
  histórico, com `past` e `future` vazios — não há o que desfazer numa sessão que
  acabou de abrir.
- **Undo é ignorado durante um arrasto em curso.** O arrasto carrega os ids dos nós
  que está movendo; desfazer no meio poderia apagar justamente esses nós, e o commit
  ao soltar falharia com "nó não encontrado". `Esc` continua sendo a forma de
  cancelar um arrasto.
- Nada define o diagrama fora do ponto único de commit — ver guardrails.

## Interação no canvas

- **Atalhos:** `Ctrl/Cmd+Z` desfaz · `Ctrl/Cmd+Shift+Z` refaz · `Ctrl+Y` refaz
  (alias comum no Windows/Linux).
- **Feedback:** o canvas muda; não há animação nem aviso. Undo silencioso é o
  esperado — qualquer confirmação atrapalha a repetição rápida do atalho.
- **Rótulos** registrados por operação: "Adicionar logo", "Mover", "Redimensionar",
  "Conectar", "Apagar", "Renomear", "Importar".

## Estados de UI

- Vazio: sem nada para desfazer, o atalho não faz nada e nada é sinalizado.
- Erro: não se aplica — desfazer não pode falhar; restaura um estado que já existiu.

## Impacto no documento

**Nenhum.** O histórico é estado de sessão: não entra no JSON, não sobe
`schemaVersion`, não é gravado no IndexedDB. Um documento não carrega o rastro de
como chegou ao que é — isso é o `git log` do projeto, não o arquivo do usuário.

## Impacto por camada

- `domain/`: nada.
- `application/`: `history/` — `History` e `HistoryEntry`.
- `infrastructure/`: nada.
- `presentation/`: a sessão passa a manter `History` em vez de um `Diagram` solto;
  atalhos de teclado.
- Performance: 100 entradas × os `Map` de um diagrama de centenas de nós. Os assets
  são compartilhados por referência, então o SVG não é duplicado nenhuma vez.

## Restrições de implementação (guardrails)

- **Um ponto único de commit.** A sessão expõe um `commit(diagram, label)` que grava
  o novo estado **e** empilha a entrada. Nada mais pode chamar `setDiagram`. Sem
  isso, uma feature futura muda o documento sem passar pelo histórico, e a pessoa só
  descobre quando o `Ctrl+Z` pula uma ação.
- O histórico não conhece React: `History` é uma classe testável em Node puro.
- Desfazer não pode disparar o caso de uso de novo — restaura o estado guardado, não
  recalcula.

## Critérios de aceite

- [ ] Arrastar 5 nós selecionados e desfazer devolve os 5 de uma vez.
- [ ] Apagar uma seleção e desfazer devolve os nós **e** a seleção.
- [ ] Apagar o último nó de um logo e desfazer devolve o asset à tabela.
- [ ] Pan, zoom e clique de seleção não criam entrada de histórico.
- [ ] Desfazer, depois editar, descarta o refazer pendente.
- [ ] Importar um arquivo e desfazer devolve o diagrama anterior.
- [ ] Abrir o app e apertar `Ctrl+Z` não faz nada.
- [ ] `Ctrl+Z` no meio de um arrasto é ignorado, e o arrasto termina normalmente.
- [ ] Passar de 100 entradas descarta a mais antiga, sem quebrar o refazer.
- [ ] Depois de desfazer, o autosave grava o estado resultante.

## Questões em aberto

- [ ] Botões de desfazer/refazer na toolbar, ou só atalho? (Só atalho descobre-se
      mal; botão ocupa espaço numa toolbar que ainda vai receber ferramentas.)
