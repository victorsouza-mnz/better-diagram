# Spec: Persistência — autosave local e arquivo `.json`

**Domínio:** persistencia  
**Status:** draft

## Objetivo

O usuário nunca perde trabalho por fechar a aba, e consegue levar o diagrama embora
como arquivo. Sem conta, sem servidor.

## Não-objetivos

- Sincronização entre dispositivos, conta de usuário, link compartilhável.
- Histórico de versões persistido — undo é da sessão e morre com ela.
- Export para PNG/SVG (spec própria).

## Comportamento esperado

- O app reabre no diagrama onde o usuário parou, sem pedir nada.
- Toda mudança de documento é gravada localmente, com debounce.
- Exportar baixa um `.json` autocontido; importar abre um `.json` desses.

## Fluxo do usuário

1. Abre o app: carrega o último diagrama do IndexedDB; se não houver, cria um vazio.
2. Edita: cada operação agenda gravação (debounce ~500ms).
3. Fecha a aba e reabre: está tudo lá.
4. "Exportar": baixa `<nome>.json`.
5. "Importar": escolhe um `.json`; se for inválido, o diagrama atual **não** é
   substituído e o erro é mostrado.

## Modelagem de domínio

- **Port `DiagramRepository`**: `load(id)`, `save(diagram)`, `list()`. Declarado em
  `domain/ports/`, em vocabulário de domínio — não sabe o que é IndexedDB.
- **Adaptadores**: `IndexedDbDiagramRepository` (produção) e
  `InMemoryDiagramRepository` (testes de caso de uso).
- **Codec** em `infrastructure/file/`: serializa o agregado e, na leitura, **valida**
  antes de construir — documento que viola invariante é rejeitado, não carregado
  "quase certo".

## Regras de negócio

- Gravação é **debounced**, não por operação: arrastar 200 frames não gera 200
  gravações (e nem 200 operações — ver spec do canvas).
- Gravação falha (cota, modo privativo) avisa o usuário. Falha silenciosa em
  persistência é a que custa o trabalho da pessoa.
- Import valida `schemaVersion` **antes** do resto: versão futura recusa com mensagem
  clara, nunca parse parcial.
- Import sanitiza todos os assets recebidos — `.json` de terceiro é entrada não
  confiável (ver spec de assets).
- Import **não** sobrescreve o diagrama atual em caso de erro.
- `localStorage` não guarda diagrama: síncrono, limitado e só string. No máximo
  preferência de UI (tema, grid).

## Estados de UI

- Carregando: primeira abertura mostra o canvas já pronto; carregar é rápido.
- Vazio: nenhum diagrama salvo → diagrama novo, sem diálogo.
- Erro: falha de gravação vira aviso persistente com opção de exportar como arquivo.
- Sucesso: indicador discreto de "salvo" — sem modal, sem interromper.

## Impacto no documento

- Nenhum campo novo. Esta spec move o documento, não o altera.
- Estado de sessão continua fora: o zoom ao reabrir é o padrão, não o último usado
  (preferência de UI pode guardá-lo depois, fora do documento).

## Impacto por camada

- `domain/`: só o port `DiagramRepository`.
- `application/`: `SaveDiagram`, `LoadDiagram`, `ImportDocument`, `ExportDocument`.
- `infrastructure/`: adaptador IndexedDB, codec JSON, download/upload de arquivo.
- `presentation/`: menu de arquivo, indicador de salvo, avisos de erro.
- Performance: documento de KBs; gravação inteira a cada debounce é suficiente.

## Critérios de aceite

- [ ] Editar, fechar a aba e reabrir devolve o mesmo diagrama.
- [ ] Arrastar um nó por vários segundos gera uma gravação, não uma por frame.
- [ ] Exportar e reimportar produz um documento idêntico (round-trip).
- [ ] `.json` inválido não substitui o diagrama aberto e mostra erro.
- [ ] `.json` com `schemaVersion` futura é recusado com mensagem clara.
- [ ] Falha de gravação vira aviso visível, não silêncio.

## Questões em aberto

- [ ] Múltiplos diagramas no v1 ou um só? `list()` já está no port prevendo vários.
- [ ] Usar File System Access API (salvar por cima do arquivo aberto) onde houver
      suporte, ou só download/upload?
