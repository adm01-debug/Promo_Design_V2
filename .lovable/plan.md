

## Persistir `includeArchived` no localStorage

Os filtros `clientId`, `tags`, `tagsMode`, `search`, `assetTypes` e `sort` já são persistidos no localStorage em `useDamFilters` (chaves `dam-client-id`, `dam-tags`, `dam-tags-mode`, etc.). O único que falta é `includeArchived` — atualmente só vem da URL (`?archived=1`) e some ao recarregar sem querystring.

### Mudança única em `src/features/dam/hooks/use-dam-filters.ts`

1. **Nova chave**: adicionar `const ARCHIVED_KEY = "dam-include-archived";` ao bloco de constantes no topo.

2. **Leitura inicial**: no `useMemo` de `initial`, trocar
   ```ts
   includeArchived: params.get("archived") === "1",
   ```
   por:
   ```ts
   includeArchived: params.get("archived") === "1" || readLS(ARCHIVED_KEY) === "1",
   ```
   (URL continua tendo prioridade; LS é fallback.)

3. **Persistência**: adicionar `useEffect` ao lado dos outros de write:
   ```ts
   useEffect(() => {
     writeLS(ARCHIVED_KEY, state.includeArchived ? "1" : null);
   }, [state.includeArchived]);
   ```

4. **Reset**: dentro de `reset()`, adicionar `writeLS(ARCHIVED_KEY, null);` junto das outras limpezas.

### Critérios de aceite

- Marcar "Incluir arquivados" em `/dam`, recarregar a página (sem querystring): o switch continua marcado e a lista mantém os arquivados visíveis.
- "Limpar filtros" também limpa o estado persistido de arquivados.
- URL continua sendo a fonte autoritativa quando presente (compartilhar link com `?archived=0` implícito — sem o parâmetro — não força o LS; comportamento atual é "URL ou LS, qualquer um marcado ativa", o que é consistente com o resto dos filtros).
- Sem mudanças em `clientId`/`tags`/`tagsMode` (já persistidos).

