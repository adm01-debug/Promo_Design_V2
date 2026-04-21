

## Preservar parâmetros externos (ex: `?asset=`) ao sincronizar filtros na URL

Os filtros já são sincronizados na URL (`q`, `type`, `client`, `tags`, `tagsMode`, `archived`, `sort`) por `useDamFilters`. O problema é que o efeito de sync **reconstrói o querystring do zero**, apagando parâmetros que não pertencem aos filtros — em particular o `?asset=<id>` da pré-visualização rápida, que guarda qual asset está selecionado para compartilhamento/recarga.

Resultado prático hoje: copiar a URL `/dam/preview?q=logo&asset=abc123` e recarregar funciona só para os filtros — o `asset=abc123` é apagado no primeiro tick do efeito e a página volta para o índice 0.

### Mudança em `src/features/dam/hooks/use-dam-filters.ts`

Preservar todos os parâmetros que **não são** controlados por `useDamFilters`. Lista de chaves "owned": `q`, `type`, `client`, `tags`, `tagsMode`, `archived`, `sort`.

No efeito de sync (linhas 110-121), em vez de `new URLSearchParams()`, fazer:

```ts
const next = new URLSearchParams(params);
// Limpar apenas as chaves que esse hook controla
["q", "type", "client", "tags", "tagsMode", "archived", "sort"].forEach((k) => next.delete(k));
// Re-aplicar os ativos
if (state.search.trim()) next.set("q", state.search.trim());
// ... resto igual
setParams(next, { replace: true });
```

Aplicar a mesma lógica em `queryString` (linhas ~205-215) para que links "voltar à biblioteca" também preservem `asset` quando relevante (no caso da biblioteca isso é inofensivo — ela ignora `asset`).

### Critérios de aceite

- Em `/dam/preview?q=logo&type=art&asset=abc123`: ao carregar, o asset `abc123` permanece selecionado (não cai para índice 0) e os filtros aparecem aplicados.
- Mudar um filtro (ex: clicar tag) atualiza a URL preservando `asset=<id-atual>` que `DamPreviewPage` mantém em sync.
- Compartilhar a URL com outro usuário/aba abre exatamente a mesma seleção (mesmos filtros + mesmo asset ativo).
- `/dam` (biblioteca) continua funcionando igual; nenhum parâmetro estranho é introduzido.
- Sem regressão nos testes existentes de `useAssets`.

