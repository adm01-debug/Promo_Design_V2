

## Busca server-side com trigram e mínimo de 3 caracteres

A busca já vai ao servidor via `ilike` em `name`/`description` (e via RPC `search_assets_ranked` quando o sort é "Relevância"). Faltam três coisas: **(1)** garantir que termos com menos de 3 caracteres não disparem busca (evita full-table scans inúteis); **(2)** usar trigram (`%`) quando o termo tem ≥3 chars para aproveitar o índice GIN existente; **(3)** UX clara avisando o usuário que precisa digitar mais.

### Mudanças

**Migration — índices trigram em `assets`**
- Garantir extensão `pg_trgm` (já está, dado que `similarity()` é usado pelo RPC).
- Criar índices se não existirem:
  - `CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON public.assets USING gin (name gin_trgm_ops);`
  - `CREATE INDEX IF NOT EXISTS idx_assets_description_trgm ON public.assets USING gin (description gin_trgm_ops);`
- Sem alteração de schema, só índices.

**`src/features/dam/hooks/use-assets.ts`**
- Constante `MIN_SEARCH_LENGTH = 3`.
- Em `queryFn`:
  - Computar `effectiveSearch = searchTerm.length >= MIN_SEARCH_LENGTH ? searchTerm : ""`.
  - Se `useRelevance` mas `effectiveSearch` vazio → cair no path padrão (sem RPC).
  - No path padrão, ao invés de `name.ilike.%term%,description.ilike.%term%`, usar o **operador trigram `%`** do PostgREST: `name.wfts.term` não se aplica; usar `or(\`name.ilike.%${term}%,description.ilike.%${term}%\`)` continua válido — o índice `gin_trgm_ops` acelera `ILIKE '%x%'` automaticamente quando a string tem ≥3 chars (regra do pg_trgm). Manter `ilike` é o caminho correto e já se beneficia do índice.
  - Sanitização do termo: remover `%`, `,`, `(`, `)` antes de injetar.
- Exportar `MIN_SEARCH_LENGTH` para uso na UI.

**`src/features/dam/pages/DamLibraryPage.tsx` e `src/features/dam/components/PreviewSidebar.tsx`**
- Importar `MIN_SEARCH_LENGTH`.
- Abaixo do `Input` de busca, mostrar hint `text-xs text-muted-foreground` quando `0 < search.trim().length < 3`: "Digite ao menos 3 caracteres para buscar".
- Chip de busca em `ActiveFiltersBar` só aparece quando o termo ≥3 chars (já que termos curtos não filtram nada).

**`src/features/dam/components/AssetPicker.tsx`**
- Mesmo hint sob o campo de busca.

### Critérios de aceite

- Digitar 1 ou 2 caracteres NÃO dispara nova requisição filtrada — listagem permanece sem filtro de busca; aparece o hint "Digite ao menos 3 caracteres".
- A partir de 3 caracteres, busca é enviada ao servidor (debounce 300ms continua valendo) e usa os índices GIN trigram.
- "Relevância" no dropdown de sort fica desabilitada/oculta enquanto o termo for menor que 3 chars.
- Performance: busca em base com 50k+ assets responde em <300ms (índice trigram + `ilike '%x%'`).
- URL `?q=` ainda é populada pelo termo digitado (para compartilhamento), mas a query só filtra quando ≥3 chars.
- Sem regressão: filtros de tipo, cliente, tags, paginação, sort, retry de upload, auditoria continuam funcionando.

