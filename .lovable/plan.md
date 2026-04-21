

## Sincronizar asset ativo com `?asset=` em navegação back/forward

Hoje `DamPreviewPage` lê `?asset=` apenas no mount/quando `assets` muda, e escreve via `setSearchParams({ replace: true })` quando `activeIndex` muda. Isso quebra a navegação back/forward do navegador: ao voltar, a URL muda mas o `activeIndex` não reage porque o efeito de leitura depende de `assets` (referência), não de `assetIdParam`.

### Mudanças

**Editar: `src/features/dam/pages/DamPreviewPage.tsx`**

1. **Reagir a mudanças de `?asset=` (back/forward)**
   - Trocar o efeito de restauração para depender de `assetIdParam` explicitamente:
     ```ts
     useEffect(() => {
       if (assets.length === 0) return;
       if (!assetIdParam) return;
       const idx = assets.findIndex((a) => a.id === assetIdParam);
       if (idx >= 0 && idx !== activeIndex) setActiveIndex(idx);
     }, [assetIdParam, assets, activeIndex]);
     ```
   - Manter um efeito separado para o caso "sem `?asset=` e lista carregada" → cair no índice 0 só na primeira carga (guarda com `useRef` `didInitRef` para não sobrescrever navegação back/forward).

2. **Usar `pushState` em mudanças explícitas de usuário, `replaceState` em sync passivo**
   - Ao navegar via setas/teclado/click no thumb (ações deliberadas) → `setSearchParams(next)` SEM `{ replace: true }` para que back/forward do navegador percorra os assets visitados.
   - Ao apenas restaurar de `?asset=` ou ajustar índice por clamp → continuar com `{ replace: true }` para não poluir histórico.
   - Refatorar `goPrev`/`goNext` e `onSelect` do thumb strip para chamar uma função `selectAssetAt(idx, { pushHistory: true })` que atualiza `activeIndex` e a URL com push.
   - O efeito de "sync URL ← activeAsset" passa a rodar só quando a fonte for state interno (clamp ou init), não em resposta a navegação back/forward.

3. **Indicador visual de sincronização**
   - Adicionar um pequeno chip no header ao lado de "Pré-visualização rápida" mostrando posição: `{activeIndex + 1} / {assets.length}` + ícone `Link2` com tooltip "Sincronizado com URL".
   - Quando `assetIdParam` existe mas não está na lista atual (filtro mudou e excluiu o asset), mostrar chip de aviso `AlertCircle` com tooltip "Asset fora dos filtros atuais — mostrando primeiro disponível".

4. **Persistência cross-page**
   - O `localStorage` `dam-last-preview-asset` já é atualizado por efeito quando `activeAsset` muda — manter como está. Isso garante que ao sair do `/dam/preview`, ir para outra página e voltar via back, tanto a URL (`?asset=`) quanto o `localStorage` estão consistentes.
   - Adicionar listener `popstate` apenas para registrar telemetria leve (opcional) — não necessário para o fluxo, pois `useSearchParams` já reflete mudanças de history.

### Comportamento

- Navegar com `←/→` ou clicar em thumbnails empilha entradas no histórico do navegador.
- Botão "voltar" do navegador volta para o asset anterior dentro do preview, ou para a página anterior se já estava no primeiro.
- Sair de `/dam/preview?asset=X` → ir para `/catalog` → voltar (back) → restaura `/dam/preview?asset=X` com X como ativo (não cai no índice 0).
- Chip de posição `{n}/{total}` + ícone Link2 sempre visível no header como indicador de sync.
- Se o `?asset=` referenciar id que não está nos resultados (filtro divergente), chip de aviso aparece e o primeiro asset vira ativo.

### Critérios de aceite

- Setas/thumbs criam entradas no histórico; back/forward do navegador navega entre assets visitados.
- Sair do preview e voltar via back restaura o asset correto (não o primeiro).
- Mudar filtros não cria entradas extras no histórico (continua usando `replace`).
- Chip `{n}/{total}` + ícone de link visível no header; chip de aviso quando `?asset=` referencia id ausente.
- Sem regressão em atalhos (`Esc`, `Enter`, `Ctrl+Enter`, `M`, `Espaço`), modo Compare, drawer de detalhes ou filtros.

