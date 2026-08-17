# Specs Index

Índice de todas as especificações do projeto. Ao criar uma nova spec, adicione uma
linha na tabela.

Cada spec descreve uma **feature** — o quê, as regras, e o que a tela mostra. Não há
spec de layout separada: o produto tem uma superfície só (o app web), então os
estados de UI vivem na própria spec da feature.

Como criar ou atualizar uma spec: skill `criar-spec`
(`.claude/skills/criar-spec/SKILL.md`).

Domínios previstos: `editor` (canvas, ferramentas, seleção), `documento` (modelo de
dados, schema e migrações), `assets` (catálogo de logos, upload, sanitização),
`persistencia` (IndexedDB, export/import), `ui` (toolbar, painéis, design system).

---

## Features

| Domínio | Feature | Arquivo | Status |
|---------|---------|---------|--------|
| `documento` | Documento v1 — modelo do diagrama | [documento/schema-v1.md](documento/schema-v1.md) | implemented — migrações só ganham sentido no v2 |
| `assets` | Catálogo de logos e tabela de assets | [assets/catalogo-e-logos.md](assets/catalogo-e-logos.md) | implemented — falta upload de SVG próprio |
| `editor` | Canvas — navegação, seleção e arrasto | [editor/canvas-selecao-e-arrasto.md](editor/canvas-selecao-e-arrasto.md) | implemented — falta a ferramenta mão (`H`), `Ctrl/Cmd+A` e `Ctrl/Cmd+0/1` |
| `editor` | Undo / redo | [editor/undo-redo.md](editor/undo-redo.md) | implemented |
| `editor` | Conectar nós — arestas | [editor/conectar-nos.md](editor/conectar-nos.md) | implemented — rótulo de aresta é desenhado, mas ainda não editável |
| `editor` | Formas, texto e edição de rótulo | [editor/formas-e-texto.md](editor/formas-e-texto.md) | implemented |
| `editor` | Redimensionar por alças | [editor/redimensionar.md](editor/redimensionar.md) | implemented |
| `persistencia` | Autosave local e arquivo `.json` | [persistencia/autosave-e-arquivo.md](persistencia/autosave-e-arquivo.md) | implemented |
| `ui` | Tema claro/escuro | [ui/tema-claro-escuro.md](ui/tema-claro-escuro.md) | implemented |
| `ui` | Painel de propriedades lateral | [ui/painel-propriedades.md](ui/painel-propriedades.md) | implemented — alinhamento de texto, estilo de aresta e estilo de forma; outros controles ficam para quando existirem |
