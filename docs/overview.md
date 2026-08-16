# UML — Visão Geral do Projeto

Editor de diagramas no navegador, na mesma família de drawio, Excalidraw e Canva —
porém **mais simples e com UX melhor**. A aposta do produto não é ter mais features
que os concorrentes: é ter menos, e as certas, com atrito baixo.

## O que ele é

- Um **editor de canvas** que roda inteiro no navegador.
- **Diagrama com logos de tecnologia, não com caixas e setas.** Um diagrama de
  arquitetura fica legível quando o Redis parece o Redis e o Postgres parece o
  Postgres. Um catálogo de logos de primeira classe é o diferencial do produto —
  não um enfeite adicionado depois. **Logo é um nó**: arrastar o Redis da paleta
  cria o nó em um gesto, sem caixa intermediária para pendurar o ícone.
- **Símbolos genéricos completam o que não tem marca.** Nem todo elemento de um
  diagrama de arquitetura é uma tecnologia específica — "servidor", "banco de
  dados", "fila", "load balancer" são conceitos, não empresas. A paleta separa os
  dois: marcas de um lado, genéricos do outro, e os dois criam nó do mesmo jeito.
- **Local-first**: sem conta, sem login, sem rede no caminho de salvar. O diagrama é
  do usuário, no navegador dele.
- **Documento portável e autocontido**: cada diagrama é um objeto JSON com
  `schemaVersion` e os logos embutidos, exportável e importável como `.json`. Abre em
  qualquer máquina sem ícone quebrado.

## O que ele não é

Não-objetivos ajudam mais que features numa fase inicial:

- **Não é colaboração em tempo real.** Enquanto não houver backend, não há sessão
  compartilhada nem cursor de outra pessoa.
- **Não é substituto de drawio em cobertura.** Paridade de features não é meta;
  cada forma ou ferramenta nova precisa se pagar em uso real.
- **Não tem conta de usuário.** Sem auth, sem perfil, sem sincronização entre
  dispositivos — o usuário leva o diagrama pelo arquivo.

## Stack

| Camada        | Escolha                                    |
|---------------|--------------------------------------------|
| App           | SPA web — Vite + React + TypeScript         |
| Arquitetura   | Clean Architecture + DDD (treino consciente)|
| Render        | SVG (nós no DOM)                            |
| Documento     | JSON com `schemaVersion` + tabela de assets |
| Storage       | IndexedDB + export/import `.json`           |
| Backend       | não existe — decisão consciente             |

Detalhes técnicos e padrões de código: [`architecture.md`](architecture.md).

Clean Architecture e DDD estão aqui **por objetivo de treino**, não porque o tamanho
do produto exija. Vale dizer isso em voz alta: assim ninguém no futuro lê a cerimônia
como resposta a um requisito que não existiu.

## Por que não tem backend

Um diagrama é **um documento**, não um conjunto de entidades relacionadas — não há
query relacional interessante a fazer sobre uma lista de formas. Um backend (ou um
SQLite no browser) cobraria complexidade de build, deploy e schema para guardar um
JSON que o navegador já guarda bem sozinho.

Backend entra quando aparecer o requisito que **só** ele resolve: conta de usuário,
link compartilhável ou colaboração ao vivo. Como o documento já é JSON serializável,
esse acréscimo é sincronização do mesmo documento — não um segundo modelo de dados.

## Processo

Como trabalhar neste repositório está em [`../AI_GUIDE.md`](../AI_GUIDE.md).
As especificações vivem em [`specs/index.md`](specs/index.md).
