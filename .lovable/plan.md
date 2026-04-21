

## Persistir asset ativo no Quick Preview

Hoje `/dam/preview` reseta `activeIndex` para 0 sempre que filtros mudam ou a página recarrega. Vou persistir o asset ativo via **id** (não índice — índice fica inválido se filtros mudarem) e usar querystring + localStorage para sobreviver a reload e navegação.

### Comportamento

- Ao navegar com ←/→ ou clicar num thumb, atualizar `?asset=<id>` na URL (replace, sem empilhar histórico)
- Ao recarregar `/dam/preview?asset=<id>&...filtros`, restaurar `activeIndex` procurando o id na lista carregada
- Se o id não estiver na lista atual (filtro mudou, asset arquivado), cair pro índice 0 silenciosamente
- Ao clicar "Pré-visualizar" na biblioteca, se houver último asset visto salvo no localStorage **e** ele estiver compatível com os filtros sendo passados, abrir já nele
- Ao voltar pra `/dam` via Esc ou botão, persistir o último id no localStorage (`dam-last-preview-asset`) para recuperação futura

### Detalhes técnicos

- **Querystring**: nova chave `asset` adicionada ao `useDamFilters` (ou tratada à parte em `DamPreviewPage` via `useSearchParams` direto, já que não é filtro). Prefiro tratar à parte para não poluir o hook de filtros.
- **Sync índice ↔ id**: `useEffect` que, quando `assets` carrega, procura `assets.findIndex(a => a.id === assetIdParam)` e atualiza `activeIndex`. Quando `activeIndex` muda por interação, escreve `?asset=<assets[i].id>` via `setSearchParams(..., { replace: true })`.
- **localStorage**: `dam-last-preview-asset` guarda `{ id, ts }`. Expira em 24h pra não ressuscitar contexto antigo demais.
- **Reset comportamental**: o reset atual de `activeIndex=0` quando filtros mudam permanece, **exceto** se o id atual ainda existir na nova lista (preserva contexto quando o usuário só refina filtros).
- **Botão Voltar**: link `/dam${queryString}` continua igual; o id fica no localStorage, não na URL da biblioteca (URL da Library permanece limpa).

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/features/dam/pages/DamPreviewPage.tsx` | Editar — ler/gravar `?asset=<id>`, restaurar índice por id, persistir em localStorage |
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — botão "Pré-visualizar" lê localStorage e injeta `?asset=<id>` se válido |

### Critérios de aceite

- Navegar com ←/→ atualiza `?asset=<id>` na URL sem reload
- Recarregar a página em `/dam/preview?asset=X` mantém o asset X selecionado
- Mudar um filtro mantém o asset atual selecionado se ele continuar visível; senão, vai pro primeiro
- Clicar "Pré-visualizar" na biblioteca abre no último asset visto (se ainda existir e <24h)
- Esc/Voltar à biblioteca preserva o id no localStorage
- Sem regressão nos atalhos de teclado nem na navegação por thumb

