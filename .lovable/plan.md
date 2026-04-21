

## Tela de pré-visualização rápida (Quick Preview) — DAM

Adicionar uma rota dedicada `/dam/preview` (ou modal lightbox sobre `/dam`) onde o usuário navega assets em **tela cheia** com filtros laterais aplicados em tempo real, sem precisar abrir o drawer de detalhes para cada um.

### Comportamento

- **Layout split**: filtros à esquerda (sidebar 280px) + área central de preview grande + tira de thumbnails embaixo
- **Navegação por teclado**: ←/→ para próximo/anterior asset, Esc para sair, Enter abre o drawer de detalhes completo
- **Filtros em tempo real**: tipo (multi), tags (AND/OR), cliente, busca, arquivados — mesma lógica do `DamLibraryPage`, debounced
- **Preview grande**: imagem em tela cheia com zoom (click pra ampliar 100% / fit), metadados sobrepostos no canto (nome, tipo, dimensões, tamanho, versão)
- **Tira de thumbnails**: scroll horizontal embaixo, asset ativo destacado, click pula direto pra ele
- **Ações rápidas no overlay**: Download, Copiar URL, Abrir detalhes, Próximo/Anterior — tudo flutuante sobre a imagem
- **Botão "Quick Preview"** no header do `DamLibraryPage` que leva pra rota com filtros atuais preservados via querystring

### Estrutura

```text
/dam/preview?type=logo,art&tags=brand&tagsMode=any&q=capacete
┌──────────────┬──────────────────────────────────────┐
│  FILTROS     │                                      │
│  ──────      │       [imagem grande do asset]       │
│  Busca       │                                      │
│  Tipo (multi)│       ◀  asset 5 de 42  ▶            │
│  Tags AND/OR │                                      │
│  Cliente     │  metadados | download | detalhes     │
│  Arquivados  │                                      │
│  Sort        │                                      │
│              ├──────────────────────────────────────┤
│  [42 assets] │  [tira horizontal de thumbs]         │
└──────────────┴──────────────────────────────────────┘
```

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/dam/pages/DamPreviewPage.tsx` | Criar — página principal com split layout |
| `src/features/dam/components/PreviewSidebar.tsx` | Criar — filtros reutilizáveis (extrai lógica do `DamLibraryPage`) |
| `src/features/dam/components/PreviewStage.tsx` | Criar — área central com imagem grande, zoom, navegação |
| `src/features/dam/components/PreviewThumbStrip.tsx` | Criar — tira horizontal de thumbnails |
| `src/features/dam/hooks/use-dam-filters.ts` | Criar — extrai estado de filtros do `DamLibraryPage` para hook compartilhado (sync com querystring) |
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — botão "Quick Preview" no header + usar `useDamFilters` |
| `src/App.tsx` | Editar — registrar rota `/dam/preview` (lazy) |

### Detalhes técnicos

- **Sync querystring ↔ estado** via `useSearchParams`, para que reload/share mantenha filtros
- **Hook `useDamFilters`** centraliza estado de busca/tipo/tags/cliente/sort/archived com persistência localStorage e sync URL — usado tanto pela Library quanto pela Preview
- **Reaproveita `useAssets`** com `pageSize: 50` (lista mais agressiva pra preview rápido); paginação infinita no thumb strip via "carregar mais"
- **Atalhos teclado**: `useEffect` com `keydown` listener — ←/→/Esc/Enter
- **Zoom**: estado `zoomMode: "fit" | "actual"`, transform CSS `scale()` simples (sem libs)
- **Drawer de detalhes**: reutiliza `AssetDetailDrawer` existente, abre por cima da preview
- **Botão de retorno**: "Voltar à biblioteca" preserva filtros via querystring

### Critérios de aceite

- Rota `/dam/preview` acessível pelo botão "Quick Preview" na biblioteca
- Filtros laterais alteram a lista em tempo real (debounce 300ms na busca)
- Setas ←/→ navegam entre assets sem reload
- Esc volta para `/dam` mantendo filtros
- Enter (ou botão "Detalhes") abre o `AssetDetailDrawer` sobre a preview
- Querystring reflete filtros (URL compartilhável)
- Tira de thumbnails destaca asset ativo e permite click-to-jump
- Zoom toggle (fit ↔ 100%) funciona em imagens grandes
- Sem regressão na biblioteca atual (`/dam`)

