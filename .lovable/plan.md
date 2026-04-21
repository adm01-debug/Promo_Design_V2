

## Busca, filtros e paginação otimizados para o DAM

Tornar a busca da biblioteca **server-side** com índices GIN para tags e trigram para nome/descrição, paginação real (cursor/offset) e ordenação configurável.

### Migração de banco

Adicionar extensão e índices em `assets`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tags: busca por contains/overlap em arrays
CREATE INDEX IF NOT EXISTS idx_assets_tags_gin
  ON public.assets USING GIN (tags);

-- Nome e descrição: ILIKE rápido via trigram
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON public.assets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_description_trgm
  ON public.assets USING GIN (description gin_trgm_ops);

-- Filtros frequentes
CREATE INDEX IF NOT EXISTS idx_assets_org_created
  ON public.assets (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_org_client
  ON public.assets (organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_assets_org_type
  ON public.assets (organization_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_archived
  ON public.assets (organization_id, is_archived);
```

### Hook `useAssets` — paginação + ordenação server-side

Estender `AssetFilters`:

```ts
interface AssetFilters {
  clientId?: string | null;
  assetType?: AssetType | "all";
  tags?: string[];
  search?: string;
  includeArchived?: boolean;
  sortBy?: "created_at" | "name" | "file_size" | "version";
  sortDir?: "asc" | "desc";
  page?: number;       // 1-based
  pageSize?: number;   // default 24
}
```

Mudanças no `queryFn`:
- `search` aplica `or("name.ilike.%q%,description.ilike.%q%")` no servidor (trigram)
- `tags` continua usando `.contains("tags", filters.tags)` (índice GIN)
- Adicionar `.range(from, to)` calculado de `page`/`pageSize`
- Usar `.select("*", { count: "exact" })` para devolver total
- Aplicar `.order(sortBy, { ascending: sortDir === "asc" })`

Retorno do hook:
```ts
{ assets, total, page, pageSize, totalPages, isLoading, ...mutations }
```

### `DamLibraryPage` — UI de busca/sort/paginação

- **Busca debounced** (300ms) usando `useDeferredValue` ou um `useDebounce` simples antes de mandar pro filtro
- **Sort dropdown** ao lado dos filtros: "Mais recentes", "Mais antigos", "Nome A→Z", "Nome Z→A", "Maior arquivo", "Versão"
- **Paginação** ao final usando o componente `pagination.tsx` já existente (Previous, números 1..N com ellipsis, Next)
- Reset automático para página 1 quando qualquer filtro/busca/sort muda
- Contador "Mostrando 1–24 de 137 assets"
- Persistir `pageSize` em `localStorage["dam-page-size"]` (24/48/96)

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<ts>_assets_search_indexes.sql` | Criar — extensão pg_trgm + índices GIN/btree |
| `src/features/dam/hooks/use-assets.ts` | Editar — paginação, sort, busca server-side, count |
| `src/features/dam/pages/DamLibraryPage.tsx` | Editar — debounce, sort dropdown, pagination, page-size |
| `src/hooks/use-debounce.ts` | Criar (se não existir) — `useDebounce(value, ms)` |

### Detalhes técnicos

- **Compatibilidade**: `useAssetVersions` e `AssetUploadDialog` continuam usando `useAssets(orgId, {})` sem paginação → manter `pageSize` opcional (default sem paginar quando ausente)
- **Tag suggestions**: hoje derivadas de `assets[]`; para preservar UX após paginar, fazer query separada `.select("tags").eq("organization_id", orgId)` agregada client-side, ou aceitar limitação na página atual (decidir: fazer query leve agregada)
- **Performance**: trigram exige no mínimo 3 chars; busca <3 cai para LIKE simples
- **Realtime**: invalidação por `["assets", orgId]` (raiz) já cobre todas variantes paginadas
- **A11y**: pagination com `aria-current="page"` (já vem do componente)

### Critérios de aceite

- Busca por nome/descrição executa no servidor com trigram (verificável no Network tab)
- Filtro de tags usa índice GIN (`EXPLAIN` mostra `Bitmap Index Scan on idx_assets_tags_gin`)
- Paginação navega sem perder filtros/busca/sort
- Mudar filtro reseta para página 1
- Sort persiste por sessão (mesma página)
- Performance: lista com 1000+ assets carrega <500ms na primeira página

