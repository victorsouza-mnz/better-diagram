# UML

Editor de diagramas de arquitetura no navegador, com **logos de tecnologia** em vez
de caixas e setas. Local-first: sem conta, sem backend.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

> **Atenção ao Node neste ambiente.** O `node` do PATH é o embutido do Cursor
> (v22.22.0), mas o `npm` resolve para o do nvm v8.11.4 — npm 5.6.0, que não roda com
> Node 22 (`cb.apply is not a function`). Use uma versão do nvm:
> `nvm use` (há um `.nvmrc`) ou prefixe o PATH com
> `/home/victor/.nvm/versions/node/v22.14.0/bin`.

## Comandos

| Comando | O quê |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes (domínio em Node puro, sem jsdom) |
| `npm run typecheck` | Typecheck do app **e** da pureza do domínio |
| `npm run build` | Build de produção |

## O que já funciona

Arrastar um ícone da paleta para o canvas, selecionar, mover (individual e em
conjunto), apagar, pan e zoom. A paleta tem duas seções: **Marcas** (logos de
tecnologia) e **Genéricos** (servidor, banco de dados, cache, fila/message broker,
load balancer, API gateway, firewall, CDN, rede, cliente, usuário, função
serverless, container, armazenamento — sem marca nenhuma, cor neutra própria).
Arrastar no vazio abre uma caixa de seleção — pega tudo que fica **inteiramente
dentro** dela (nó tocado pela metade fica de fora), e `Shift`+arrasto soma à seleção
em vez de substituir. Ícones são deduplicados no documento e coletados quando o
último nó que os usava sai.

**Persiste sozinho**: o diagrama é gravado no navegador com debounce e reabre onde
você parou. "Exportar" baixa um `.json` autocontido — com os logos embutidos, abre em
qualquer máquina; "Importar" traz de volta, recusando arquivo inválido sem
substituir o que está aberto.

**Desenhar**: `R` retângulo, `O` elipse, `D` losango, `T` texto — arraste para
definir o tamanho, ou clique para o padrão. Duplo clique em qualquer elemento edita o
rótulo (`Enter` quebra linha, `Esc` grava).

**Redimensionar**: selecione um elemento e arraste uma das oito alças. Logo
preserva a proporção; a borda oposta fica parada.

**Conectar nós**: passe o ponteiro sobre um nó e arraste de um dos pontos de conexão
até outro nó. A aresta acompanha quando você move os nós, e duas ligações entre o
mesmo par aparecem como duas.

**Desfazer e refazer** com `Ctrl/Cmd+Z` e `Ctrl/Cmd+Shift+Z`. Uma interação é uma
entrada: arrastar cinco nós desfaz de uma vez. Desfazer uma deleção devolve os nós,
os logos e a seleção.

Próximo passo: estilo por elemento. A fila está em [docs/roadmap.md](docs/roadmap.md).

## Onde ler

| Arquivo | Assunto |
|---|---|
| [AI_GUIDE.md](AI_GUIDE.md) | Processo: pipeline, regras, como trabalhar aqui |
| [docs/overview.md](docs/overview.md) | O produto e o que ele não é |
| [docs/architecture.md](docs/architecture.md) | Camadas, DDD, renderer, assets |
| [docs/specs/index.md](docs/specs/index.md) | Todas as specs |
